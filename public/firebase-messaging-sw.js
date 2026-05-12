/* global importScripts, firebase */
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyCTGbWMP1rm1HgM9dx63myBTBKZfwAfGEc",
  authDomain: "fantomchat-9ddd7.firebaseapp.com",
  projectId: "fantomchat-9ddd7",
  storageBucket: "fantomchat-9ddd7.firebasestorage.app",
  messagingSenderId: "1022475545533",
  appId: "1:1022475545533:web:79eeedf2188ed06077c0d4",
});

const messaging = firebase.messaging();

const CHAT_ICON_PATH = "/comment.png";

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const roomName = data.room_name || "";
  const title = notification.title || "New message";
  const body = notification.body || "";
  const targetUrl = roomName ? `/room/${encodeURIComponent(roomName)}` : "/";

  self.registration.showNotification(title, {
    body,
    icon: notification.icon || CHAT_ICON_PATH,
    badge: CHAT_ICON_PATH,
    tag: roomName ? `chat:${roomName}` : "chat",
    data: { url: targetUrl, roomName },
  });
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  ).href;

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
