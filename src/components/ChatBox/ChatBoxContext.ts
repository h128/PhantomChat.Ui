import { createContext, useContext } from "react";

interface ChatBoxContextValue {
  isDark: boolean;
}

export const ChatBoxContext = createContext<ChatBoxContextValue>({
  isDark: false,
});

export function useChatBox() {
  return useContext(ChatBoxContext);
}
