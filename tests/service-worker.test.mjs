import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function worker(scope = 'https://example.test/demo/', options = {}) {
  const handlers = {};
  const network = [];
  const opened = [];
  const deleted = [];
  const precached = [];
  const self = {
    registration: { scope }, location: { origin: new URL(scope).origin },
    addEventListener: (name, callback) => { handlers[name] = callback; },
    clients: { claim: async () => {} }
  };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), {
    self, URL, Request, Set, Promise,
    caches: {
      open: async name => {
        opened.push(name);
        return {
          addAll: async requests => { precached.push(...requests); },
          match: async request => {
            const url = typeof request === 'string' ? request : request.url;
            return options.lookup ? options.lookup(name, url) : { cached: url };
          }
        };
      },
      keys: async () => options.keys || [],
      delete: async name => { deleted.push(name); return true; }
    },
    fetch: async request => { network.push(request.url); return { network: request.url }; }
  });
  return {
    network, opened, deleted, precached,
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
}
test('cached shell accepts hash routes under a repository subpath', async () => {
  const app = await worker();
  for (const url of ['https://example.test/demo/', 'https://example.test/demo/index.html#edit/LOCAL-example']) {
    assert.deepEqual(await app.fetch(url), { cached: 'https://example.test/demo/index.html' });
  }
  assert.equal(app.network.length, 0);
});
test('install refreshes HTTP-cached assets within the repository scope', async () => {
  const app = await worker('https://example.test/PWA-Enterprise-Project/');
  await app.lifecycle('install');
  assert.ok(app.precached.length > 0);
  for (const request of app.precached) {
    assert.equal(request.cache, 'reload');
    assert.ok(request.url.startsWith('https://example.test/PWA-Enterprise-Project/'));
    assert.equal(request.method, 'GET');
  }
});
test('cache reads use the installed version rather than another cache on the origin', async () => {
  const entries = new Map([['unrelated-old-shell', { cached: 'stale HTML' }]]);
  const app = await worker('https://example.test/PWA-Enterprise-Project/', {
    lookup: name => entries.get(name)
  });
  await app.lifecycle('install');
  entries.set(app.opened[0], { cached: 'current HTML' });
  assert.deepEqual(await app.fetch('https://example.test/PWA-Enterprise-Project/#home'), { cached: 'current HTML' });
  assert.equal(app.network.length, 0);
});
test('activation removes only previous versions for the same deployment scope', async () => {
  const scope = 'https://example.test/PWA-Enterprise-Project/';
  const old = `constructclaim-demo:${scope}:constructclaim-demo-26`;
  const keys = [old, 'constructclaim-demo-26', 'constructclaim-demo:https://example.test/:constructclaim-demo-26', 'another-app-cache'];
  const app = await worker(scope, { keys });
  await app.lifecycle('install');
  keys.push(app.opened[0]);
  await app.lifecycle('activate');
  assert.deepEqual(app.deleted, [old]);
  const root = await worker('https://example.test/');
  await root.lifecycle('install');
  assert.notEqual(app.opened[0], root.opened[0]);
});
test('a missing shell in the current cache falls back to the network', async () => {
  const app = await worker('https://example.test/demo/', { lookup: () => undefined });
  const url = 'https://example.test/demo/';
  assert.deepEqual(await app.fetch(url), { network: url });
  assert.deepEqual(app.network, [url]);
});
test('new editor modules belong to the static shell allowlist', async () => {
  const app = await worker();
  for (const name of ['demo-domain.js', 'draft-editor.js', 'storage.js', 'demo-contracts.js', 'project-pages.js', 'record-store.js', 'variation-storage.js', 'variation-domain.js', 'variation-editor.js', 'demo-claims.js', 'certificate-domain.js', 'certificate-storage.js', 'certificate-editor.js', 'certificate-pages.js', 'evidence-domain.js', 'evidence-storage.js', 'evidence-editor.js', 'evidence-pages.js']) {
    const url = 'https://example.test/demo/' + name;
    assert.deepEqual(await app.fetch(url, 'cors'), { cached: url });
  }
});
test('worker does not intercept unknown, foreign, query-bearing or mutating requests', async () => {
  const app = await worker();
  for (const url of ['https://example.test/api/claims', 'https://other.test/demo/', 'https://example.test/demo/?private=1']) assert.equal(app.fetch(url), undefined);
  assert.equal(app.fetch('https://example.test/demo/', 'navigate', 'POST'), undefined);
});
