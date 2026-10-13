// Release identity is shared with the UI through GET_VERSION. Bump for every asset change.
const VERSION = '0.4.0';
// Cache Storage is shared by every application on an origin, including Pages projects.
const CACHE_PREFIX = `constructclaim-demo:${self.registration.scope}:`;
const CACHE_NAME = CACHE_PREFIX + VERSION;
const SHELL = [
  './', './index.html', './app.css', './app.js', './storage.js', './ui.js', './demo-domain.js', './draft-editor.js', './demo-contracts.js', './project-pages.js', './record-store.js', './variation-storage.js', './variation-domain.js', './variation-editor.js',
  './demo-claims.js', './certificate-domain.js', './certificate-storage.js', './certificate-editor.js', './certificate-pages.js',
  './evidence-domain.js', './evidence-storage.js', './evidence-editor.js', './evidence-pages.js',
  './settings-page.js', './pwa-updates.js',
  './demo-certificates.js', './sample-evidence.js', './demo-images.js', './demo-practice.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
const URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  // Refresh HTTP-cached URLs so a new release cannot precache the previous release's bytes.
  const requests = SHELL.map(path => new Request(new URL(path, self.registration.scope), { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(requests)));
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
    const timer = setTimeout(() => { channel.port1.close(); resolve(false); }, 3000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready === true); };
    try { client.postMessage({ type: 'PREPARE_UPDATE', attempt }, [channel.port2]); }
    catch { clearTimeout(timer); channel.port1.close(); resolve(false); }
  });
}
async function applyUpdate() {
  const attempt = VERSION + ':' + ++attemptNumber;
  const clients = await scopedClients();
  try {
    const ready = await Promise.all(clients.map(client => prepareClient(client, attempt)));
    const current = await scopedClients();
    // Fail closed for old/suspended clients and tabs opened during the readiness check.
    if (!ready.every(Boolean) || current.some(client => !clients.some(previous => previous.id === client.id))) {
      clients.forEach(client => client.postMessage({ type: 'CANCEL_UPDATE', attempt }));
      return { ok: false };
    }
    await self.skipWaiting();
    return { ok: true };
  } catch {
    clients.forEach(client => client.postMessage({ type: 'CANCEL_UPDATE', attempt }));
    return { ok: false };
  }
}
self.addEventListener('message', event => {
  if (event.data?.type === 'GET_VERSION') {
    event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
      const entries = await Promise.all(SHELL.map(path => cache.match(new URL(path, self.registration.scope).href)));
      event.ports[0]?.postMessage({ version: VERSION, offlineReady: entries.every(Boolean) });
    }));
  } else if (event.data?.type === 'APPLY_UPDATE' && event.ports[0]) {
    if (!event.source?.url?.startsWith(self.registration.scope)) return;
    if (!updateAttempt) updateAttempt = applyUpdate().finally(() => { updateAttempt = null; });
    event.waitUntil(updateAttempt.then(result => event.ports[0].postMessage(result)));
  } else if (event.data?.type === 'SKIP_WAITING' && event.source?.url?.startsWith(self.registration.scope)) {
    // Compatibility for v29's explicitly clicked, editor-guarded update action.
    event.waitUntil(self.skipWaiting());
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
  if (url.origin !== self.location.origin || !URLS.has(url.href)) return;
  if (event.request.mode === 'navigate') {
    // This static demo has no private data. A cached shell avoids waiting on a dead network.
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(new URL('./index.html', self.registration.scope).href)).then(cached => cached || fetch(event.request)));
    return;
  }
  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
});
