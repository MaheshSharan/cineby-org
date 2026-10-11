// Network-only worker: it makes the app installable and shows an offline page when a page
// navigation fails. It must never cache or intercept API, auth or stream requests.
const CACHE_NAME = "offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // An unreachable offline page must not block installation; navigation then fails as it would without a worker.
  event.waitUntil(precacheOfflinePage().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    deleteOldCaches()
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Everything except page navigations (API, HLS segments, range requests) goes straight to the browser.
  if (event.request.mode !== "navigate") return;

  event.respondWith(fetchNavigation(event));
});

async function precacheOfflinePage() {
  const response = await fetch(OFFLINE_URL, { cache: "reload" });
  if (!response.ok) return;

  // Hosts may redirect /offline.html to a clean URL, and a redirected response cannot answer a navigation.
  const cleanResponse = new Response(await response.blob(), {
    status: response.status,
    headers: response.headers,
  });
  const cache = await caches.open(CACHE_NAME);
  await cache.put(OFFLINE_URL, cleanResponse);
}

async function deleteOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
}

async function fetchNavigation(event) {
  try {
    // The preload runs in parallel with worker startup, so the worker adds no latency to navigations.
    return (await event.preloadResponse) ?? (await fetch(event.request));
  } catch {
    return caches.match(OFFLINE_URL);
  }
}
