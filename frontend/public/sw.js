// ─── XTOX Background Sync + Cache Strategy ───────────────
// NOTE: CACHE_NAME and API_ORIGIN defined here are used in fetch listeners below.
// The main CACHE_VERSION constant below may differ — both operate independently.
const _XTOX_CACHE = 'xtox-v42';
const _XTOX_API = 'https://xtox-production.up.railway.app';

// Stale-While-Revalidate for API calls (shows cached, fetches fresh)
// Domains whose requests the SW must NEVER intercept.
// Intercepting these causes CSP connect-src violations because the SW's
// fetch() call is subject to the document's CSP, which blocks external origins
// unless explicitly listed. Letting the browser handle them directly avoids
// the error and also prevents caching of resources we don't own.
var _SKIP_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'accounts.google.com',
  'www.bing.com',
  'www.google.com',
  'googletagmanager.com',
  'ipapi.co',
];

self.addEventListener('fetch', function(event) {
  // Avoid handling non-GET requests
  if (event.request.method !== 'GET') return;
  
  var url;
  try { url = new URL(event.request.url); } catch(e) { return; }

  // SKIP external domains — let browser handle them directly to avoid CSP violations.
  // SW fetch() to cross-origin URLs is blocked by connect-src unless explicitly allowed.
  if (_SKIP_DOMAINS.some(function(d) { return url.hostname === d || url.hostname.endsWith('.' + d); })) return;

  // SWR for ads API — already handled above by main SW; this block is a backup
  if (url.origin === _XTOX_API && url.pathname.startsWith('/api/ads')) {
    event.respondWith(
      caches.open(_XTOX_CACHE).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          var fetchPromise = fetch(event.request).then(function(response) {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(function() { return cached; });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Cache-first for static assets — only for same-origin or pre-approved CDNs.
  // External image/style/script requests (Google Fonts, avatars, etc.) are already
  // skipped by the _SKIP_DOMAINS check above, so this block is safe.
  if (event.request.destination === 'image' || 
      event.request.destination === 'style' || 
      event.request.destination === 'script') {
    // Extra guard: only cache same-origin or known CDN assets
    if (url.origin !== self.location.origin &&
        !url.hostname.includes('cloudinary.com') &&
        !url.hostname.includes('jsdelivr.net')) {
      return; // Let browser handle unknown cross-origin assets
    }
    event.respondWith(
      caches.open(_XTOX_CACHE).then(function(cache) {
        return cache.match(event.request).then(function(cached) {
          return cached || fetch(event.request).then(function(r) {
            if (r.ok) cache.put(event.request, r.clone());
            return r;
          }).catch(function() { return cached; });
        });
      })
    );
    return;
  }
});

// Background sync — refresh ads every 15 minutes + presence ping
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'refresh-ads') {
    event.waitUntil(
      fetch(_XTOX_API + '/api/ads?limit=20').then(function(r) {
        if (r.ok) return caches.open(_XTOX_CACHE).then(function(c) {
          return c.put(_XTOX_API + '/api/ads?limit=20', r);
        });
      }).catch(function() {})
    );
  }
  // WhatsApp-like background presence ping — keeps lastSeen fresh even when app is closed
  if (event.tag === 'xtox-presence-ping') {
    event.waitUntil(
      (async () => {
        try {
          const token = await getStoredToken();
          if (!token) return;
          await fetch(_XTOX_API + '/api/push/ping', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + token,
              'Content-Type': 'application/json',
            },
          });
          console.log('[SW v42] Presence ping sent ✓');
        } catch (e) {
          console.log('[SW v42] Presence ping failed:', e.message);
        }
      })()
    );
  }
});

// ── Helper: read stored JWT from IndexedDB (for background sync auth) ────────
function getStoredToken() {
  return new Promise(function(resolve) {
    try {
      var req = indexedDB.open('xtox-auth', 1);
      req.onsuccess = function(e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('tokens')) return resolve(null);
        var tx = db.transaction('tokens', 'readonly');
        var store = tx.objectStore('tokens');
        var get = store.get('jwt');
        get.onsuccess = function() { resolve(get.result || null); };
        get.onerror = function() { resolve(null); };
      };
      req.onerror = function() { resolve(null); };
    } catch (e) { resolve(null); }
  });
}

// ─── IndexedDB call event logger for SW (background push tracking) ──────────
function logCallEventSW(type, data) {
  data = data || {};
  try {
    var req = indexedDB.open('xtox-calls', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = function(e) {
      var db = e.target.result;
      var tx = db.transaction('events', 'readwrite');
      var store = tx.objectStore('events');
      store.add(Object.assign({ type: type, ts: Date.now() }, data));
    };
  } catch (e) { /* non-fatal */ }
}

// ─── XTOX Service Worker v42 ────────────────────────────────────────────────
// Bump this version to force all old caches to be deleted on next activation.
const CACHE_VERSION = 'v42';
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
    Promise.all([
      // Take control of all open pages immediately — no need to wait for reload
      clients.claim(),
      // Delete ALL old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[XTOX SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
    ])
  );
});

// ── MESSAGE: handle SKIP_WAITING message from registration script ────────────
// When the registration script detects a new waiting SW, it sends this message
// to force the new SW to activate immediately without waiting for tabs to close.
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

// ── PUSH: handle incoming push notifications ─────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  // Fix 7A: track push receipt in IDB for analytics
  logCallEventSW('push_received', { type: data.type || 'unknown' });

  if (data.type === 'incoming_call') {
    // Fix E: log incoming push call to IndexedDB for background tracking
    logCallEventSW('push_incoming', { callerId: data.callerId || '', callerName: data.callerName || '' });

    const notifData = {
      type: 'incoming_call',
      callerId: data.callerId || '',
      callerName: data.callerName || 'مستخدم XTOX',
      callerAvatar: data.callerAvatar || '',
      callerSocketId: data.callerSocketId || '',
      offer: JSON.stringify(data.offer || null),
      roomId: data.roomId || '',
      url: '/',
    };

    // Fix 7B: Professional WhatsApp-style notification
    const notifOptions = {
      body: `${data.callerName || 'مستخدم XTOX'} يتصل بك الآن...`,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      image: data.callerAvatar || undefined,
      tag: 'incoming-call-' + (data.callerId || data.roomId || 'call'), // Fix 7C: dedup tag
      renotify: true,                                                     // re-vibrate even if same tag
      requireInteraction: true,                                           // stays until user acts
      silent: false,
      vibrate: [400, 200, 400, 200, 400, 600, 400, 200, 400],           // Fix 7B: 9-pulse WhatsApp pattern
      timestamp: Date.now(),
      data: notifData,
      actions: [
        { action: 'answer',  title: '📞 رد',  icon: '/favicon.svg' },
        { action: 'decline', title: '❌ رفض', icon: '/favicon.svg' },
      ],
    };

    event.waitUntil(
      (async () => {
        // Fix 7C: close any existing notification for this caller before showing new one
        try {
          const existing = await self.registration.getNotifications({ tag: 'incoming-call-' + (data.callerId || data.roomId || 'call') });
          existing.forEach(n => n.close());
        } catch {}
        await self.registration.showNotification(data.title || '📞 مكالمة واردة', notifOptions);
      })()
    );
    return;
  }

  // Fix 7D: new_message push type — skip if app is visible
  if (data.type === 'new_message') {
    event.waitUntil(
      (async () => {
        const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const focused = windowClients.some(c => c.visibilityState === 'visible');
        if (!focused) {
          await self.registration.showNotification(data.senderName || 'رسالة جديدة', {
            body: data.text || '...',
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'msg-' + (data.chatId || data.senderId || Date.now()),
            renotify: true,
            vibrate: [200, 100, 200],
            data: { type: 'new_message', chatId: data.chatId, url: '/chat?chatId=' + (data.chatId || '') },
          });
        }
      })()
    );
    return;
  }

  // Regular message notification (legacy type: chat_message)
  if (data.type === 'chat_message') {
    event.waitUntil(
      self.registration.showNotification(data.title || 'رسالة جديدة', {
        body: data.body || data.message || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: `msg-${data.chatId || Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/chat', chatId: data.chatId },
      })
    );
    return;
  }

  // monthly_winner notification
  if (data.type === 'monthly_winner') {
    event.waitUntil(
      self.registration.showNotification(data.title || '🏆 بائع الشهر', {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'monthly-winner',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: { url: data.url || '/', type: 'monthly_winner', winnerId: data.winnerId || '' },
      })
    );
    return;
  }

  // winner_rules_update notification
  if (data.type === 'winner_rules_update') {
    event.waitUntil(
      self.registration.showNotification(data.title || '🏆 قواعد بائع الشهر', {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'winner-rules',
        requireInteraction: false,
        vibrate: [100, 50, 100],
        data: { url: data.url || '/', type: 'winner_rules_update' },
      })
    );
    return;
  }

  // Generic notification
  if (data.title) {
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body || '',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: { url: data.url || '/' },
        vibrate: [200],
      })
    );
  }
});

// ── NOTIFICATION CLICK: WhatsApp-style — focus existing window or open new ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};

  if (notifData.type === 'incoming_call') {
    if (event.action === 'decline') {
      // Just close — no window needed (server TTL handles cleanup)
      return;
    }

    // 'answer' action OR tapped body → open/focus app with auto-answer
    const answerUrl = `/?autoAnswer=${encodeURIComponent(notifData.callerId)}_${encodeURIComponent(notifData.callerSocketId)}&callerName=${encodeURIComponent(notifData.callerName)}`;

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Build the callData to postMessage
        let parsedOffer = null;
        try {
          // If offer is already a JS object (browser parsed the push JSON), use it directly
          parsedOffer = (typeof notifData.offer === 'object' && notifData.offer !== null)
            ? notifData.offer
            : JSON.parse(notifData.offer);
        } catch {}

        const callData = {
          type: 'incoming_call_push',
          callerId: notifData.callerId,
          callerName: notifData.callerName,
          callerAvatar: notifData.callerAvatar,
          callerSocketId: notifData.callerSocketId,
          offer: parsedOffer,
          roomId: notifData.roomId,
        };

        // Focus existing window and postMessage
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage(callData);
            return;
          }
        }

        // No existing window → open app with autoAnswer query param
        return clients.openWindow(event.action === 'answer' ? answerUrl : '/');
      })
    );
    return;
  }

  // Regular notification click — open or focus URL
  const url = notifData.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ── NOTIFICATION CLOSE: track missed calls ───────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  const notifData = event.notification.data || {};
  if (notifData.type === 'incoming_call') {
    logCallEventSW('push_dismissed', { callerId: notifData.callerId || '', roomId: notifData.roomId || '' });
    // Notify backend of missed call (fire and forget)
    fetch(_XTOX_API + '/api/calls/missed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callerId: notifData.callerId, roomId: notifData.roomId }),
    }).catch(() => {});
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

  // 3. NEVER intercept cross-origin requests to external domains we don't own.
  //    This prevents CSP connect-src violations and avoids caching resources
  //    we have no authority over (fonts, avatars, analytics, search pings, etc.)
  if (
    url.hostname.includes('jsdelivr.net') ||
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('gstatic.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('googletagmanager.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('bing.com') ||
    url.hostname.includes('ipapi.co') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('qrserver.com')
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

  // 8. HTML NAVIGATION — CRITICAL: NEVER cache HTML pages.
  //    HTML pages contain content-hashed bundle references (e.g. page-abc123.js).
  //    If the SW caches HTML, it will serve stale bundle hashes forever even after
  //    a new deployment generates new hashes — causing 404s for old chunk files
  //    and the infamous "let eg" TDZ crash from stale cached bundles.
  //    Always fetch from network; on failure, serve a plain offline fallback (no cached HTML).
  if (request.mode === 'navigate' ||
      request.headers.get('accept')?.includes('text/html') ||
      url.pathname === '/' ||
      !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Network failed — serve offline page (from cache) or minimal fallback
        return caches.match(OFFLINE_URL) || new Response(
          '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // 9. Everything else — network only (no caching)
  //    This includes API calls to our own domain, WebSocket upgrades, etc.
});
