// Service Worker: macht das Spiel offline spielbar und installierbar.
// Bei Änderungen am Spiel VERSION erhöhen, damit Handys die neue Version laden.
const VERSION = 'bruno-kiki-v6';

const CORE = [
  './',
  'index.html',
  'controller.html',
  'manifest.webmanifest',
  'css/style.css',
  'fonts/luckiest-guy.woff2',
  'fonts/nunito-800.woff2',
  'fonts/nunito-900.woff2',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/three.module.min.js',
  'vendor/peerjs.min.js',
  'vendor/qrcode.js',
  'src/main.js',
  'src/controller.js',
  'src/engine/audio.js',
  'src/engine/fx.js',
  'src/engine/camera.js',
  'src/engine/collision.js',
  'src/engine/geo.js',
  'src/engine/input.js',
  'src/engine/particles.js',
  'src/engine/remote.js',
  'src/engine/renderer.js',
  'src/engine/textures.js',
  'src/engine/touch.js',
  'src/engine/util.js',
  'src/game/dialog.js',
  'src/game/ambient.js',
  'src/game/entities.js',
  'src/game/game.js',
  'src/game/hud.js',
  'src/game/level.js',
  'src/game/menus.js',
  'src/game/mood.js',
  'src/game/models.js',
  'src/game/player.js',
  'src/game/portraits.js',
  'src/game/save.js',
  'src/game/terrain.js',
  'src/levels/index.js',
  'src/levels/hub.js',
  'src/levels/pilzwald.js',
  'src/levels/muschelbucht.js',
  'src/levels/nebelturm.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Erst Netz (damit Updates sofort ankommen), bei Offline aus dem Cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))),
  );
});
