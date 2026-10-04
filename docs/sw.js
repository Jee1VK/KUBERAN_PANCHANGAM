const CACHE_NAME = 'kuberan-panchangam-v29';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/images/kuberan_logo_white_bg.png',
  './assets/images/app_icon.jpg',
  './js/astronomy.js',
  './js/ashtakoota.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network fetch succeeds, cache the fresh response and return it
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => {
        // If network fails (offline), fallback to cache
        return caches.match(event.request);
      })
  );
});
