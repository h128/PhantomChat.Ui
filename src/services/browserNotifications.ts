import type { ChatMessage } from "../features/chat/chatSlice";

export type NotificationPermissionState =
  | NotificationPermission
  | "unsupported";

export type AppActivityState = "active" | "inactive" | "hidden";

type ChatNotificationInput = {
  roomId: string;
  message: ChatMessage;
  senderLabel?: string;
  iconUrl?: string | null;
};

type IncomingCallNotificationInput = {
  roomId: string;
  callerLabel: string;
  callType: "video" | "voice";
  iconUrl?: string | null;
};

const SERVICE_WORKER_PATH = "/chat-notifications-sw.js";
const CHAT_ICON_PATH = "/comment.png";

let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;
let activityTrackingInitialized = false;
let trackedWindowFocused = true;
let trackedPageHidden = false;

function canUseDom() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function syncTrackedActivityState() {
  if (!canUseDom()) {
    return;
  }

  trackedPageHidden = document.hidden || document.visibilityState === "hidden";
  trackedWindowFocused =
    typeof document.hasFocus === "function" ? document.hasFocus() : true;
}

function ensureAppActivityTracking() {
  if (activityTrackingInitialized || !canUseDom()) {
    return;
  }

  activityTrackingInitialized = true;
  syncTrackedActivityState();

  window.addEventListener("focus", () => {
    trackedWindowFocused = true;
    syncTrackedActivityState();
  });

  window.addEventListener("blur", () => {
    trackedWindowFocused = false;
    syncTrackedActivityState();
  });

  window.addEventListener("pagehide", () => {
    trackedPageHidden = true;
  });

  window.addEventListener("pageshow", () => {
    syncTrackedActivityState();
  });

  document.addEventListener("visibilitychange", () => {
    syncTrackedActivityState();
  });
}

function buildNotificationOptions({
  body,
  tag,
  targetUrl,
  iconUrl,
  data,
}: {
  body: string;
  tag: string;
  targetUrl: string;
  iconUrl?: string | null;
  data?: Record<string, unknown>;
}) {
  const resolvedIconUrl = iconUrl || CHAT_ICON_PATH;

  return {
    body,
    tag,
    icon: resolvedIconUrl,
    badge: CHAT_ICON_PATH,
    data: {
      url: targetUrl,
      ...(data ?? {}),
    },
  };
}

async function showSystemNotification({
  title,
  body,
  tag,
  targetUrl,
  iconUrl,
  data,
}: {
  title: string;
  body: string;
  tag: string;
  targetUrl: string;
  iconUrl?: string | null;
  data?: Record<string, unknown>;
}) {
  if (getNotificationPermissionState() !== "granted") {
    return false;
  }

  const options = buildNotificationOptions({
    body,
    tag,
    targetUrl,
    iconUrl,
    data,
  });

  if (isServiceWorkerNotificationSupported()) {
    const registration =
      (await navigator.serviceWorker
        .getRegistration()
        .catch(() => undefined)) ||
      (await registerChatNotificationServiceWorker().catch(() => null));

    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return true;
    }
  }

  if (typeof Notification !== "undefined") {
    new Notification(title, options);
    return true;
  }

  return false;
}

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isServiceWorkerNotificationSupported() {
  return (
    isNotificationSupported() &&
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
  if (canUseDom() && doc === document) {
    ensureAppActivityTracking();
  }

  const pageHidden =
    canUseDom() && doc === document
      ? trackedPageHidden
      : doc.hidden || doc.visibilityState === "hidden";

  if (pageHidden) {
    return "hidden";
  }

  const isFocused =
    canUseDom() && doc === document
      ? trackedWindowFocused &&
        (typeof doc.hasFocus !== "function" || doc.hasFocus())
      : typeof doc.hasFocus === "function"
        ? doc.hasFocus()
        : true;

  if (!isFocused) {
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

export function shouldNotifyForIncomingCall({
  callerUserId,
  currentUserId,
  appActivityState,
}: {
  callerUserId: string;
  currentUserId: string;
  appActivityState: AppActivityState;
}) {
  if (appActivityState === "active") {
    return false;
  }

  return callerUserId !== currentUserId;
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

export function createNotificationTitle(senderName: string) {
  return `${senderName}`;
}

export function createIncomingCallTitle(callerLabel: string) {
  return `${callerLabel} is calling`;
}

export function createIncomingCallBody(callType: "video" | "voice") {
  return `Incoming ${callType} call`;
}

export async function registerChatNotificationServiceWorker() {
  if (!isServiceWorkerNotificationSupported()) {
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

  if (isServiceWorkerNotificationSupported()) {
    await registerChatNotificationServiceWorker().catch(() => null);
  }

  return Notification.requestPermission();
}

export async function showChatNotification({
  roomId,
  message,
  senderLabel,
  iconUrl,
}: ChatNotificationInput) {
  const title = createNotificationTitle(
    senderLabel || message.senderName || message.senderId,
  );
  const body = createNotificationBody(message);
  return showSystemNotification({
    title,
    body,
    tag: `chat:${roomId}:${message.id}`,
    targetUrl: `/room/${encodeURIComponent(roomId)}`,
    iconUrl,
    data: {
      roomId,
      messageId: message.id,
    },
  });
}

export async function showIncomingCallNotification({
  roomId,
  callerLabel,
  callType,
  iconUrl,
}: IncomingCallNotificationInput) {
  return showSystemNotification({
    title: createIncomingCallTitle(callerLabel),
    body: createIncomingCallBody(callType),
    tag: `call:${roomId}:${callType}:${callerLabel}`,
    targetUrl: `/room/${encodeURIComponent(roomId)}`,
    iconUrl,
    data: {
      roomId,
      callType,
    },
  });
}
