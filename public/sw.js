const CACHE_NAME = "tusan-pwa-v2";
const APP_SHELL = ["/", "/offline.html"];
const PRIVATE_PREFIXES = [
  "/orders",
  "/profile",
  "/settings",
  "/payment",
  "/admin",
  "/manager",
  "/operator",
  "/auth",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("tusan-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || isPrivatePath(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.mode === "navigate") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/offline.html")))
  );
});
