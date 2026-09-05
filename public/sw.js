const CACHE = 'roll-rumble-v2';
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  // Always revalidate the page itself (GitHub Pages sends a 10 minute cache header); hashed assets can be cached freely.
  const isPage = e.request.mode === 'navigate' || /\.(html|webmanifest)$/.test(new URL(e.request.url).pathname) || new URL(e.request.url).pathname.endsWith('/');
  const req = isPage ? new Request(e.request, { cache: 'no-cache' }) : e.request;
  e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
