const CACHE_NAME = "expense-tracker-v2";
const APP_SHELL_ASSETS = ["/", "/index.html", "/manifest.json"];

function shouldCacheSameOriginRequest(url) {
  const path = url.pathname;
  if (path === "/" || path === "/index.html" || path === "/manifest.json") return true;
  if (path.startsWith("/assets/")) return true;
  if (path === "/favicon.ico" || path === "/sw.js") return true;
  if (path.startsWith("/icons/")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch(() => Promise.resolve());
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!shouldCacheSameOriginRequest(url)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseClone = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseClone))
          .catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return caches.match("/index.html");
      }),
  );
});
