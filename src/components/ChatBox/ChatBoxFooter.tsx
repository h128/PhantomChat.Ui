import clsx from "clsx";
import { Send } from "lucide-react";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addMessage, selectActiveRoomId } from "../../features/chat/chatSlice";
import { useSocketCommand } from "../../hooks/useSocket";
import { SocketCommands } from "../../services/socket/SocketCommands";
import { useChatBox } from "./ChatBoxContext";

export function ChatBoxFooter() {
  const { isDark } = useChatBox();
  const [value, setValue] = useState("");
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const sendCommand = useSocketCommand();

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // 1. Optimistic Update (Local UI)
    dispatch(addMessage({ roomId: activeRoomId, content: trimmed }));
    setValue("");

    // 2. Network Sync (Socket)
    try {
      await sendCommand(SocketCommands.JOIN_OR_MESSAGE, {
        room_name: activeRoomId,
        message: trimmed,
      });
    } catch (err) {
      console.error("Failed to send socket message:", err);
      // Optional: Add "retry" or "error" state to the message in Redux if needed
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={clsx(
        "border-t px-4 py-3 sm:px-5",
        isDark ? "border-white/8" : "border-slate-200/80",
      )}
    >
      <div
        className={clsx(
          "flex items-center gap-2 rounded-2xl border px-4 py-2.5",
          isDark
            ? "border-slate-700 bg-slate-900/80"
            : "border-slate-200 bg-slate-50",
        )}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className={clsx(
            "flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400",
            isDark ? "text-slate-100" : "text-slate-900",
          )}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim()}
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-xl transition",
            value.trim()
              ? isDark
                ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                : "bg-[#3390ec] text-white hover:bg-[#2b82d9]"
              : isDark
                ? "text-slate-600"
                : "text-slate-300",
          )}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
