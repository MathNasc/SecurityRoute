/* ════════════════════════════════════════════════════
   SERVICE WORKER — sw.js
   Security Route PWA

   Estratégia de cache por tipo de recurso:
   ┌─────────────────────────────────────────────────┐
   │ App shell (HTML + JS)  → Cache First             │
   │ CDN (Leaflet, fonts)   → Cache First             │
   │ Tiles do mapa          → Cache First (max 500)   │
   │ API de ocorrências     → Network First           │
   │ Geocoding (Nominatim)  → Network First           │
   └─────────────────────────────────────────────────┘
   ════════════════════════════════════════════════════ */

const CACHE_VERSION  = 'sr-v1';
const TILE_CACHE     = 'sr-tiles-v1';
const MAX_TILE_CACHE = 500;

/* ── App shell — recursos que funcionam offline ── */
const APP_SHELL = [
  '/',
  '/index.html',
  '/js/config.js',
  '/js/api.js',
  '/js/toast.js',
  '/js/markers.js',
  '/js/map.js',
  '/js/heatmap.js',
  '/js/search.js',
  '/js/filters.js',
  '/js/stats.js',
  '/js/sheet.js',
  '/js/risk-engine.js',
  '/js/osrm-client.js',
  '/js/route-planner.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* ── CDN — Leaflet, MarkerCluster, fonts ── */
const CDN_RESOURCES = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js',
];

/* ════════════════════════════════════════════════════
   INSTALL — pre-cache app shell
   ════════════════════════════════════════════════════ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      // Cache app shell (best-effort — don't fail if one resource is missing)
      await Promise.allSettled(
        [...APP_SHELL, ...CDN_RESOURCES].map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] Failed to cache: ${url}`, err)
          )
        )
      );
      console.log('[SW] App shell cached');
    })
  );
  // Activate immediately without waiting for old SW to finish
  self.skipWaiting();
});

/* ════════════════════════════════════════════════════
   ACTIVATE — clean up old caches
   ════════════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== TILE_CACHE)
          .map(k => {
            console.log(`[SW] Deleting old cache: ${k}`);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ════════════════════════════════════════════════════
   FETCH — route requests by type
   ════════════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // ── Map tiles ──────────────────────────────────────
  if (_isTile(url)) {
    event.respondWith(_tileStrategy(request));
    return;
  }

  // ── API calls (occurrences backend) ───────────────
  if (_isAPI(url)) {
    event.respondWith(_networkFirst(request, CACHE_VERSION));
    return;
  }

  // ── Geocoding (Nominatim, Photon, ViaCEP, BrasilAPI) ──
  if (_isGeocoding(url)) {
    event.respondWith(_networkFirst(request, CACHE_VERSION, 60 * 60 * 24)); // 24h cache
    return;
  }

  // ── App shell + CDN ───────────────────────────────
  event.respondWith(_cacheFirst(request));
});

/* ── Strategies ───────────────────────────────────── */

/** Cache first — serve from cache, fetch if missing */
async function _cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return _offlineFallback();
  }
}

/** Network first — try network, fall back to cache */
async function _networkFirst(request, cacheName, maxAgeSeconds = null) {
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || _offlineFallback();
  }
}

/**
 * Tile strategy — Cache first with LRU eviction.
 * Keeps the tile cache from growing unboundedly.
 */
async function _tileStrategy(request) {
  const cache  = await caches.open(TILE_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Evict oldest tiles if over limit
      const keys = await cache.keys();
      if (keys.length >= MAX_TILE_CACHE) {
        await cache.delete(keys[0]); // FIFO — good enough
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 503 });
  }
}

/** Minimal offline page when nothing is cached */
function _offlineFallback() {
  return new Response(
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Security Route — Offline</title>
    <style>
      body{font-family:system-ui,sans-serif;background:#07090f;color:#dde4f0;
           display:flex;flex-direction:column;align-items:center;justify-content:center;
           height:100vh;margin:0;gap:16px;text-align:center;padding:20px}
      .icon{font-size:64px}
      h1{font-size:24px;font-weight:700;margin:0}
      p{color:#7e8da6;font-size:14px;max-width:280px;line-height:1.6;margin:0}
      button{margin-top:8px;padding:12px 24px;border-radius:8px;border:none;
             background:#ff6b2b;color:#fff;font-size:14px;font-weight:600;cursor:pointer}
    </style></head>
    <body>
      <div class="icon">🛡️</div>
      <h1>Você está offline</h1>
      <p>Verifique sua conexão com a internet para usar o Security Route.</p>
      <button onclick="location.reload()">Tentar novamente</button>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* ── URL classifiers ──────────────────────────────── */

function _isTile(url) {
  return (
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  );
}

function _isAPI(url) {
  // Backend API — adjust to match your SR_API_URL
  const apiHosts = ['localhost', '127.0.0.1'];
  return apiHosts.includes(url.hostname) && url.pathname.startsWith('/occurrences');
}

function _isGeocoding(url) {
  const geocodingHosts = [
    'nominatim.openstreetmap.org',
    'photon.komoot.io',
    'viacep.com.br',
    'brasilapi.com.br',
    'router.project-osrm.org',
  ];
  return geocodingHosts.some(h => url.hostname.includes(h));
}
