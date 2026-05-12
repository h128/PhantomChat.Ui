import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import {
  registerChatNotificationServiceWorker,
  showChatNotification,
} from "./browserNotifications";

const firebaseConfig = {
  apiKey: "AIzaSyCTGbWMP1rm1HgM9dx63myBTBKZfwAfGEc",
  authDomain: "fantomchat-9ddd7.firebaseapp.com",
  projectId: "fantomchat-9ddd7",
  storageBucket: "fantomchat-9ddd7.firebasestorage.app",
  messagingSenderId: "1022475545533",
  appId: "1:1022475545533:web:79eeedf2188ed06077c0d4",
};

const VAPID_KEY =
  "BJM8OLLLAggRPTlnxlfkso21QsPqcqUIxdd9E4bwgqsC1IVY3fG9K6YB0wLdCutWKT4FPLCpFFnWinzuvCRHKzA";

const FCM_SW_PATH = "/firebase-messaging-sw.js";
const FCM_TOKEN_STORAGE_KEY = "fantomchat:fcm-token";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let foregroundHandlerInstalled = false;
let supportedPromise: Promise<boolean> | null = null;

function isFcmEnvironmentReady() {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator
  );
}

async function ensureFcmSupported() {
  if (!isFcmEnvironmentReady()) return false;
  if (!supportedPromise) {
    supportedPromise = isSupported().catch(() => false);
  }
  return supportedPromise;
}

function ensureApp() {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

async function ensureFcmServiceWorker() {
  const existing = await navigator.serviceWorker
    .getRegistration(FCM_SW_PATH)
    .catch(() => undefined);
  if (existing) return existing;
  return navigator.serviceWorker.register(FCM_SW_PATH, { scope: "/" });
}

async function getMessagingInstance() {
  if (messaging) return messaging;
  if (!(await ensureFcmSupported())) return null;
  messaging = getMessaging(ensureApp());
  installForegroundHandler(messaging);
  return messaging;
}

function installForegroundHandler(instance: Messaging) {
  if (foregroundHandlerInstalled) return;
  foregroundHandlerInstalled = true;

  onMessage(instance, (payload) => {
    const data = payload.data ?? {};
    const notification = payload.notification ?? {};
    const roomId = (data.room_name as string | undefined) ?? "room";
    const title = notification.title ?? "New message";
    const body = notification.body ?? "";

    void showChatNotification({
      roomId,
      message: {
        id: payload.messageId ?? `${Date.now()}`,
        senderId: "fcm",
        senderName: title,
        content: body,
        timestamp: new Date().toISOString(),
      },
      senderLabel: title,
    }).catch(() => {});
  });
}

export function getCachedFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function cacheFcmToken(token: string) {
  try {
    localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

export async function requestFcmToken(): Promise<string | null> {
  if (!(await ensureFcmSupported())) return null;
  if (typeof Notification === "undefined") return null;
  if (Notification.permission !== "granted") return null;

  try {
    await registerChatNotificationServiceWorker().catch(() => null);
    const swRegistration = await ensureFcmServiceWorker();
    const instance = await getMessagingInstance();
    if (!instance) return null;

    const token = await getToken(instance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) return null;
    cacheFcmToken(token);
    return token;
  } catch (error) {
    console.warn("[fcm] failed to obtain token:", error);
    return null;
  }
}
