import { useCallback, useEffect, useState } from "react";
import type { ChatMessage } from "../features/chat/chatSlice";
import { useAppSelector } from "../app/hooks";
import { getAvatarById } from "../features/profile/avatarCatalog";
import {
  getAppActivityState,
  getNotificationPermissionState,
  isNotificationSupported,
  requestBrowserNotificationPermission,
  shouldNotifyForIncomingMessage,
  showChatNotification,
  type NotificationPermissionState,
} from "../services/browserNotifications";
import { getPersistentUserId } from "../utils/user";
import { useNotificationSound } from "./useNotificationSound";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>(
    getNotificationPermissionState(),
  );

  const refreshPermission = useCallback(() => {
    setPermission(getNotificationPermissionState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);

    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, [refreshPermission]);

  const requestPermission = useCallback(async () => {
    const nextPermission = await requestBrowserNotificationPermission();
    refreshPermission();
    return nextPermission;
  }, [refreshPermission]);

  return {
    supported: isNotificationSupported(),
    permission,
    canRequestPermission: permission === "default",
    requestPermission,
  };
}

export function useMessageNotifications() {
  const playBeep = useNotificationSound();
  const membersByRoom = useAppSelector((state) => state.chat.membersByRoom);

  const notifyIncomingMessage = useCallback(
    async (roomId: string, message: ChatMessage) => {
      const currentUserId = getPersistentUserId();
      const appActivityState = getAppActivityState();
      const roomMember = membersByRoom[roomId]?.[message.senderId];
      const senderLabel =
        roomMember?.displayName?.trim() ||
        message.senderId ||
        message.senderName;
      const avatarUrl = getAvatarById(roomMember?.avatarId)?.src ?? null;

      if (
        !shouldNotifyForIncomingMessage({
          message,
          currentUserId,
          appActivityState,
        })
      ) {
        return;
      }

      const shown = await showChatNotification({
        roomId,
        message,
        senderLabel,
        iconUrl: avatarUrl,
        imageUrl: avatarUrl,
      }).catch(() => false);

      if (!shown) {
        playBeep();
      }
    },
    [membersByRoom, playBeep],
  );

  return { notifyIncomingMessage };
}