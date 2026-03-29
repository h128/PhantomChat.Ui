import { useDispatch, useSelector } from "react-redux";
import { useSocketEvent } from "./useSocket";
import { messageReceived, selectActiveRoomId } from "../features/chat/chatSlice";
import { getPersistentUserId } from "../utils/user";
import type { ChatMessage } from "../features/chat/chatSlice";

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);

  // Helper to format consistent display names from persistent IDs
  const formatDisplayName = (uuid: string) => {
    if (!uuid) return "Unknown";
    const segments = uuid.split("_");
    return `User ${segments[1] || uuid.substring(0, 5)}`;
  };

  // 1. Listen to the EXACT event name from the C++ backend
  useSocketEvent("NewMessageReceived", (payload: any) => {
    // 2. Filter out internal signaling messages
    if (payload.message === "__JOIN__") return;

    // 3. Map flat backend payload to internal Redux Schema
    const message: ChatMessage = {
      id: crypto.randomUUID(), 
      senderId: payload.sender_uuid || "system",
      senderName: payload.sender_name || formatDisplayName(payload.sender_uuid),
      content: payload.message || "",
      timestamp: new Date().toISOString(),
    };

    // 4. Dispatch to the correct room
    dispatch(messageReceived({ 
      roomId: payload.room_name || activeRoomId || "general", 
      message 
    }));
  });

  useSocketEvent("UserEnteredRoom", (payload: any) => {
    // 1. Identify the user
    const userDisplayName = formatDisplayName(payload.user_uuid);
    const currentUserId = getPersistentUserId();

    // 2. Ignore self-entry
    if (payload.user_uuid === currentUserId) return;

    // 3. Create a system-level ChatMessage
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: "system",
      senderName: "System",
      content: `${userDisplayName} entered the room.`,
      timestamp: new Date().toISOString(),
    };

    // 4. Dispatch
    dispatch(messageReceived({ 
      roomId: payload.room_name || activeRoomId || "general", 
      message 
    }));
  });
}
