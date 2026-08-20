const CACHE = "ridenow-v1";
const CORE = [
  "./",
  "./index.html",
  "./driver.html",
  "./admin.html",
  "./track.html",
  "./styles.css",
  "./app.js",
  "./driver.js",
  "./admin.js",
  "./track.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/ws" || url.protocol === "ws:" || url.protocol === "wss:") {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && url.origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => null);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
