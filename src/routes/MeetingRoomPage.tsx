import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { ChatBox } from "../components/ChatBox";
import { ThemeToggle } from "../components/ThemeToggle";
import { setActiveRoom } from "../features/chat/chatSlice";
import { selectResolvedTheme } from "../features/theme/themeSlice";
import { useSocketCommand, useSocketState } from "../hooks/useSocket";
import { SocketCommands } from "../services/socket/SocketCommands";
import { getPersistentUserId } from "../utils/user";

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

export function MeetingRoomPage() {
  const { roomName = "" } = useParams();
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const sendCommand = useSocketCommand();
  const socketState = useSocketState(); // Track connection state

  const isDark = resolvedTheme === "dark";
  const displayRoomName = formatRoomName(roomName) || "Untitled Room";

  const hasJoinedRef = useRef(false);
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  // 1. Immediate sync of activeRoomId and Join Room
  useEffect(() => {
    if (!roomName || socketState !== "connected" || hasJoinedRef.current) return;

    dispatch(setActiveRoom(roomName));
    hasJoinedRef.current = true;

    const joinRoom = async () => {
      try {
        await sendCommandRef.current(SocketCommands.JOIN_OR_MESSAGE, {
          user_uuid: getPersistentUserId(),
          room_name: roomName,
          message: "__JOIN__",
        });
        console.log(`[MeetingRoom] Successfully subscribed to ${roomName}`);
      } catch (err) {
        console.error(`[MeetingRoom] Failed to subscribe to ${roomName}:`, err);
        hasJoinedRef.current = false;
      }
    };

    joinRoom();
  }, [roomName, dispatch, socketState]);

  // 2. Lifecycle adapter: Leave ONLY on actual unmount
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    return () => {
      leaveTimeoutRef.current = setTimeout(() => {
        sendCommandRef.current(SocketCommands.LEAVE_ROOM, {
          room_name: roomName,
        }).catch(() => {});
      }, 100);
    };
  }, [roomName]);

  return (
    <div
      className={clsx(
        "relative isolate flex h-screen flex-col overflow-hidden transition-colors",
        isDark ? "bg-night-950 text-slate-50" : "bg-[#eaf2f9] text-slate-900",
      )}
    >
      <div
        className={clsx(
          "absolute inset-0",
          isDark
            ? "bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_30%),linear-gradient(180deg,#09101d_0%,#0b1120_100%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(51,144,236,0.22),transparent_34%),linear-gradient(180deg,#f7fbff_0%,#eaf2f9_100%)]",
        )}
      />
      <div
        className={clsx(
          "absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96",
          isDark ? "bg-sky-400/12" : "bg-sky-300/20",
        )}
      />

      <div className="relative z-10 flex h-full flex-col px-5 py-5 sm:px-6 sm:py-6">
        <header className="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className={clsx(
              "inline-flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur-md transition-colors",
              isDark
                ? "border-white/10 bg-slate-950/60 shadow-[0_18px_40px_rgba(2,6,23,0.45)]"
                : "border-white/80 bg-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.08)]",
            )}
          >
            <img
              src="/comment.png"
              alt="PhantomChat logo"
              className="h-10 w-10 rounded-2xl object-cover"
            />
            <div className="text-left">
              <p
                className={clsx(
                  "text-sm font-semibold tracking-[0.02em]",
                  isDark ? "text-slate-50" : "text-slate-900",
                )}
              >
                PhantomChat
              </p>
              <p
                className={clsx(
                  "text-xs",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                {displayRoomName}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="mt-5 flex min-h-0 flex-1 flex-col">
          <ChatBox>
            <ChatBox.Title />
            <ChatBox.Body />
            <ChatBox.Footer />
          </ChatBox>
        </main>
      </div>
    </div>
  );
}
