import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { MessageChannel } from 'node:worker_threads';
import { webcrypto } from 'node:crypto';
import { createPwaUpdates, createBootRecoveryGuard } from '../pwa-updates.js';

async function worker(scope = 'https://example.test/demo/', options = {}) {
  const handlers = {}, network = [], opened = [], deleted = [], precached = [];
  const stores = options.stores || new Map();
  const server = { online: true, overrides: new Map() };
  let skipped = 0;
  const key = request => typeof request === 'string' ? request : request.url;
  async function fetchResource(request) {
    const url = key(request);
    network.push(url);
    if (!server.online) throw new TypeError('Server stopped');
    const replacement = server.overrides.get(url);
    if (replacement) return replacement.clone();
    const name = url.slice(scope.length).split('?')[0] || 'index.html';
    const bytes = options.runtime ? await readFile(new URL('../' + name, import.meta.url)) : (options.release || 'Installed snapshot bytes: ') + (url === scope ? scope + 'index.html' : url);
    return new Response(bytes, { headers: { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : 'text/html' } });
  }
  const self = {
    registration: { scope }, location: { origin: new URL(scope).origin, href: new URL(options.script || 'sw.js', scope).href },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    clients: { claim: async () => {}, matchAll: async () => typeof options.clients === 'function' ? options.clients() : options.clients || [] },
    skipWaiting: async () => { skipped++; }
  };
  const cacheStorage = {
    open: async name => {
      opened.push(name);
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        addAll: async requests => {
          precached.push(...requests);
          const responses = await Promise.all(requests.map(fetchResource));
          if (responses.some(response => !response.ok)) throw new TypeError('Incomplete install');
          requests.forEach((request, index) => entries.set(key(request), responses[index].clone()));
        },
        match: async request => entries.get(key(request))?.clone(),
        put: async (request, response) => { entries.set(key(request), response.clone()); }
      };
    },
    keys: async () => [...stores.keys()],
    delete: async name => { deleted.push(name); return stores.delete(name); }
  };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), {
    self, URL, Request, Response, Set, Map, Promise, Uint8Array, crypto: webcrypto,
    AbortController, MessageChannel, setTimeout, clearTimeout, caches: cacheStorage, fetch: fetchResource
  });
  const app = {
    scope, server, stores, network, opened, deleted, precached,
    get skipped() { return skipped; },
    get entries() { return stores.get(opened[0]); },
    async message(data, source = { url: scope }) {
      let pending, reply;
      handlers.message({ data, source, ports: [{ postMessage: value => { reply = value; } }], waitUntil: promise => { pending = promise; } });
      await pending;
      return reply;
    },
    async lifecycle(name) {
      let pending;
      handlers[name]({ waitUntil: promise => { pending = promise; } });
      await pending;
    },
    fetch(url, mode = 'navigate', method = 'GET') {
      let response;
      handlers.fetch({ request: { url, mode, method }, respondWith: promise => { response = promise; } });
      return response;
    }
  };
  if (options.install !== false) await app.lifecycle('install');
  network.length = 0;
  return app;
}

test('cached navigation supports repository hash routes without a live server', async () => {
  const app = await worker();
  app.server.online = false;
  for (const url of [app.scope, app.scope + 'index.html#edit/LOCAL-example']) {
    assert.equal(await (await app.fetch(url)).text(), 'Installed snapshot bytes: ' + app.scope + 'index.html');
  }
  assert.equal(app.network.length, 0);
});
test('install refreshes HTTP-cached assets and establishes scoped SHA256 authority', async () => {
  const app = await worker('https://example.test/PWA-Enterprise-Project/');
  for (const request of app.precached) {
    assert.equal(request.cache, 'reload');
    assert.ok(request.url.startsWith(app.scope));
    assert.equal(request.method, 'GET');
  }
  const manifest = await app.entries.get(app.scope + '.offline-integrity').clone().json();
  assert.equal(manifest.scope, app.scope);
  const url = app.scope + 'demo-images.js';
  const expected = Buffer.from(await webcrypto.subtle.digest('SHA-256', await app.entries.get(url).clone().arrayBuffer())).toString('hex');
  assert.equal(manifest.entries[url], expected);
  assert.equal((await app.message({ type: 'GET_VERSION' })).offlineReady, true);
});
test('missing runtime and HTML entries heal only with installed bytes, then work with server stopped', async () => {
  const app = await worker();
  for (const [name, mode] of [['demo-images.js', 'cors'], ['app.js', 'cors'], ['bootstrap.js', 'cors'], ['index.html', 'navigate']]) {
    const url = app.scope + name;
    app.entries.delete(url);
    assert.equal((await app.message({ type: 'GET_VERSION' })).cacheState, 'repairable');
    const response = await app.fetch(url, mode);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'Installed snapshot bytes: ' + url);
    assert.ok(app.entries.has(url));
  }
  app.server.online = false;
  for (const url of app.precached.map(request => request.url)) {
    assert.equal((await app.fetch(url, url.endsWith('.js') ? 'cors' : 'navigate')).status, 200);
  }
  assert.equal((await app.message({ type: 'GET_VERSION' })).offlineReady, true);
});
test('concurrent missing-resource consumers each receive a readable verified response body', async () => {
  const app = await worker();
  const url = app.scope + 'demo-images.js';
  const expected = await app.entries.get(url).clone().text();
  app.entries.delete(url);
  const responses = await Promise.all([app.fetch(url, 'cors'), app.fetch(url, 'cors')]);
  assert.deepEqual(await Promise.all(responses.map(response => response.text())), [expected, expected]);
  app.server.online = false;
  assert.equal(await (await app.fetch(url, 'cors')).text(), expected);
});
test('bounded full repair restores every missing entry and confirms the whole snapshot', async () => {
  const app = await worker();
  const missing = ['demo-images.js', 'certificate-domain.js', 'index.html', 'pwa-updates.js', 'app.css'];
  missing.forEach(name => app.entries.delete(app.scope + name));
  const result = await app.message({ type: 'REPAIR_SHELL' });
  assert.equal(result.ok, true);
  assert.equal(result.offlineReady, true);
  app.server.online = false;
  for (const name of missing) assert.equal((await app.fetch(app.scope + name, name.endsWith('.js') ? 'cors' : 'navigate')).status, 200);
});
test('a repaired missing app dependency leaves the real boot module graph available offline', async () => {
  const app = await worker(undefined, { runtime: true });
  app.entries.delete(app.scope + 'demo-images.js');
  assert.equal((await app.fetch(app.scope + 'demo-images.js', 'cors')).status, 200);
  app.server.online = false;
  const visited = new Set();
  async function loadModule(url) {
    if (visited.has(url)) return;
    visited.add(url);
    const response = await app.fetch(url, 'cors');
    assert.ok(response, 'Installed shell must intercept ' + url);
    assert.equal(response.status, 200, 'Module must remain usable with the server stopped: ' + url);
    const source = await response.text();
    const imports = source.matchAll(/(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g);
    for (const match of imports) {
      const path = match[1] || match[2];
      // Network-only recovery policy is not part of normal successful boot.
      if (path.startsWith('./') && !path.includes('?')) await loadModule(new URL(path, url).href);
    }
  }
  await loadModule(app.scope + 'bootstrap.js');
  assert.ok(visited.has(app.scope + 'app.js'));
  assert.ok(visited.has(app.scope + 'demo-images.js'));
  const html = await (await app.fetch(app.scope)).text();
  assert.match(html, /src="\.\/bootstrap\.js"/);
});
test('changed deployment bytes are rejected and never mixed into the installed cache', async () => {
  const app = await worker();
  const url = app.scope + 'demo-images.js';
  const original = await app.entries.get(app.scope + 'app.js').clone().text();
  app.entries.delete(url);
  app.server.overrides.set(url, new Response('Different release bytes'));
  assert.equal((await app.fetch(url, 'cors')).status, 503);
  assert.equal(app.entries.has(url), false);
  const repair = await app.message({ type: 'REPAIR_SHELL' });
  assert.equal(repair.ok, false);
  assert.equal(repair.cacheState, 'mismatch');
  assert.equal(repair.offlineReady, false);
  assert.equal(await app.entries.get(app.scope + 'app.js').clone().text(), original);
  app.server.overrides.delete(url);
  assert.equal((await app.message({ type: 'REPAIR_SHELL' })).ok, true);
});
test('absent or foreign integrity metadata cannot authorize network repair', async () => {
  for (const foreign of [false, true]) {
    const app = await worker();
    const manifestUrl = app.scope + '.offline-integrity';
    if (foreign) {
      const manifest = await app.entries.get(manifestUrl).clone().json();
      manifest.scope = 'https://example.test/another/';
      app.entries.set(manifestUrl, new Response(JSON.stringify(manifest)));
    } else app.entries.delete(manifestUrl);
    const url = app.scope + 'app.js';
    app.entries.delete(url);
    assert.equal((await app.fetch(url, 'cors')).status, 503);
    const result = await app.message({ type: 'REPAIR_SHELL' });
    assert.equal(result.ok, false);
    assert.equal(result.cacheState, 'unverified');
    assert.equal(app.network.length, 0);
    assert.equal(app.entries.has(url), false);
    assert.equal((await app.message({ type: 'APPLY_UPDATE' })).ok, false);
    assert.equal(app.skipped, 0);
    app.entries.delete(app.scope + 'index.html');
    const page = await app.fetch(app.scope + 'index.html');
    assert.match(page.headers.get('content-type'), /text\/html/);
    const markup = await page.text();
    assert.match(markup, /src="\.\/bootstrap\.js\?recovery=1"/);
    assert.match(markup, /href="\.\/\?recovery=1"/);
  }
});
test('a failed server repair reports incomplete state and retains all surviving entries', async () => {
  const app = await worker();
  app.entries.delete(app.scope + 'app.js');
  const count = app.entries.size;
  app.server.online = false;
  const result = await app.message({ type: 'REPAIR_SHELL' });
  assert.equal(result.ok, false);
  assert.equal(result.offlineReady, false);
  assert.equal(app.entries.size, count);
  assert.match(result.error, /Server stopped/);
});
test('complete reinstall stages separately and activation deletes only the same deployment old cache', async () => {
  const scope = 'https://example.test/PWA-Enterprise-Project/';
  const stores = new Map([['another-app-cache', new Map()], ['constructclaim-demo:https://example.test/:0.4.0', new Map()]]);
  const active = await worker(scope, { stores });
  const oldEntries = active.entries;
  const recovery = await worker(scope, { stores, script: 'sw.js?recovery=123', release: 'New complete snapshot bytes: ' });
  assert.notEqual(active.opened[0], recovery.opened[0]);
  assert.equal(stores.get(active.opened[0]), oldEntries);
  assert.equal(await oldEntries.get(scope + 'app.js').clone().text(), 'Installed snapshot bytes: ' + scope + 'app.js');
  assert.equal((await recovery.message({ type: 'GET_VERSION' })).offlineReady, true);
  await recovery.lifecycle('activate');
  assert.deepEqual(recovery.deleted, [active.opened[0]]);
  assert.ok(stores.has('another-app-cache'));
  assert.ok(stores.has('constructclaim-demo:https://example.test/:0.4.0'));
  recovery.server.online = false;
  assert.equal(await (await recovery.fetch(scope)).text(), 'New complete snapshot bytes: ' + scope + 'index.html');
});
test('worker does not intercept foreign, unknown, private-query or mutating requests', async () => {
  const app = await worker();
  for (const url of ['https://example.test/api/claims', 'https://other.test/demo/', app.scope + '?private=1', app.scope + 'bootstrap.js?recovery=1']) assert.equal(app.fetch(url), undefined);
  assert.equal(app.fetch(app.scope, 'navigate', 'POST'), undefined);
  assert.equal((await app.fetch(app.scope + '?recovery=1')).status, 503);
  assert.equal(await app.message({ type: 'REPAIR_SHELL' }, { url: 'https://example.test/another/' }), undefined);
});

function client(id, ready = true, url = 'https://example.test/demo/#home') {
  const messages = [];
  return { id, url, messages, postMessage(message, ports) {
    messages.push(message);
    if (message.type === 'PREPARE_UPDATE' && ready !== null) { ports[0].postMessage({ ready }); ports[0].close(); }
  } };
}
test('automatic activation requires all scoped pages and ignores other projects', async () => {
  const first = client('a'), second = client('b'), unrelated = client('other', false, 'https://example.test/another/');
  const app = await worker(undefined, { clients: [first, second, unrelated] });
  assert.equal((await app.message({ type: 'APPLY_UPDATE' })).ok, true);
  assert.equal(app.skipped, 1);
  assert.equal(first.messages[0].type, 'PREPARE_UPDATE');
  assert.equal(second.messages[0].type, 'PREPARE_UPDATE');
  assert.equal(unrelated.messages.length, 0);
});
test('complete recovery cannot override a dirty page or use legacy skipWaiting', async () => {
  const ready = client('a'), dirty = client('b', false);
  const app = await worker(undefined, { clients: [ready, dirty], script: 'sw.js?recovery=456' });
  assert.equal((await app.message({ type: 'APPLY_UPDATE' })).ok, false);
  await app.message({ type: 'SKIP_WAITING' });
  assert.equal(app.skipped, 0);
  assert.equal(ready.messages.at(-1).type, 'CANCEL_UPDATE');
  assert.equal(ready.messages[0].attempt, ready.messages.at(-1).attempt);
});
test('a tab opened during readiness prevents switching until it participates', async () => {
  const first = client('a'), newcomer = client('b');
  let reads = 0;
  const app = await worker(undefined, { clients: () => ++reads === 1 ? [first] : [first, newcomer] });
  assert.equal((await app.message({ type: 'APPLY_UPDATE' })).ok, false);
  assert.equal(app.skipped, 0);
  assert.equal(first.messages.at(-1).type, 'CANCEL_UPDATE');
});
test('a suspended page that cannot respond blocks activation', async () => {
  const app = await worker(undefined, { clients: [client('old', null)] });
  assert.equal((await app.message({ type: 'APPLY_UPDATE' })).ok, false);
  assert.equal(app.skipped, 0);
});

async function updatePage(options = {}) {
  const otherTab = client('other', false);
  const engine = await worker(undefined, { clients: [otherTab], script: 'sw.js?recovery=123' });
  if (options.incomplete) {
    engine.entries.delete(engine.scope + 'app.js');
    if (!options.matchingRepair) engine.server.overrides.set(engine.scope + 'app.js', new Response('Different release bytes'));
  }
  const handlers = {}, elements = new Map();
  let busy = false, reloads = 0, waitingEngine, partialForm = Boolean(options.form), taskMode = Boolean(options.taskMode);
  const input = { value: 'Unfinished local claim input' };
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { hidden: true, textContent: '', dataset: { pwa: selector }, inert: false });
    return elements.get(selector);
  };
  const bridge = (target, scriptURL) => ({
    scriptURL,
    postMessage(message, ports) {
      target.message(message).then(value => { ports[0].postMessage(value); ports[0].close(); });
    }
  });
  const workerBridge = bridge(engine, 'https://example.test/demo/sw.js?recovery=123');
  const registration = { scope: engine.scope, active: workerBridge, waiting: null, installing: null, addEventListener(type, callback) { handlers['registration:' + type] = callback; }, async update() { if (options.failCheck) throw new Error('Network unavailable'); } };
  const serviceWorker = {
    controller: workerBridge,
    addEventListener(type, callback) { handlers['worker:' + type] = callback; },
    async getRegistration() { return registration; },
    async register(url) {
      const script = new URL(url, engine.scope);
      const newest = registration.installing || registration.waiting || registration.active;
      if (script.href !== newest?.scriptURL) {
        waitingEngine = await worker(engine.scope, { stores: engine.stores, clients: [otherTab], script: 'sw.js' + script.search, release: 'New complete snapshot bytes: ' });
        registration.waiting = bridge(waitingEngine, script.href);
      }
      return registration;
    }
  };
  const document = {
    hidden: false, activeElement: null,
    body: { classList: { contains: name => name === 'task-mode' && taskMode } },
    querySelector(selector) { return selector === '#main form' ? partialForm ? input : null : element(selector); },
    querySelectorAll(selector) {
      if (selector === '[data-pwa]') return ['title', 'detail', 'offline', 'checked'].map(element);
      if (selector === '.app-shell, .mobile-nav, #scroll-top') return [element('shell')];
      if (['[data-pwa-repair]', '[data-pwa-recover]', '[data-pwa-check]'].includes(selector)) return [element(selector)];
      return [];
    },
    addEventListener(type, callback) { handlers['document:' + type] = callback; }
  };
  const window = { location: { href: 'https://example.test/demo/', protocol: 'https:', reload() { reloads++; }, replace() { reloads++; } }, matchMedia: () => ({ matches: false }), setInterval() {}, addEventListener(type, callback) { handlers['window:' + type] = callback; } };
  const navigator = { serviceWorker, onLine: true };
  if (options.existingWaiting) await serviceWorker.register('./sw.js?recovery=456');
  const behavior = options.partialBoot ? createBootRecoveryGuard({ document, window }) : { isBusy: () => busy };
  const api = createPwaUpdates({ ...behavior, document, navigator, window });
  return { api, handlers, elements, engine, otherTab, input, registration, worker: workerBridge, serviceWorker, get waitingEngine() { return waitingEngine; }, set partialForm(value) { partialForm = value; }, set taskMode(value) { taskMode = value; }, set busy(value) { busy = value; }, get reloads() { return reloads; }, click(selector) { if (!element(selector).disabled) handlers['document:click']({ target: { closest: candidate => candidate === selector } }); } };
}
async function settle(page) {
  const deadline = Date.now() + 5000;
  while (page.elements.get('[data-pwa-check]')?.disabled) {
    assert.ok(Date.now() < deadline, 'The app status operation must finish');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}
test('failed update checks do not claim a successful checked time', async () => {
  const page = await updatePage({ failCheck: true });
  await page.api.start();
  await settle(page);
  assert.equal(page.elements.get('checked').textContent, '');
});
test('startup retains an isolated pending release without replacing active cache bytes', async () => {
  const page = await updatePage({ existingWaiting: true });
  const original = await page.engine.entries.get(page.engine.scope + 'app.js').clone().text();
  await page.api.start();
  page.api.reconsider();
  await settle(page);
  assert.equal(await page.engine.entries.get(page.engine.scope + 'app.js').clone().text(), original);
  assert.equal(page.waitingEngine.skipped, 0);
  assert.equal(page.otherTab.messages.at(-1).type, 'CANCEL_UPDATE');
  assert.equal((await page.waitingEngine.message({ type: 'GET_VERSION' })).offlineReady, true);
});
test('repair consumers retain failure and complete recovery uses the same readiness protocol', async () => {
  const page = await updatePage({ incomplete: true });
  await page.api.start();
  await settle(page);
  page.click('[data-pwa-repair]');
  await settle(page);
  assert.equal(page.engine.entries.has(page.engine.scope + 'app.js'), false);
  assert.equal((await page.engine.message({ type: 'GET_VERSION' })).cacheState, 'mismatch');
  assert.equal(page.elements.get('[data-pwa-repair]').disabled, false);
  page.click('[data-pwa-recover]');
  await settle(page);
  assert.equal(page.waitingEngine.skipped, 0);
  assert.equal(page.otherTab.messages.at(-1).type, 'CANCEL_UPDATE');
  let response;
  page.busy = true;
  page.handlers['worker:message']({ source: page.registration.waiting, data: { type: 'PREPARE_UPDATE', attempt: 'recovery' }, ports: [{ postMessage(value) { response = value; } }] });
  assert.equal(response.ready, false);
  page.serviceWorker.controller = page.registration.waiting;
  await page.handlers['worker:controllerchange']();
  assert.equal(page.reloads, 0);
  page.busy = false;
  page.api.reconsider();
  assert.equal(page.reloads, 1);
});

test('partial-boot recovery preserves forms and task mode through successful repair and activation', async () => {
  for (const partial of [{ form: true }, { taskMode: true }]) {
    const page = await updatePage({ partialBoot: true, incomplete: true, matchingRepair: true, ...partial });
    await page.api.start();
    await settle(page);
    page.click('[data-pwa-repair]');
    await settle(page);
    assert.equal((await page.engine.message({ type: 'GET_VERSION' })).offlineReady, true);
    assert.equal(page.reloads, 0);
    assert.equal(page.input.value, 'Unfinished local claim input');
    page.click('[data-pwa-recover]');
    await settle(page);
    assert.equal(page.waitingEngine.skipped, 0);
    assert.equal(page.otherTab.messages.length, 0);
    let response;
    page.handlers['worker:message']({ source: page.registration.waiting, data: { type: 'PREPARE_UPDATE', attempt: 'partial-boot' }, ports: [{ postMessage(value) { response = value; } }] });
    assert.equal(response.ready, false);
    page.serviceWorker.controller = page.registration.waiting;
    await page.handlers['worker:controllerchange']();
    assert.equal(page.reloads, 0);
    assert.equal(page.input.value, 'Unfinished local claim input');
    page.partialForm = false;
    page.taskMode = false;
    page.api.reconsider();
    assert.equal(page.reloads, 1);
  }
});
test('fully failed boot without a partial task can reopen after verified matching repair', async () => {
  const page = await updatePage({ partialBoot: true, incomplete: true, matchingRepair: true });
  await page.api.start();
  await settle(page);
  page.click('[data-pwa-repair]');
  await settle(page);
  assert.equal((await page.engine.message({ type: 'GET_VERSION' })).offlineReady, true);
  assert.equal(page.reloads, 1);
});

test('either HTML entry heals its requested cache key from a matching installed counterpart offline', async () => {
  for (const path of ['', 'index.html']) {
    const app = await worker();
    const url = app.scope + path;
    const installed = await app.entries.get(url).clone().text();
    app.entries.delete(url);
    app.server.online = false;
    const response = await app.fetch(url + '#claims');
    assert.equal(response.status, 200);
    assert.equal(await response.text(), installed);
    assert.equal(await app.entries.get(url).clone().text(), installed);
    assert.equal((await app.message({ type: 'GET_VERSION' })).offlineReady, true);
  }
});
test('HTML counterpart repair rejects different bytes and still supports verified online recovery of both keys', async () => {
  for (const path of ['', 'index.html']) {
    const app = await worker();
    const url = app.scope + path;
    const other = path ? app.scope : app.scope + 'index.html';
    const installed = await app.entries.get(url).clone().text();
    app.entries.delete(url);
    app.entries.set(other, new Response('Incompatible cached HTML'));
    app.server.online = false;
    assert.equal((await app.fetch(url)).status, 503);
    assert.equal(app.entries.has(url), false);
    app.server.online = true;
    const response = await app.fetch(url);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), installed);
    assert.equal(await app.entries.get(url).clone().text(), installed);
    assert.equal((await app.message({ type: 'REPAIR_SHELL' })).ok, true);
    app.server.online = false;
    assert.equal(await (await app.fetch(url)).text(), installed);
    assert.equal((await app.message({ type: 'GET_VERSION' })).offlineReady, true);
  }
});
