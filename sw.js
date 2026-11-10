// GymCoach Service Worker – Offline-Cache
const CACHE = 'gymcoach-v32';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=32',
  './app.js?v=32',
  './plan.js?v=32',
  './coach.js?v=32',
  './body.js?v=32',
  './oura.js?v=32',
  './mobility.js?v=32',
  './running.js?v=32',
  './weekcoach.js?v=32',
  './storage.js?v=32',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Network-first für Navigation (frische Version, wenn online), Cache-Fallback offline.
// Cache-first für alles andere.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }))
  );
});
