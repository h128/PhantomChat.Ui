import { useDispatch } from "react-redux";
import { useSocketEvent } from "./useSocket";
import { messageReceived } from "../features/chat/chatSlice";
import type { ChatMessage } from "../features/chat/chatSlice";

/**
 * Adapter Layer Custom Hook
 * Bridges the purely decoupled WebSocket Service to the Redux Store.
 * Implements strict Clean Architecture boundaries as designed.
 */
export function useChatSocketBridge() {
  const dispatch = useDispatch();

  // 1. Listen to typed events from the highly resilient Domain Service
  useSocketEvent("message_received", (payload: any) => {
    // 2. Map external payload to internal Redux Schema
    const message: ChatMessage = {
      id: crypto.randomUUID(), // Guarantee uniqueness 
      user_uuid: payload.user_uuid || "system",
      text: payload.text || payload.content || "",
      timestamp: Date.now()
    };
    
    // 3. Dispatch to Domain Store, allowing memory caps to engage
    dispatch(messageReceived(message));
  });

  useSocketEvent("user_joined", (_payload: any) => {
    // Example: Dispatch balloon notification action
    // dispatch(addBalloonNotification(`${payload.username} joined`));
  });
}
