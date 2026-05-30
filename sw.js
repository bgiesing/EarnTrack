const CACHE_NAME = 'earntrack-cache-v1';
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
      console.log('[Service Worker] Caching static assets');
      // Using map with individual cache attempts so that if one external URL fails, 
      // the entire service worker installation is not blocked.
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => 
          cache.add(asset).catch((err) => {
            console.error(`[Service Worker] Failed to cache asset: ${asset}`, err);
          })
        )
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

// Fetch interceptor with hybrid Network-First/Cache-First strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Check if it's the HTML page, manifest, or a root navigation request
  const isHtmlOrManifest = 
    url.pathname.endsWith('index.html') || 
    url.pathname === '/' || 
    url.pathname.endsWith('manifest.json') ||
    (url.origin === location.origin && (url.pathname === '' || url.pathname === '/'));

  if (isHtmlOrManifest) {
    // Network-First strategy to ensure users get the latest version if online, falling back to cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Fetch failed, serving HTML/manifest from cache');
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // If completely offline and not in cache, fallback to main index.html
            return caches.match('./index.html');
          });
        })
    );
  } else {
    // Cache-First strategy for images, icons, fonts, and scripts
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          // If successful response and matches target dynamic cache domains, cache it on-the-fly
          const isEligibleDomain = DYNAMIC_CACHE_DOMAINS.some(domain => url.hostname.includes(domain));
          if (response.status === 200 && (isEligibleDomain || url.origin === location.origin)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch((err) => {
          console.error('[Service Worker] Dynamic fetch failed for:', event.request.url, err);
        });
      })
    );
  }
});
