/* Astore · service worker
   - Páginas (HTML): primero la red (siempre la versión nueva); sin internet, la copia guardada.
   - Archivos estáticos (imágenes, íconos, json): copia guardada y se actualiza por detrás.
   - Nunca guarda llamadas a la nube (otros dominios) ni peticiones que no sean GET.
   - La versión de la caché sale del número de ?v= con que se registra (sw.js?v=110). */
const V = new URL(self.location.href).searchParams.get('v') || '0';
const CACHE = 'astore-' + V;
const PRE = ['./', './index.html'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(PRE.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // nube, CDN, mapas: directo a la red
  if (url.pathname.endsWith('/sw.js')) return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html') || /\.html?$/.test(url.pathname);

  if (isPage) {
    e.respondWith(
      fetch(req, {cache: 'no-cache'}).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() =>
        caches.match(req, {ignoreSearch: true}).then(m => m || caches.match('./index.html') || caches.match('./'))
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
