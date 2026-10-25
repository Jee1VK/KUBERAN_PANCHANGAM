const CACHE_NAME = 'kuberan-panchangam-v56';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css',
  './assets/images/kuberan_logo_white_bg.png',
  './assets/images/app_icon.jpg',
  './js/astronomy.js',
  './js/ashtakoota.js',
  './js/ephemeris.js',
  './js/ayanamsa.js',
  './js/cities.js',
  './js/familyStore.js',
  './js/muhurthaEngine.js',
  './js/exportUtils.js',
  './js/app.js'
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

// FIXED: Stale-while-revalidate with response validation
// - Only cache GET requests with http/https schemes
// - Only cache 200 OK responses to prevent cache poisoning (404/500/captive portals)
// - Serve cached content immediately, then update cache in background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});
