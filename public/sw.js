// Cache version (placeholder replaced in CI with short commit SHA)
const CACHE_NAME = "w1sh-cache-v1";
// Base path so this keeps working when hosted at a sub-path on GitHub Pages
const BASE_PATH = self.location.pathname.replace(/sw\.js$/, "");

// Static assets safe to cache forever (HTML excluded to avoid serving stale bundles)
const STATIC_ASSETS = [
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}images/w1sh-icon.png`,
];

self.addEventListener("install", (event) => {
  // Ensure the new SW activates immediately after install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Network-first strategy for navigations (HTML): ensures latest index.html with fresh hashed assets.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)) // offline fallback to last cached HTML (if any)
    );
    return;
  }

  // Cache-first for our static asset list (icon, manifest)
  if (STATIC_ASSETS.some((asset) => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Default: just fall through (network). Could extend with runtime caching if needed.
});
