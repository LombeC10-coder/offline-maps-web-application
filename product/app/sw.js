const CACHE_NAME = "offline-maps-shell-v7";

const ASSETS = [
  "/product/app/",
  "/product/app/index.html",
  "/product/app/styles/main.css",
  "/product/app/src/main.js",
  "/product/app/src/ui/fileLoader.js",
  "/product/app/src/map/osmParser.js"
];


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) =>
          key !== CACHE_NAME ? caches.delete(key) : null
        )
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  event.respondWith(
    caches.match(url.pathname).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("/product/app/index.html");
        }
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});



self.addEventListener("install", (event) => {
  console.log("[SW] Installing…", ASSETS);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => console.log("[SW] Cached all assets ✅"))
      .catch((err) => console.error("[SW] cache.addAll failed ❌", err))
  );
});

