// Bump this identifier with every published demo asset change to offer an explicit update.
const VERSION = 'constructclaim-demo-7';
const SHELL = [
  './', './index.html', './app.css', './app.js', './storage.js',
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
  if (url.origin !== self.location.origin || !URLS.has(url.href)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(Promise.race([
      fetch(event.request).catch(() => null),
      new Promise(resolve => setTimeout(() => resolve(null), 3000))
    ]).then(async response => response || (await caches.match('./index.html')) || Response.error()));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
