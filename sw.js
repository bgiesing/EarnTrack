const CACHE_NAME = 'earntrack-cache-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Google+Sans+Code:wght@300..800&family=Google+Sans+Flex:wght@300..900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

const DYNAMIC_CACHE_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com'
];

// Install Service Worker and cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets with cache-busting');
      // Using map with individual cache attempts so that if one external URL fails, 
      // the entire service worker installation is not blocked.
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => {
          // Force network fetch to bypass browser HTTP cache on install/update
          const request = new Request(asset, { cache: 'reload' });
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                return cache.put(asset, response);
              }
              throw new Error(`Response status: ${response.status}`);
            })
            .catch((err) => {
              console.warn(`[Service Worker] Reload-fetch failed for: ${asset}, falling back to default add`, err);
              // Fallback to standard cache.add if new Request with reload cache fails for any reason (e.g. older browser or CORS restriction)
              return cache.add(asset).catch((err2) => {
                console.error(`[Service Worker] Failed to cache asset: ${asset}`, err2);
              });
            });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch interceptor with Cache-First strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // If successful response and matches target dynamic cache domains or is same origin, cache it on-the-fly
        const isEligibleDomain = DYNAMIC_CACHE_DOMAINS.some(domain => url.hostname.includes(domain));
        if (response.status === 200 && (isEligibleDomain || url.origin === location.origin)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch((err) => {
        console.error('[Service Worker] Fetch failed for:', event.request.url, err);
        // If it's a navigation request and we are completely offline/failed, fallback to cached index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('/');
        }
      });
    })
  );
});
