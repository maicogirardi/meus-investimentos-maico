const APP_SHELL_CACHE = "meus-investimentos-shell-v2";
const RUNTIME_CACHE = "meus-investimentos-runtime-v1";
const APP_BASE = self.location.pathname.replace(/sw\.js$/, "");
const OFFLINE_URLS = [
  APP_BASE,
  `${APP_BASE}index.html`,
  `${APP_BASE}manifest.webmanifest`,
  `${APP_BASE}favicon.svg`,
  `${APP_BASE}logo-invest.svg`,
  `${APP_BASE}icons/icon-192.png`,
  `${APP_BASE}icons/icon-512.png`,
  `${APP_BASE}icons/icon-maskable-512.png`,
  `${APP_BASE}icons/apple-touch-icon.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(OFFLINE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      )),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${APP_BASE}index.html`)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
        return networkResponse;
      });
    }),
  );
});
