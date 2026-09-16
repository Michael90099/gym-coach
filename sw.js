// GymCoach Service Worker – Offline-Cache
const CACHE = 'gymcoach-v28';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=28',
  './app.js?v=28',
  './plan.js?v=28',
  './coach.js?v=28',
  './body.js?v=28',
  './oura.js?v=28',
  './mobility.js?v=28',
  './running.js?v=28',
  './weekcoach.js?v=28',
  './storage.js?v=28',
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
