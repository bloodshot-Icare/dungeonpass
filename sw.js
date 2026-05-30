/**
 * Service Worker — DungeonPass PWA
 *
 * Stratégie :
 *  - Assets statiques (HTML, images, icônes) : Cache First (lecture rapide)
 *  - Appels API (/api/*) : Network First avec fallback cache
 *  - Si hors ligne : affiche la dernière version mise en cache
 */

const CACHE_NAME   = 'dungeonpass-v1';
const CACHE_ASSETS = [
  '/dungeonpass/site.html',
  '/dungeonpass/manifest.json',
  '/dungeonpass/favicon.png',
  '/dungeonpass/icons/icon-192.png',
  '/dungeonpass/icons/icon-512.png',
];

// ── Installation : mise en cache des assets de base ───────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activation : nettoyer les anciens caches ──────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch : intercepter les requêtes ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requêtes API → Network First (données toujours fraîches)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Mettre en cache la réponse API pour usage offline
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Assets statiques → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
