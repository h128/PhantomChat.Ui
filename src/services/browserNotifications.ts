import type { ChatMessage } from "../features/chat/chatSlice";

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

export type AppActivityState = "active" | "inactive" | "hidden";

type ChatNotificationInput = {
  roomId: string;
  message: ChatMessage;
};

const SERVICE_WORKER_PATH = "/chat-notifications-sw.js";
const CHAT_ICON_PATH = "/comment.png";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function isNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  );
}

export function getNotificationPermissionState(): NotificationPermissionState {
  if (!isNotificationSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

export function getAppActivityState(
  doc: Pick<Document, "hidden" | "visibilityState" | "hasFocus"> = document,
): AppActivityState {
  if (doc.hidden || doc.visibilityState === "hidden") {
    return "hidden";
  }

  if (typeof doc.hasFocus === "function" && !doc.hasFocus()) {
    return "inactive";
  }

  return "active";
}

export function shouldNotifyForIncomingMessage({
  message,
  currentUserId,
  appActivityState,
}: {
  message: ChatMessage;
  currentUserId: string;
  appActivityState: AppActivityState;
}) {
  if (appActivityState === "active") {
    return false;
  }

  if (message.senderId === currentUserId || message.senderId === "system") {
    return false;
  }

  return true;
}

export function createNotificationBody(message: ChatMessage) {
  if (message.content.trim()) {
    return message.content;
  }

  switch (message.attachment?.type) {
    case "image":
      return "Sent an image";
    case "audio":
      return "Sent a voice message";
    case "file":
      return `Shared ${message.attachment.originalName}`;
    default:
      return "Sent a message";
  }
}

export function createNotificationTitle(roomId: string, senderName: string) {
  const roomName = formatRoomName(roomId) || roomId;
  return `${senderName} in ${roomName}`;
}

export async function registerChatNotificationServiceWorker() {
  if (!isNotificationSupported()) {
    return null;
  }

  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register(SERVICE_WORKER_PATH)
      .catch((error) => {
        registrationPromise = null;
        throw error;
      });
  }

  return registrationPromise;
}

export async function requestBrowserNotificationPermission() {
  if (!isNotificationSupported()) {
    return "denied" as const;
  }

  if (Notification.permission !== "default") {
    return Notification.permission;
  }

  await registerChatNotificationServiceWorker().catch(() => null);
  return Notification.requestPermission();
}

export async function showChatNotification({
  roomId,
  message,
}: ChatNotificationInput) {
  if (getNotificationPermissionState() !== "granted") {
    return false;
  }

  const registration =
    (await registerChatNotificationServiceWorker().catch(() => null)) ||
    (await navigator.serviceWorker.getRegistration().catch(() => undefined));

  const title = createNotificationTitle(roomId, message.senderName);
  const body = createNotificationBody(message);
  const targetUrl = `/room/${encodeURIComponent(roomId)}`;

  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      tag: `chat:${roomId}:${message.id}`,
      icon: CHAT_ICON_PATH,
      badge: CHAT_ICON_PATH,
      data: {
        roomId,
        url: targetUrl,
        messageId: message.id,
      },
    });
    return true;
  }

  if (typeof Notification !== "undefined") {
    new Notification(title, {
      body,
      icon: CHAT_ICON_PATH,
      tag: `chat:${roomId}:${message.id}`,
      data: {
        roomId,
        url: targetUrl,
        messageId: message.id,
      },
    });
    return true;
  }

  return false;
}