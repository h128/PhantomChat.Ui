import clsx from "clsx";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addMessage, selectActiveRoomId } from "../../features/chat/chatSlice";
import { useChatBox } from "./ChatBoxContext";

export function ChatBoxFooter() {
  const { isDark } = useChatBox();
  const [value, setValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    dispatch(addMessage({ roomId: activeRoomId, content: trimmed }));
    setValue("");
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setValue((prev) => prev + emojiData.emoji);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        !toggleRef.current?.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  return (
    <div
      className={clsx(
        "relative border-t px-4 py-3 sm:px-5",
        isDark ? "border-white/8" : "border-slate-200/80",
      )}
    >
      {showEmojiPicker && (
        <div ref={pickerRef} className="absolute bottom-full right-4 z-10 mb-2">
          <EmojiPicker
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={handleEmojiClick}
            searchPlaceholder="Search Emoji"
            width={350}
            height={400}
          />
        </div>
      )}

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
          ref={toggleRef}
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          className={clsx(
            "flex h-8 w-8 items-center justify-center rounded-xl transition",
            showEmojiPicker
              ? isDark
                ? "text-sky-400"
                : "text-[#3390ec]"
              : isDark
                ? "text-slate-500 hover:text-slate-300"
                : "text-slate-400 hover:text-slate-600",
          )}
        >
          <Smile size={18} />
        </button>
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
