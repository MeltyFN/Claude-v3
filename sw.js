// Sermon Notes offline support: the app opens and works with no signal.
// Pages load fresh from the network when possible (so updates show right away)
// and fall back to the saved copy when offline. Icons and fonts are served from the cache.
const CACHE = 'sermon-notes-v3-3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // fresh copy when the signal is good; the saved copy if offline or the network stalls for 3 seconds
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return res;
    });
    const slow = new Promise(r => setTimeout(r, 3000)).then(() => caches.match('./index.html'));
    e.respondWith(Promise.race([net.catch(() => caches.match('./index.html')), slow.then(hit => hit || net)])
      .then(res => res || net));
    return;
  }
  if (url.origin === location.origin || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit);
      return hit || net;
    }));
  }
});
