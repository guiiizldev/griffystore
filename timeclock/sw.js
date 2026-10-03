const cacheName = "griffy-ponto-20261002-2";
const shellFiles = ["./index.html", "./styles.css?v=20261002-2", "./app.js?v=20261002-2", "./vendor/lucide.min.js", "./logo.png", "./app-icon.png", "./manifest.webmanifest"];
const shellUrls = new Set(shellFiles.map((file) => new URL(file, self.registration.scope).pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(shellFiles)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("griffy-ponto-") && key !== cacheName).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Only cache the public shell. API responses, selfies and punches stay online.
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode !== "navigate" && !shellUrls.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(event.request);
      if (response.ok && shellUrls.has(url.pathname)) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const cached = event.request.mode === "navigate"
        ? await cache.match(new URL("./index.html", self.registration.scope).href)
        : await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      throw error;
    }
  })());
});
