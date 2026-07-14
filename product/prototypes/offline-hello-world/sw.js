// Bump this string whenever you change cached files
// (so old caches get cleaned up correctly)
const CACHE_NAME = 'hello-offline-v3';

const ASSETS = [
  './',           // works when served from this folder root
  './index.html',
  './style.css',
  './app.js'
];

// INSTALL: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// ACTIVATE: remove any old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // take control of open pages
});

// FETCH: cache-first, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request)
    )
  );
});
