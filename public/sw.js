/* Tally service worker — offline shell + runtime caching + push. */
const VERSION = "tally-v2";
const STATIC_CACHE = `${VERSION}-static`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/", OFFLINE_URL, "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Never cache API calls — data must always be fresh from the server.
  if (new URL(request.url).pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cache, then offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/* Web Push (works once VAPID keys + a push service are configured). */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Tally", body: event.data.text() };
  }
  const tag = typeof data.tag === "string" && data.tag ? data.tag : undefined;
  event.waitUntil(
    self.registration.showNotification(data.title || "Tally", {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [80, 40, 80],
      data: data.url ? { url: data.url } : {},
      tag,
      renotify: Boolean(tag),
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = (event.notification.data && event.notification.data.url) || "/";
  let target = new URL("/", self.location.origin);
  try {
    const candidate = new URL(requested, self.location.origin);
    if (candidate.origin === self.location.origin) target = candidate;
  } catch {
    // Invalid or cross-origin targets always fall back to the app home page.
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      const exact = list.find((client) => client.url === target.href);
      if (exact && "focus" in exact) {
        try {
          return await exact.focus();
        } catch {
          // Fall through to another same-origin window or a new one.
        }
      }

      const sameOrigin = list.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });
      if (sameOrigin && "navigate" in sameOrigin) {
        try {
          const navigated = await sameOrigin.navigate(target.href);
          if (navigated && "focus" in navigated) return await navigated.focus();
        } catch {
          // A stale window client should not prevent opening the target.
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
