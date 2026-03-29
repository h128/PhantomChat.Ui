import { useDispatch, useSelector } from "react-redux";
import { useSocketEvent } from "./useSocket";
import { messageReceived, selectActiveRoomId } from "../features/chat/chatSlice";
import type { ChatMessage } from "../features/chat/chatSlice";

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);

  // 1. Listen to the EXACT event name from the C++ backend
  useSocketEvent("NewMessageReceived", (payload: any) => {
    // 2. Filter out internal signaling messages
    if (payload.message === "__JOIN__") return;

    // 3. Map flat backend payload to internal Redux Schema
    const message: ChatMessage = {
      id: crypto.randomUUID(), 
      senderId: payload.sender_uuid || "system",
      senderName: payload.sender_name || (payload.sender_uuid ? `User ${payload.sender_uuid.substring(0, 4)}` : "Unknown"),
      content: payload.message || "",
      timestamp: new Date().toISOString(),
    };

    // 4. Dispatch to the correct room. Fallback to activeRoomId if room_name is omitted.
    dispatch(messageReceived({ 
      roomId: payload.room_name || activeRoomId || "general", 
      message 
    }));
  });

  useSocketEvent("UserEnteredRoom", (payload: any) => {
    console.log(`[Socket] User ${payload.user_uuid} entered ${payload.room_name}`);
  });
}
