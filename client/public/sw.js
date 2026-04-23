// ── KBA Service Worker v2 ────────────────────────────────────────────────────
const CACHE_NAME   = 'kba-v2';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/favicon.ico'
];

// ── Install: cache app shell ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, stale-while-revalidate for assets ──────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API calls — network only (never cache)
  if (url.pathname.startsWith('/api/')) return;

  // Static assets — stale-while-revalidate
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // HTML / navigation — network-first, fall back to cached index.html (SPA)
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(request).then(cached =>
          cached || caches.match('/index.html')
        )
      )
  );
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'KBA', {
      body: data.body || '',
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/shop/dashboard' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const target = event.notification.data?.url || '/shop/dashboard';
      const existing = cs.find(c => c.url.includes(target));
      if (existing) return existing.focus();
      return clients.openWindow(target);
    })
  );
});
