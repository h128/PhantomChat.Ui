import { useDispatch, useSelector } from "react-redux";
import {
  fileMessageReceived,
  messageReceived,
  removeRoomMember,
  selectActiveRoomId,
  upsertRoomMember,
} from "../features/chat/chatSlice";
import {
  createChatMessageFromFileUploadedPayload,
  createChatMessageFromNewMessagePayload,
  createSystemMessageFromUserEnteredPayload,
  resolveMessageRoomId,
  toRoomMember,
} from "../features/chat/chatMessageMappers";
import { useSocketEvent } from "./useSocket";
import { getPersistentUserId } from "../utils/user";
import type {
  FileUploadedPayload,
  NewMessagePayload,
  UserEnteredPayload,
} from "../services/socket/types";
import { useNotificationSound } from "./useNotificationSound";

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);
  const playBeep = useNotificationSound();

  useSocketEvent("NewMessageReceived", (payload: NewMessagePayload) => {
    const message = createChatMessageFromNewMessagePayload(payload, {
      origin: "realtime",
    });

    if (!message) {
      return;
    }

    dispatch(
      messageReceived({
        roomId: resolveMessageRoomId(payload.room_name, activeRoomId),
        message,
      }),
    );
    playBeep();
  });

  useSocketEvent("UserEnteredRoom", (payload: UserEnteredPayload) => {
    const currentUserId = getPersistentUserId();

    dispatch(
      upsertRoomMember({
        roomId: payload.room_name || activeRoomId || "general",
        member: toRoomMember(payload),
      }),
    );

    const message = createSystemMessageFromUserEnteredPayload(
      payload,
      currentUserId,
      {
        origin: "realtime",
      },
    );

    if (!message) {
      return;
    }

    dispatch(
      messageReceived({
        roomId: resolveMessageRoomId(payload.room_name, activeRoomId),
        message,
      }),
    );
    playBeep();
  });

  useSocketEvent("LeaveRoom", (payload) => {
    dispatch(
      removeRoomMember({
        roomId: activeRoomId || "general",
        userId: payload.user_uuid,
      }),
    );
  });

  useSocketEvent("FileUploaded", (payload: FileUploadedPayload) => {
    const currentUserId = getPersistentUserId();
    if (payload.user_uuid === currentUserId) return;

    const message = createChatMessageFromFileUploadedPayload(payload, {
      origin: "realtime",
    });

    if (!message) {
      return;
    }

    playBeep();

    dispatch(
      fileMessageReceived({
        roomId: resolveMessageRoomId(payload.room_name, activeRoomId),
        message,
      }),
    );
  });
}
