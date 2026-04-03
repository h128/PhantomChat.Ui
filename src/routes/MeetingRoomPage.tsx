import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { ChatBox } from "../components/ChatBox";
import { ThemeToggle } from "../components/ThemeToggle";
import { setActiveRoom, setRoomInfo } from "../features/chat/chatSlice";
import { selectResolvedTheme } from "../features/theme/themeSlice";
import { useSocketCommand, useSocketState } from "../hooks/useSocket";
import { SocketCommands } from "../services/socket/SocketCommands";
import type { CommandResponse } from "../services/socket/types";
import { getPersistentUserId } from "../utils/user";

function normalizeMeetingName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

type SendCommand = ReturnType<typeof useSocketCommand>;
type Dispatch = ReturnType<typeof useAppDispatch>;

async function joinRoom(
  sendCommand: SendCommand,
  dispatch: Dispatch,
  normalizedRoomName: string,
  displayRoomName: string,
  hasJoinedRef: React.MutableRefObject<boolean>,
  retryOnConflict = true,
): Promise<void> {
  try {
    const response = (await sendCommand(SocketCommands.CREATE_ROOM, {
      user_uuid: getPersistentUserId(),
      room_name: normalizedRoomName,
      public_key: "standard-v1-key",
    })) as CommandResponse;

    const status = response.status;
    const roomKey = response.room_key as string | undefined;
    const message = response.message ?? "";

    if (status === 0) {
      dispatch(setRoomInfo({ key: roomKey ?? "no-key", status: "joined" }));

      await sendCommand(SocketCommands.JOIN_OR_MESSAGE, {
        user_uuid: getPersistentUserId(),
        room_name: normalizedRoomName,
        message: "__JOIN__",
      });

      toast.success(`Joined ${displayRoomName}`);
      console.log(`[MeetingRoom] Successfully initialized and joined: ${normalizedRoomName}`);
    } else if (retryOnConflict && message.toLowerCase().includes("already in another room")) {
      console.warn("[MeetingRoom] User already in another room. Forcing leave and retry...");

      await sendCommand(SocketCommands.LEAVE_ROOM, { room_name: normalizedRoomName }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 200));
      return joinRoom(sendCommand, dispatch, normalizedRoomName, displayRoomName, hasJoinedRef, false);
    } else {
      dispatch(setRoomInfo({ key: "no-key", status: "error" }));
      toast.error("Failed to join room. Please try again.");
    }
  } catch (err) {
    console.error(`[MeetingRoom] Failed to initialize ${normalizedRoomName}:`, err);
    dispatch(setRoomInfo({ key: "no-key", status: "error" }));
    toast.error("Failed to initialize room. Please try again.");
    hasJoinedRef.current = false;
  }
}

export function MeetingRoomPage() {
  const { roomName = "" } = useParams();
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const sendCommand = useSocketCommand();
  const socketState = useSocketState(); // Track connection state
  const chatState = useAppSelector((state) => state.chat);

  const isDark = resolvedTheme === "dark";
  const normalizedRoomName = normalizeMeetingName(roomName);
  const displayRoomName = formatRoomName(normalizedRoomName) || "Untitled Room";

  const hasJoinedRef = useRef(false);
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  // 1. Immediate sync of activeRoomId and Join Room
  useEffect(() => {
    if (
      !normalizedRoomName ||
      socketState !== "connected" ||
      hasJoinedRef.current ||
      chatState.roomStatus === "joined" ||
      chatState.roomStatus === "joining"
    )
      return;

    hasJoinedRef.current = true;
    dispatch(setActiveRoom(normalizedRoomName));
    dispatch(setRoomInfo({ key: "no-key", status: "joining" }));
    joinRoom(sendCommandRef.current, dispatch, normalizedRoomName, displayRoomName, hasJoinedRef);
  }, [
    normalizedRoomName,
    displayRoomName,
    dispatch,
    socketState,
    chatState.roomStatus,
    chatState.activeRoomId,
  ]);

  // 2. Lifecycle adapter: Leave ONLY on actual unmount
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    return () => {
      leaveTimeoutRef.current = setTimeout(() => {
        // Clear the global room status ONLY if we are still targeting this room
        // and haven't already moved to a "joining" state for a new room.
        if (chatState.activeRoomId === normalizedRoomName) {
          dispatch(setRoomInfo({ key: "no-key", status: "idle" }));
        }

        sendCommandRef
          .current(SocketCommands.LEAVE_ROOM, {
            room_name: normalizedRoomName,
          })
          .catch(() => {});
      }, 100);
    };
  }, [normalizedRoomName, chatState.activeRoomId, dispatch]);

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
