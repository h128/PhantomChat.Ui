import { useCallback, useEffect, useState } from "react";
import type { ChatMessage } from "../features/chat/chatSlice";
import { useAppSelector } from "../app/hooks";
import { getAvatarById } from "../features/profile/avatarCatalog";
import { selectActiveRoomId } from "../features/chat/chatSlice";
import {
  getAppActivityState,
  getNotificationPermissionState,
  isNotificationSupported,
  requestBrowserNotificationPermission,
  showIncomingCallNotification,
  shouldNotifyForIncomingCall,
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
        message.senderName ||
        message.senderId;
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
      }).catch(() => false);

      if (!shown) {
        playBeep();
      }
    },
    [membersByRoom, playBeep],
  );

  return { notifyIncomingMessage };
}

export function useCallNotifications() {
  const playBeep = useNotificationSound();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const membersByRoom = useAppSelector((state) => state.chat.membersByRoom);

  const notifyIncomingCall = useCallback(
    async ({
      callerUserId,
      roomId = activeRoomId,
      callType,
    }: {
      callerUserId: string;
      roomId?: string;
      callType: "video" | "voice";
    }) => {
      const currentUserId = getPersistentUserId();
      const appActivityState = getAppActivityState();

      if (
        !shouldNotifyForIncomingCall({
          callerUserId,
          currentUserId,
          appActivityState,
        })
      ) {
        return;
      }

      const resolvedRoomId = roomId || activeRoomId;
      const roomMember = resolvedRoomId
        ? membersByRoom[resolvedRoomId]?.[callerUserId]
        : undefined;
      const callerLabel = roomMember?.displayName?.trim() || callerUserId;
      const avatarUrl = getAvatarById(roomMember?.avatarId)?.src ?? null;

      const shown = await showIncomingCallNotification({
        roomId: resolvedRoomId || "room",
        callerLabel,
        callType,
        iconUrl: avatarUrl,
      }).catch(() => false);

      if (!shown) {
        playBeep();
      }
    },
    [activeRoomId, membersByRoom, playBeep],
  );

  return { notifyIncomingCall };
}
