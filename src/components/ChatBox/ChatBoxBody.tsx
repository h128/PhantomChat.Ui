import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useAppSelector } from "../../app/hooks";
import { selectActiveRoomMessages } from "../../features/chat/chatSlice";
import { useChatBox } from "./ChatBoxContext";

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatBoxBody() {
  const { isDark } = useChatBox();
  const messages = useAppSelector(selectActiveRoomMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p
          className={clsx(
            "text-sm",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4 sm:px-5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={clsx(
            "group flex gap-3 rounded-xl px-2 py-2 transition-colors sm:px-3",
            isDark ? "hover:bg-white/4" : "hover:bg-slate-100/60",
          )}
        >
          <div
            className={clsx(
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
              isDark
                ? "bg-sky-400/15 text-sky-300"
                : "bg-[#3390ec]/10 text-[#3390ec]",
            )}
          >
            {msg.senderName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className={clsx(
                  "text-sm font-semibold",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {msg.senderName}
              </span>
              <span
                className={clsx(
                  "text-xs",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <p
              className={clsx(
                "mt-0.5 text-sm leading-relaxed",
                isDark ? "text-slate-300" : "text-slate-600",
              )}
            >
              {msg.content}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
