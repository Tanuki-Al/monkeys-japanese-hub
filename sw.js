// Service worker for Monkey's Japanese Hub.
//
// Purpose: cache the app SHELL (the 4 HTML files, manifest, icons) so the
// Hub still opens with no connection at all — the actual vocab/kanji/grammar
// DATA offline story is handled separately, inside each app, via
// localStorage (see the "OFFLINE CACHE" comments in each app's <script>).
//
// Strategy: stale-while-revalidate for same-origin shell files (serve the
// cached copy instantly, then quietly refresh it in the background for next
// time). Cross-origin requests (the live Google Sheets JSONP pulls) are left
// completely alone — they go straight to the network, exactly as if there
// were no service worker at all.
const CACHE_NAME = 'monkeys-japanese-hub-v1';
const SHELL_FILES = [
  'vocab_kanji_hub.html',
  'monkey_vocab_app.html',
  'kanji_app.html',
  'grammar_app.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/apple-touch-icon-152.png',
  'icons/apple-touch-icon-167.png',
  'icons/favicon-32.png',
  'icons/favicon-16.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .catch(() => {}) // don't let one missing file block installation
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Google Sheets pulls untouched

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
