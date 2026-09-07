const CACHE_NAME = "tusan-pwa-v3";
const APP_SHELL = [
  "/",
  "/offline.html",
  "/tools",
  "/tools/pdf-manager",
  "/tools/pdf-manager/merge-pdf",
  "/tools/pdf-manager/split-pdf",
  "/tools/pdf-manager/compress-pdf",
  "/tools/pdf-manager/image-to-pdf",
  "/tools/pdf-to-word",
  "/tools/ocr",
  "/tools/average-calculator",
  "/tools/age-calculator",
];
const PRIVATE_PREFIXES = ["/orders", "/profile", "/settings", "/payment", "/admin", "/manager", "/operator", "/auth"];
const EXTERNAL_LIBRARY_HOSTS = new Set(["cdn.jsdelivr.net", "cdnjs.cloudflare.com"]);

function isPrivatePath(pathname) { return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)); }
function isExternalLibrary(url) { return EXTERNAL_LIBRARY_HOSTS.has(url.hostname) && /\.(js|wasm)(\?.*)?$/i.test(url.pathname); }

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("tusan-pwa-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (isExternalLibrary(url)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok || response.type === "opaque") { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}); } return response; }).catch(() => caches.match(event.request))));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || isPrivatePath(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && (event.request.mode === "navigate" || /\/_next\/static\//.test(url.pathname))) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/offline.html")))
  );
});
