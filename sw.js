/* Service worker — สวนยางพารา */
const CACHE = 'rubberfarm-v3.7.0';
const SHELL = ['./', './index.html', './improvements.js', './owner-domain.js', './owner-data.js', './owner-ui.js', './owner-flow.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // never cache API calls (Apps Script, weather)
  if (url.hostname.includes('script.google') || url.hostname.includes('googleusercontent') || url.hostname.includes('open-meteo')) return;
  // fonts: cache-first
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(caches.open(CACHE).then(async c => { const hit = await c.match(req); if (hit) return hit; const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }));
    return;
  }
  if (url.origin !== location.origin) return;
  // HTML and application code update together, with an offline fallback.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('.js')) {
    e.respondWith(fetch(req).then(async res => {
      if (!res.ok) throw new Error('App asset unavailable');
      const c = await caches.open(CACHE); await c.put(req, res.clone()); return res;
    }).catch(async () => {
      const hit = await caches.match(req); if (hit) return hit;
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || new Response('Offline', { status: 503 });
      return new Response('Offline', { status: 503 });
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
});
