// Release identity is shared with the UI through GET_VERSION. Bump for every asset change.
const VERSION = '0.6.2';
// Cache Storage is shared by every application on an origin, including Pages projects.
const CACHE_PREFIX = `constructclaim-demo:${self.registration.scope}:`;
// A requested complete reinstall must not overwrite the active release while installing.
const INSTALL_ID = new URL(self.location.href || './sw.js', self.registration.scope).search;
const CACHE_NAME = CACHE_PREFIX + VERSION + INSTALL_ID;
const MANIFEST_URL = new URL('./.offline-integrity', self.registration.scope).href;
const SHELL = [
  './', './index.html', './app.css', './app.js', './storage.js', './ui.js', './demo-domain.js', './draft-editor.js', './demo-contracts.js', './project-pages.js', './record-store.js', './variation-storage.js', './variation-domain.js', './variation-editor.js',
  './demo-claims.js', './certificate-domain.js', './certificate-storage.js', './certificate-editor.js', './certificate-pages.js',
  './evidence-domain.js', './evidence-storage.js', './evidence-editor.js', './evidence-pages.js',
  './settings-page.js', './pwa-updates.js', './bootstrap.js',
  './demo-certificates.js', './sample-evidence.js', './demo-images.js', './demo-practice.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
const URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
// Only a rejected network download proves different server release bytes.
const serverMismatches = new Set();
const repairs = new Map();
let fullRepair = null;

async function digest(response) {
  const bytes = await response.clone().arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function integrity(cache) {
  const stored = await cache.match(MANIFEST_URL);
  if (!stored) return null;
  try {
    const manifest = await stored.json();
    if (manifest.version !== VERSION || manifest.scope !== self.registration.scope || manifest.cache !== CACHE_NAME) return null;
    if (Object.keys(manifest.entries || {}).length !== URLS.size) return null;
    if (![...URLS].every(url => /^[a-f0-9]{64}$/.test(manifest.entries[url] || ''))) return null;
    return manifest;
  } catch { return null; }
}
async function cacheStatus(cache) {
  const manifest = await integrity(cache);
  if (!manifest) return { version: VERSION, offlineReady: false, cacheState: 'unverified', missing: URLS.size };
  let missing = 0, corrupt = 0, serverMismatch = false;
  for (const url of URLS) {
    const response = await cache.match(url);
    if (!response) missing++;
    else if (await digest(response) !== manifest.entries[url]) { missing++; corrupt++; }
    else serverMismatches.delete(url);
    if (serverMismatches.has(url)) serverMismatch = true;
  }
  return { version: VERSION, offlineReady: missing === 0, cacheState: missing === 0 ? 'complete' : serverMismatch ? 'server-mismatch' : corrupt ? 'corrupt' : 'repairable', missing };
}
function repairEntry(cache, manifest, url) {
  if (repairs.has(url)) return repairs.get(url);
  const pending = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(new Request(url, { cache: 'reload', signal: controller.signal }));
      if (!response.ok || response.type === 'opaque') throw new Error('The shell resource could not be downloaded.');
      if (await digest(response) !== manifest.entries[url]) {
        serverMismatches.add(url);
        throw new Error('The downloaded server bytes differ from the installed release. Retry when the installed files are available, or install a complete release.');
      }
      await cache.put(url, response.clone());
      serverMismatches.delete(url);
      return response;
    } finally { clearTimeout(timer); }
  })().finally(() => repairs.delete(url));
  repairs.set(url, pending);
  return pending;
}
async function repairShell() {
  const cache = await caches.open(CACHE_NAME);
  const manifest = await integrity(cache);
  if (!manifest) return { ok: false, ...(await cacheStatus(cache)), error: 'Installed integrity metadata is unavailable. Install a complete release.' };
  const missing = [];
  for (const url of URLS) {
    const response = await cache.match(url);
    if (!response || await digest(response) !== manifest.entries[url]) missing.push(url);
  }
  const errors = [];
  // Bound network work and report partial repairs truthfully; matching entries remain safe.
  for (let offset = 0; offset < missing.length; offset += 4) {
    await Promise.all(missing.slice(offset, offset + 4).map(url => repairEntry(cache, manifest, url).catch(error => errors.push(error.message))));
  }
  const result = await cacheStatus(cache);
  return { ...result, ok: result.offlineReady, error: errors[0] || '' };
}
function recoveryPage() {
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ConstructClaim recovery</title><body><main id="main"><h1>ConstructClaim could not load</h1><p>The installed app is incomplete or the server has a different release. Reconnect to repair or install a complete release. Your device records are kept.</p><div id="boot-recovery"><p data-pwa="detail">Preparing recovery controls…</p><p data-pwa="offline"></p><button type="button" data-pwa-repair>Repair offline app</button><button type="button" data-pwa-recover>Install complete release</button><a href="./?recovery=1">Retry recovery online</a></div></main><div id="update-notice" hidden><span id="update-message"></span></div><div id="update-overlay" hidden role="status">Updating ConstructClaim…</div><script type="module" src="./bootstrap.js?recovery=1"></script></body></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'" } });
}
async function shellResponse(url, navigation) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) return cached;
  try {
    const manifest = await integrity(cache);
    if (!manifest) throw new Error('Installed integrity metadata is unavailable.');
    if (navigation) {
      const root = new URL('./', self.registration.scope).href;
      const index = new URL('./index.html', self.registration.scope).href;
      const counterpart = url === root ? index : url === index ? root : null;
      const html = counterpart && await cache.match(counterpart);
      if (html && await digest(html) === manifest.entries[url]) {
        await cache.put(url, html.clone());
        serverMismatches.delete(url);
        return html;
      }
    }
    return (await repairEntry(cache, manifest, url)).clone();
  } catch (error) {
    if (navigation) return recoveryPage();
    return new Response(error.message, { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Refresh HTTP-cached URLs before establishing authority from the complete snapshot.
    await cache.addAll(SHELL.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' })));
    const entries = {};
    for (const url of URLS) {
      const response = await cache.match(url);
      if (!response?.ok) throw new Error('The installed shell is incomplete.');
      entries[url] = await digest(response);
    }
    await cache.put(MANIFEST_URL, new Response(JSON.stringify({ version: VERSION, scope: self.registration.scope, cache: CACHE_NAME, entries }), { headers: { 'Content-Type': 'application/json' } }));
  })());
});
let updateAttempt = null;
let attemptNumber = 0;
async function scopedClients() {
  return (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .filter(client => client.url.startsWith(self.registration.scope));
}
function prepareClient(client, attempt) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve('readiness-cancelled'); }, 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      resolve(event.data?.ready === true ? 'ready' : event.data?.reason === 'pages-busy' ? 'pages-busy' : 'readiness-cancelled');
    };
    try { client.postMessage({ type: 'PREPARE_UPDATE', attempt }, [channel.port2]); }
    catch { clearTimeout(timer); channel.port1.close(); resolve('readiness-cancelled'); }
  });
}
async function applyUpdate() {
  let info;
  try { info = await cacheStatus(await caches.open(CACHE_NAME)); }
  catch { return { ok: false, reason: 'cache-check-failed' }; }
  if (!info.offlineReady) return { ok: false, reason: 'incomplete-cache', ...info };
  const attempt = VERSION + ':' + ++attemptNumber;
  let clients = [];
  const cancel = () => clients.forEach(client => {
    try { client.postMessage({ type: 'CANCEL_UPDATE', attempt }); } catch {}
  });
  try {
    clients = await scopedClients();
    const ready = await Promise.all(clients.map(client => prepareClient(client, attempt)));
    const current = await scopedClients();
    // Fail closed for old/suspended clients and tabs opened during the readiness check.
    if (ready.some(result => result !== 'ready') || current.some(client => !clients.some(previous => previous.id === client.id))) {
      cancel();
      return { ok: false, reason: ready.includes('pages-busy') ? 'pages-busy' : 'readiness-cancelled' };
    }
  } catch {
    cancel();
    return { ok: false, reason: 'readiness-cancelled' };
  }
  try { await self.skipWaiting(); }
  catch {
    cancel();
    return { ok: false, reason: 'activation-failed' };
  }
  return { ok: true };
}
self.addEventListener('message', event => {
  if (!event.source?.url?.startsWith(self.registration.scope)) return;
  if (event.data?.type === 'GET_VERSION') {
    event.waitUntil(caches.open(CACHE_NAME).then(cacheStatus).then(info => event.ports[0]?.postMessage(info)));
  } else if (event.data?.type === 'REPAIR_SHELL' && event.ports[0]) {
    if (!fullRepair) fullRepair = repairShell().finally(() => { fullRepair = null; });
    event.waitUntil(fullRepair.then(result => event.ports[0].postMessage(result)).catch(error => event.ports[0].postMessage({ ok: false, error: error.message })));
  } else if (event.data?.type === 'APPLY_UPDATE' && event.ports[0]) {
    if (!updateAttempt) updateAttempt = applyUpdate().finally(() => { updateAttempt = null; });
    event.waitUntil(updateAttempt.then(result => event.ports[0].postMessage(result)));
  }
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Hash routes identify client views, never a different shell resource.
  url.hash = '';
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && url.href.startsWith(self.registration.scope) && url.search === '?recovery=1' && (url.pathname === new URL('./', self.registration.scope).pathname || url.pathname === new URL('./index.html', self.registration.scope).pathname)) {
    event.respondWith(Promise.resolve(recoveryPage()));
    return;
  }
  if (!URLS.has(url.href)) return;
  const navigation = event.request.mode === 'navigate';
  event.respondWith(shellResponse(url.href, navigation));
});
