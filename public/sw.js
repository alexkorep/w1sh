const CACHE_NAME = 'w1sh-cache-v1';
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, '');
const URLS_TO_CACHE = [BASE_PATH];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
