const CACHE = 'astore-eco-v80-3';
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['./','./index.html']).catch(()=>{})));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  event.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(res => {
        const copy=res.clone();
        caches.open(CACHE).then(cache => cache.put(req,copy)).catch(()=>{});
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
