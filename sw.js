// BARAKARSA service worker — v3.2.3
// Strategi: tampilkan dari cache dulu (cepat, juga saat sinyal lemah atau offline),
// lalu perbarui cache di belakang layar. Kalau index.html di server berubah,
// halaman diberi tahu supaya bisa menawarkan "Muat ulang".
//
// Setiap file baru di css/ atau js/ WAJIB ditambahkan ke ASSETS, dan nama
// CACHE_NAME dinaikkan setiap rilis, supaya aplikasi tetap jalan offline.

const CACHE_NAME = 'barakarsa-v3.2.3';
const APP_SHELL = './index.html';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/tema.css',
  './css/dasar.css',
  './css/komponen.css',
  './css/tampilan.css',
  './css/ckp.css',
  './css/cetak.css',
  './css/hp.css',
  './js/data.js',
  './js/sinkron.js',
  './js/tema.js',
  './js/tampilan.js',
  './js/form-task.js',
  './js/project-label.js',
  './js/bukti.js',
  './js/ckp.js',
  './js/ekspor.js',
  './js/pwa.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' = ambil langsung dari server, bukan dari cache HTTP browser
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// Versi file dinilai dari ETag / Last-Modified (GitHub Pages mengirim keduanya)
function versionOf(response) {
  if (!response) return '';
  return response.headers.get('etag') || response.headers.get('last-modified') || '';
}

async function notifyUpdate() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.postMessage({ type: 'barakarsa-updated' }));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Hanya GET dari origin sendiri. Supabase, CDN pustaka, dll. tidak disentuh.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  const isNav = request.mode === 'navigate';
  // Semua navigasi (termasuk ./?quick=1 dari shortcut) memakai app shell yang sama
  const cacheKey = isNav ? APP_SHELL : request;

  const networkUpdate = fetch(request)
    .then(async (response) => {
      // Jangan simpan respons redirect/eror (Safari menolak navigasi dari respons redirect)
      if (!response || !response.ok || response.redirected || response.type !== 'basic') return response;
      const cache = await caches.open(CACHE_NAME);
      const old = await cache.match(cacheKey);
      await cache.put(cacheKey, response.clone());
      if (isNav && old) {
        const before = versionOf(old);
        const after = versionOf(response);
        if (before && after && before !== after) await notifyUpdate();
      }
      return response;
    })
    .catch(() => null);

  // Biarkan pembaruan cache selesai walau halaman sudah tampil dari cache
  event.waitUntil(networkUpdate.then(() => undefined));

  event.respondWith(
    caches.match(cacheKey, { ignoreSearch: isNav }).then((cached) => {
      if (cached) return cached;
      return networkUpdate.then(async (response) => {
        if (response) return response;
        if (isNav) {
          const shell = await caches.match(APP_SHELL);
          if (shell) return shell;
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
