import { precacheAndRoute } from "workbox-precaching";

// injectManifest replaces this with the list of built assets to precache —
// keeps the same offline-install behavior the old generateSW strategy gave
// us, on top of which we add push support below.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Fired when the check-new-releases Edge Function sends a push message,
// even if MovieVault isn't open. Payload is JSON: { title, body, url }.
self.addEventListener("push", (event) => {
  let payload = { title: "MovieVault", body: "You have a new update." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Non-JSON payload — fall back to the default text above.
  }

  const url = payload.url || "/watchlist";
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    }),
  );
});

// Focuses an already-open MovieVault tab if there is one, otherwise opens a
// new one — rather than always opening a fresh tab on every notification tap.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/watchlist";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => new URL(client.url).pathname === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    }),
  );
});
