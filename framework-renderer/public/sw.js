/* eslint-disable */
/**
 * Service Worker — offline cache stratejisi:
 *
 * - App shell (HTML/CSS/JS): cache-first
 * - Cluster JSON ve manifest: stale-while-revalidate (taze veriyi arka planda al)
 * - Fontlar / CDN: cache-first, uzun TTL
 * - Diğer: network-first
 *
 * Çakışma riski: yeni sürüm yayına gittiğinde eski cache temizlenmeli — bu yüzden
 * VERSION yükseltilmeli (CI/CD'de otomatik bump önerilir).
 */

const VERSION = 'fwm-v1';
const APP_SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

function isClusterRequest(url) {
  return url.pathname.includes('/content/') && url.pathname.endsWith('.json');
}
function isShellRequest(req) {
  return req.mode === 'navigate' ||
    (req.destination === 'script' || req.destination === 'style' || req.destination === 'document');
}
function isFontOrCdn(url) {
  return /fonts\.gstatic\.com|fonts\.googleapis\.com|unpkg\.com/.test(url.hostname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (isClusterRequest(url)) {
    // stale-while-revalidate
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkPromise;
      }),
    );
    return;
  }

  if (isShellRequest(req)) {
    // cache-first, fallback network, en son offline.html
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) caches.open(APP_SHELL).then((c) => c.put(req, res.clone()));
          return res;
        }).catch(() => caches.match('./offline.html'));
      }),
    );
    return;
  }

  if (isFontOrCdn(url)) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // default: network-first, fallback cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// Sayfadan postMessage ile "SKIP_WAITING" gelirse hemen aktif ol
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
