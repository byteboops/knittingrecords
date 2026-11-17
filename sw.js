/* Knitting Records — root-scoped service worker */
const CACHE_NAME = 'knitting-site-v2';
const CORE_ASSETS = [
  './',
  './index.html',
  './assets/style.css',
  './assets/app.js',
  './assets/manifest.json',
  './icons/favicon.png',
  './icons/knitting.png',
  './covers/ricardo/sol.jpeg',
  './covers/ricardo/peido/peido.jpeg',
  './covers/knitting_cat/knitting_cat.png',
  './covers/knitting_cat/nobody/nobody.png',
  './audio/knitting_cat/nobody/nobody.mp3',
  './audio/knitting_cat/nobody/slowed.mp3',
  './audio/knitting_cat/nobody/super_slowed.mp3',
  './audio/knitting_cat/nobody/spedup.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('knitting-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/storage/') || url.pathname.includes('/rest/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('./index.html')) || new Response('Offline', { status: 503 })));
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
