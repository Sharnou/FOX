// ─── XTOX Service Worker v11 ────────────────────────────────────────────────
// Bump this version to force all old caches to be deleted on next activation.
const CACHE_VERSION = 'v12';
const CACHE_NAME = 'xtox-cache-' + CACHE_VERSION;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/offline.html',
];

// ── INSTALL: delete ALL old caches immediately + precache offline page ───────
self.addEventListener('install', (event) => {
  // Skip waiting so this SW activates immediately without waiting for old tabs to close
  self.skipWaiting();
  event.waitUntil(
    // Delete ALL existing caches on install (don't wait for activate).
    // This ensures stale JS chunks are purged the moment the new SW installs.
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() =>
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
    )
  );
});

// ── ACTIVATE: delete any remaining old caches, then claim all clients ────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[XTOX SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Claim all open clients so new SW controls them immediately
      return self.clients.claim();
    })
  );
});

// ── MESSAGE: handle SKIP_WAITING message from registration script ────────────
// When the registration script detects a new waiting SW, it sends this message
// to force the new SW to activate immediately without waiting for tabs to close.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH: selective caching strategy ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. NEVER intercept non-GET requests (POST/PUT/DELETE/PATCH)
  //    Service workers cannot meaningfully cache mutations.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 2. NEVER intercept Railway.app API calls — always go straight to network.
  //    Caching API responses would cause stale data bugs.
  if (url.hostname.includes('railway.app') || url.hostname.includes('up.railway')) return;

  // 3. NEVER intercept cross-origin requests to CDNs we don't own
  //    (jsdelivr, cartocdn, basemaps, etc.) — let the browser handle them.
  if (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com')
  ) return;

  // 4. NEXT.JS JS CHUNKS — NETWORK-FIRST (critical fix for stale cache bug)
  //    Even though chunk filenames are content-hashed, if a cached chunk is
  //    served for a hash that no longer exists on the server, the page breaks.
  //    Network-first ensures the user always gets the latest code.
  if (url.pathname.startsWith('/_next/static/chunks/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh chunk for offline fallback only
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          // Network failed — fall back to cache (better than nothing)
          return caches.match(request);
        })
    );
    return;
  }

  // 5. NEXT.JS CSS — network-first (same reasoning as chunks)
  if (url.pathname.startsWith('/_next/static/css/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 6. TRULY IMMUTABLE STATIC ASSETS — cache-first
  //    These are content-hashed media/font files that never change for a given URL.
  if (
    url.pathname.startsWith('/_next/static/media/') ||
    url.pathname.match(/\/_next\/static\/.*\.(woff2?|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // 7. IMAGES AND OTHER STATIC ASSETS — cache-first with network fallback
  if (
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // 8. HTML NAVIGATION — network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses for offline fallback
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => {
          // Serve offline page when network fails
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // 9. Everything else — network only (no caching)
  //    This includes API calls to our own domain, WebSocket upgrades, etc.
});
