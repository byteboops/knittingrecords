/* ============================================================
   KNITTING RECORDS — Service Worker
   Estratégias:
   - HTML        → network-first (fallback: cache)
   - Assets      → cache-first (fallback: rede)
   - Navegação   → fallback para index.html offline
============================================================ */

const CACHE_VERSION = 'knitting-v1';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;

/* Arquivos essenciais pra funcionar offline */
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './peido.jpg',
  './nobody.png',
  'https://cdn.imageurlgenerator.com/uploads/497d07b9-cb76-4c9b-9971-cb08d44a5880.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/* ------------------------------------------------------------
   INSTALL — pré-cache
------------------------------------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      // addAll falha se 1 URL quebrar; usamos add individual com catch
      return Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn('[SW] Falha ao pré-cachear:', url, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ------------------------------------------------------------
   ACTIVATE — limpa caches antigos
------------------------------------------------------------ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('knitting-') && key !== CACHE_STATIC)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------
   FETCH — roteamento de estratégias
------------------------------------------------------------ */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Só lida com GET (POST/PUT etc. vão direto pra rede — Supabase uploads)
  if (request.method !== 'GET') return;

  // Ignora requisições do Supabase (auth, storage, rest) — sempre rede
  if (request.url.includes('supabase.co')) return;

  const accept = request.headers.get('accept') || '';

  // Navegação (HTML) → network-first com fallback
  if (request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  // Assets → cache-first
  event.respondWith(cacheFirst(request));
});

/* ------------------------------------------------------------
   ESTRATÉGIAS
------------------------------------------------------------ */

// Network-first: tenta rede, cai pro cache, cai pro fallback
async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_STATIC);
  try {
    const fresh = await fetch(request);
    // Atualiza cache com a versão nova
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Cache-first: tenta cache, cai pra rede, guarda no cache
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    // Só cacheia respostas válidas (evita cachear 404/erros)
    if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
      cache.put(request, fresh.clone());
    } else if (fresh && fresh.type === 'opaque') {
      // Fontes externas (Google Fonts, etc.) vêm como opaque; cacheamos mesmo assim
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}