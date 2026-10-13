// Bump this identifier with every published demo asset change to offer an explicit update.
const VERSION = 'constructclaim-demo-14';
const SHELL = [
  './', './index.html', './app.css', './app.js', './storage.js', './ui.js', './demo-domain.js', './draft-editor.js',
  './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'
];
const URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('constructclaim-demo-') && key !== VERSION).map(key => caches.delete(key)))),
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
    event.respondWith(caches.match('./index.html').then(cached => cached || fetch(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
