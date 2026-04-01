import { useDispatch, useSelector } from "react-redux";
import { useSocketEvent } from "./useSocket";
import { messageReceived, selectActiveRoomId } from "../features/chat/chatSlice";
import { getPersistentUserId } from "../utils/user";
import type { ChatMessage } from "../features/chat/chatSlice";
import type { NewMessagePayload, UserEnteredPayload } from "../services/socket/types";

// 1. Move helpers outside hook to prevent re-creation
const formatDisplayName = (uuid: string) => {
  if (!uuid) return "Unknown";
  const segments = uuid.split("_");
  return `User ${segments[1] || uuid.substring(0, 5)}`;
};

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);

  // 2. Consolidated Message Handler
  const handleIncomingMessage = (
    roomId: string | undefined, 
    senderId: string, 
    senderName: string, 
    content: string
  ) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(), 
      senderId,
      senderName,
      content,
      timestamp: new Date().toISOString(),
    };

    dispatch(messageReceived({ 
      roomId: roomId || activeRoomId || "general", 
      message 
    }));
  };

  // 3. New Message Logic
  useSocketEvent("NewMessageReceived", (payload: NewMessagePayload) => {
    if (payload.message === "__JOIN__") return;

    handleIncomingMessage(
      payload.room_name,
      payload.sender_uuid || "system",
      payload.sender_name || formatDisplayName(payload.sender_uuid),
      payload.message || ""
    );
  });

  // 4. User Entry Logic
  useSocketEvent("UserEnteredRoom", (payload: UserEnteredPayload) => {
    const currentUserId = getPersistentUserId();
    if (payload.user_uuid === currentUserId) return;

    handleIncomingMessage(
      payload.room_name,
      "system",
      "System",
      `${formatDisplayName(payload.user_uuid)} entered the room.`
    );
  });
}
