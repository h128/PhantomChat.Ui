import { useDispatch, useSelector } from "react-redux";
import {
  fileMessageReceived,
  messageReceived,
  removeRoomMember,
  selectActiveRoomId,
  selectRoomKey,
  upsertRoomMember,
} from "../features/chat/chatSlice";
import {
  createChatMessageFromFileUploadedPayload,
  createChatMessageFromNewMessagePayload,
  createSystemMessageFromUserEnteredPayload,
  resolveIncomingMessageBody,
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
import { decryptMessage, isEncryptedMessageEnvelope } from "../services/crypto";
import { useMessageNotifications } from "./useBrowserNotifications";

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);
  const roomKey = useSelector(selectRoomKey);
  const { notifyIncomingMessage } = useMessageNotifications();

  useSocketEvent("NewMessageReceived", async (payload: NewMessagePayload) => {
    const decryptedBody = await resolveIncomingMessageBody(
      payload.message ?? "",
      roomKey,
      decryptMessage,
      isEncryptedMessageEnvelope,
    );

    const message = createChatMessageFromNewMessagePayload(
      { ...payload, message: decryptedBody },
      { origin: "realtime" },
    );

    if (!message) {
      return;
    }

    const roomId = resolveMessageRoomId(payload.room_name, activeRoomId);

    dispatch(
      messageReceived({
        roomId,
        message,
      }),
    );

    void notifyIncomingMessage(roomId, message);
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

    if (payload.user_uuid === currentUserId) {
      return;
    }

    const message = createChatMessageFromFileUploadedPayload(payload, {
      origin: "realtime",
    });

    if (!message) {
      return;
    }

    const roomId = resolveMessageRoomId(payload.room_name, activeRoomId);

    dispatch(
      fileMessageReceived({
        roomId,
        message,
      }),
    );

    void notifyIncomingMessage(roomId, message);
  });
}
