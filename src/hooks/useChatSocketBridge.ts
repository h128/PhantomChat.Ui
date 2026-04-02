import { useDispatch, useSelector } from "react-redux";
import { useSocketEvent } from "./useSocket";
import { messageReceived, selectActiveRoomId } from "../features/chat/chatSlice";
import { getPersistentUserId } from "../utils/user";
import type { ChatMessage } from "../features/chat/chatSlice";
import type { NewMessagePayload, UserEnteredPayload } from "../services/socket/types";

type BridgeMessageOptions = {
  createId?: () => string;
  getTimestamp?: () => string;
};

export function formatDisplayName(uuid: string) {
  if (!uuid) return "Unknown";
  const segments = uuid.split("_");
  return `User ${segments[1] || uuid.substring(0, 5)}`;
}

function createBridgeMessageAction(
  roomId: string | undefined,
  activeRoomId: string,
  senderId: string,
  senderName: string,
  content: string,
  options: BridgeMessageOptions = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const getTimestamp = options.getTimestamp ?? (() => new Date().toISOString());

  const message: ChatMessage = {
    id: createId(),
    senderId,
    senderName,
    content,
    timestamp: getTimestamp(),
  };

  return messageReceived({
    roomId: roomId || activeRoomId || "general",
    message,
  });
}

export function mapNewMessagePayloadToAction(
  payload: NewMessagePayload,
  activeRoomId: string,
  options: BridgeMessageOptions = {},
) {
  if (payload.message === "__JOIN__") {
    return null;
  }

  return createBridgeMessageAction(
    payload.room_name,
    activeRoomId,
    payload.sender_uuid || "system",
    payload.sender_name || formatDisplayName(payload.sender_uuid),
    payload.message || "",
    options,
  );
}

export function mapUserEnteredPayloadToAction(
  payload: UserEnteredPayload,
  activeRoomId: string,
  currentUserId: string,
  options: BridgeMessageOptions = {},
) {
  if (payload.user_uuid === currentUserId) {
    return null;
  }

  return createBridgeMessageAction(
    payload.room_name,
    activeRoomId,
    "system",
    "System",
    `${formatDisplayName(payload.user_uuid)} entered the room.`,
    options,
  );
}

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);

  useSocketEvent("NewMessageReceived", (payload: NewMessagePayload) => {
    const action = mapNewMessagePayloadToAction(payload, activeRoomId);
    if (action) {
      dispatch(action);
    }
  });

  useSocketEvent("UserEnteredRoom", (payload: UserEnteredPayload) => {
    const currentUserId = getPersistentUserId();
    const action = mapUserEnteredPayloadToAction(
      payload,
      activeRoomId,
      currentUserId,
    );

    if (action) {
      dispatch(action);
    }
  });
}
