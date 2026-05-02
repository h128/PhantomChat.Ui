self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationUrl = event.notification.data?.url || "/";
  const targetUrl = new URL(notificationUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const exact = clients.find((c) => c.url === targetUrl);
        if (exact) return exact.focus();

        const sameOrigin = clients.find(
          (c) => new URL(c.url).origin === self.location.origin,
        );
        if (sameOrigin && "navigate" in sameOrigin) {
          try {
            const navigated = await sameOrigin.navigate(targetUrl);
            if (navigated) return navigated.focus();
          } catch {
            /* fall through to openWindow */
          }
          return sameOrigin.focus();
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
