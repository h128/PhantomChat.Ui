import clsx from "clsx";
import {
  ChevronDown,
  LogOut,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Settings,
  User,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { ChatBox } from "../components/ChatBox";
import { InviteOthers } from "../components/InviteOthers";
import { ThemeToggle } from "../components/ThemeToggle";
import { UsersListPanel } from "../components/usersList/usersListPanel";
import {
  setActiveRoom,
  setRoomInfo,
  setRoomMembers,
} from "../features/chat/chatSlice";
import {
  selectIsProfileComplete,
  selectProfile,
} from "../features/profile/profileSlice";
import { selectResolvedTheme } from "../features/theme/themeSlice";
import { useSocketCommand, useSocketState } from "../hooks/useSocket";
import { useWebRTC } from "../hooks/useWebRTC";
import { decryptRoomKey, getPublicKeyHex } from "../services/crypto";
import { SocketCommands } from "../services/socket/SocketCommands";
import type { RoomResponse } from "../services/socket/types";
import {
  deriveDisplayNameFromUserId,
  getPersistentUserId,
} from "../utils/user";

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
  profile: { displayName: string; avatarId: number | null },
  hasJoinedRef: React.MutableRefObject<boolean>,
  retryOnConflict = true,
): Promise<boolean> {
  try {
    const publicKey = await getPublicKeyHex();

    const response = (await sendCommand(SocketCommands.JOIN_OR_CREATE_ROOM, {
      user_uuid: getPersistentUserId(),
      room_name: normalizedRoomName,
      public_key: publicKey,
      avatar_id: profile.avatarId,
      display_name: profile.displayName,
    })) as RoomResponse;

    const status = response.status;
    const message = response.message ?? "";
    const serverPubKey = response.server_pub_key as string | undefined;

    let roomKey = "no-key";
    if (response.room_key) {
      try {
        roomKey = await decryptRoomKey(
          response.room_key as string,
          serverPubKey,
        );
      } catch (err) {
        console.warn("[MeetingRoom] Failed to decrypt room key:", err);
      }
    }

    if (status === 0) {
      dispatch(
        setRoomMembers({
          roomId: normalizedRoomName,
          members: response.members.map((member) => ({
            userId: member.user_uuid,
            displayName:
              member.display_name?.trim() ||
              deriveDisplayNameFromUserId(member.user_uuid),
            avatarId:
              typeof member.avatar_id === "number" ? member.avatar_id : null,
          })),
        }),
      );

      dispatch(setRoomInfo({ key: roomKey, status: "joined" }));

      toast.success(`Joined ${displayRoomName}`);
      console.log(
        `[MeetingRoom] Successfully initialized and joined: ${normalizedRoomName}`,
      );
      return response.room_created;
    } else if (
      retryOnConflict &&
      message.toLowerCase().includes("already in another room")
    ) {
      console.warn(
        "[MeetingRoom] User already in another room. Forcing leave and retry...",
      );

      await sendCommand(SocketCommands.LEAVE_ROOM, {
        room_name: normalizedRoomName,
      }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 200));
      return joinRoom(
        sendCommand,
        dispatch,
        normalizedRoomName,
        displayRoomName,
        profile,
        hasJoinedRef,
        false,
      );
    } else {
      dispatch(setRoomInfo({ key: "no-key", status: "error" }));
      toast.error("Failed to join room. Please try again.");
    }
  } catch (err) {
    console.error(
      `[MeetingRoom] Failed to initialize ${normalizedRoomName}:`,
      err,
    );
    dispatch(setRoomInfo({ key: "no-key", status: "error" }));
    toast.error("Failed to initialize room. Please try again.");
    hasJoinedRef.current = false;
  }
  return false;
}

const RemoteVideo = ({
  stream,
  label,
}: {
  stream: MediaStream;
  label?: string;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();

  // Use state to track track-enablement changes (track objects themselves don't trigger re-renders)
  const [hasVideo, setHasVideo] = useState(
    videoTracks.length > 0 && videoTracks[0].enabled,
  );
  const [hasAudio, setHasAudio] = useState(
    audioTracks.length > 0 && audioTracks[0].enabled,
  );

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }

    // Monitor track enablement because it doesn't trigger standard React cycles
    const interval = setInterval(() => {
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
      setHasAudio(audioTracks.length > 0 && audioTracks[0].enabled);
    }, 500);
    return () => clearInterval(interval);
  }, [stream, videoTracks, audioTracks]);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-800 shadow-inner">
      <video
        ref={ref}
        autoPlay
        playsInline
        className={clsx(
          "absolute inset-0 h-full w-full object-cover",
          !hasVideo && "opacity-0",
        )}
      />

      {!hasVideo && (
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
            {hasAudio ? (
              <Mic size={32} />
            ) : (
              <MicOff size={32} className="text-rose-500" />
            )}
          </div>
          <span className="text-[10px] font-medium text-slate-400">
            {hasAudio ? "Audio Only" : "Muted / No Media"}
          </span>
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
        {!hasAudio && <MicOff size={10} className="text-rose-500" />}
        {label}
      </div>
    </div>
  );
};

export function MeetingRoomPage() {
  const { roomName = "" } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const resolvedTheme = useAppSelector(selectResolvedTheme);
  const profile = useAppSelector(selectProfile);
  const isProfileComplete = useAppSelector(selectIsProfileComplete);
  const sendCommand = useSocketCommand();
  const socketState = useSocketState(); // Track connection state
  const chatState = useAppSelector((state) => state.chat);
  const {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMicrophone,
    toggleCamera,
    switchDevice,
    getDevices,
    localStream,
    remoteStreams,
  } = useWebRTC();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });

  useEffect(() => {
    if (isSettingsOpen) {
      getDevices().then(setAvailableDevices);
    }
  }, [isSettingsOpen, getDevices]);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  const isDark = resolvedTheme === "dark";
  const normalizedRoomName = normalizeMeetingName(roomName);
  const displayRoomName = formatRoomName(normalizedRoomName) || "Untitled Room";

  const hasJoinedRef = useRef(false);
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  useEffect(() => {
    if (!normalizedRoomName || isProfileComplete) {
      return;
    }

    toast.error("Choose a nickname and avatar before joining a room.");
    navigate(`/?room=${encodeURIComponent(normalizedRoomName)}`, {
      replace: true,
    });
  }, [isProfileComplete, navigate, normalizedRoomName]);

  // 1. Immediate sync of activeRoomId and Join Room
  useEffect(() => {
    if (
      !normalizedRoomName ||
      !isProfileComplete ||
      socketState !== "connected" ||
      hasJoinedRef.current ||
      chatState.roomStatus === "joined" ||
      chatState.roomStatus === "joining" ||
      chatState.roomStatus === "error"
    )
      return;

    hasJoinedRef.current = true;
    dispatch(setActiveRoom(normalizedRoomName));
    dispatch(setRoomInfo({ key: "no-key", status: "joining" }));
    joinRoom(
      sendCommandRef.current,
      dispatch,
      normalizedRoomName,
      displayRoomName,
      {
        displayName: profile.displayName.trim(),
        avatarId: profile.avatarId,
      },
      hasJoinedRef,
    ).then((created) => {
      if (created) setIsInviteOpen(true);
    });
  }, [
    normalizedRoomName,
    displayRoomName,
    dispatch,
    isProfileComplete,
    profile.avatarId,
    profile.displayName,
    socketState,
    chatState.roomStatus,
    chatState.activeRoomId,
  ]);

  // Handle Video Streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState.status]);

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

          <div className="flex items-center gap-2">
            {chatState.roomStatus === "joined" &&
              callState.status === "idle" && (
                <>
                  <button
                    onClick={() => startCall("voice")}
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                      isDark
                        ? "bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                        : "bg-sky-100 text-sky-600 hover:bg-sky-200",
                    )}
                    title="Start Voice Call"
                  >
                    <Phone size={20} />
                  </button>
                  <button
                    onClick={() => startCall("video")}
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                      isDark
                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
                    )}
                    title="Start Video Call"
                  >
                    <Video size={20} />
                  </button>
                </>
              )}
            <button
              type="button"
              onClick={() => navigate("/")}
              title="Exit Room"
              className={clsx(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                isDark
                  ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  : "bg-rose-100 text-rose-600 hover:bg-rose-200",
              )}
            >
              <LogOut size={18} />
            </button>
            <ThemeToggle />
          </div>
        </header>

        <main className="mt-5 flex min-h-0 flex-1 flex-row">
          <UsersListPanel />
          <div className="flex flex-col grow">
            <ChatBox>
              <ChatBox.Title />
              <ChatBox.Body />
              <ChatBox.Footer />
            </ChatBox>
          </div>
        </main>
      </div>

      {/* Call Overlay */}
      {callState.status !== "idle" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div
            className={clsx(
              "relative flex w-full max-w-2xl flex-col items-center rounded-3xl border p-8 shadow-2xl",
              isDark
                ? "border-white/10 bg-slate-900"
                : "border-slate-200 bg-white",
            )}
          >
            <div className="mb-6 flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/20 text-sky-500">
                {callState.callType === "video" ? (
                  <Video size={40} />
                ) : (
                  <PhoneCall size={40} />
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {callState.status === "incoming"
                    ? `Incoming ${callState.callType} Call`
                    : callState.status === "calling"
                      ? `Calling (${callState.callType})...`
                      : `Call Connected (${callState.callType})`}
                </h2>
                <p className={isDark ? "text-slate-400" : "text-slate-500"}>
                  {callState.peerId || "Remote Peer"}
                </p>
              </div>
            </div>
            {callState.status === "connected" && (
              <div
                className={clsx(
                  "mb-8 grid w-full gap-4",
                  remoteStreams.size === 0
                    ? "grid-cols-1"
                    : remoteStreams.size === 1
                      ? "grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3",
                )}
              >
                {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
                  <RemoteVideo
                    key={peerId}
                    stream={stream}
                    label={`Remote (${peerId.slice(0, 4)})`}
                  />
                ))}

                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800 shadow-inner">
                  {callState.callType === "video" ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-900">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 text-sky-400">
                        <User size={32} />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Local (You)
                  </div>
                </div>
              </div>
            )}
            {callState.status === "calling" &&
              callState.callType === "video" && (
                <div className="mb-8 flex w-full justify-center">
                  <div className="relative aspect-video w-64 overflow-hidden rounded-xl bg-slate-800 shadow-inner">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                      Preview
                    </div>
                  </div>
                </div>
              )}
            <div className="flex items-center gap-6">
              {callState.status === "incoming" ? (
                <>
                  <button
                    onClick={() => acceptCall()}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110 active:scale-95"
                    title="Accept Call"
                  >
                    {callState.callType === "video" ? (
                      <Video size={24} />
                    ) : (
                      <Mic size={24} />
                    )}
                  </button>
                  <button
                    onClick={rejectCall}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-transform hover:scale-110 active:scale-95"
                    title="Reject Call"
                  >
                    <PhoneOff size={24} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-6">
                  <button
                    onClick={toggleMicrophone}
                    className={clsx(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                      callState.microphoneEnabled
                        ? isDark
                          ? "bg-slate-800 text-slate-200"
                          : "bg-slate-100 text-slate-700"
                        : "bg-rose-500 text-white",
                    )}
                    title={callState.microphoneEnabled ? "Mute" : "Unmute"}
                  >
                    {callState.microphoneEnabled ? (
                      <Mic size={24} />
                    ) : (
                      <MicOff size={24} />
                    )}
                  </button>

                  <button
                    onClick={hangUp}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition-all hover:scale-110 hover:bg-rose-600 active:scale-95"
                    title="End Call"
                  >
                    <PhoneOff size={28} />
                  </button>

                  {callState.callType === "video" && (
                    <button
                      onClick={toggleCamera}
                      className={clsx(
                        "flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                        callState.cameraEnabled
                          ? isDark
                            ? "bg-slate-800 text-slate-200"
                            : "bg-slate-100 text-slate-700"
                          : "bg-rose-500 text-white",
                      )}
                      title={callState.cameraEnabled ? "Turn Off" : "Turn On"}
                    >
                      {callState.cameraEnabled ? (
                        <Video size={24} />
                      ) : (
                        <VideoOff size={24} />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className={clsx(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95",
                      isDark
                        ? "bg-slate-800 text-slate-200"
                        : "bg-slate-100 text-slate-700",
                    )}
                    title="Media Settings"
                  >
                    <Settings size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Media Settings Dialog */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div
            className={clsx(
              "w-full max-w-md rounded-3xl p-8 shadow-2xl transition-all",
              isDark
                ? "bg-slate-900 border border-white/10 text-white"
                : "bg-white text-slate-900",
            )}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Media Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Microphone
                </label>
                <div className="relative group">
                  <select
                    className={clsx(
                      "w-full appearance-none rounded-2xl border-none py-4 pl-5 pr-12 outline-none ring-1 transition-all",
                      isDark
                        ? "bg-slate-800 ring-slate-700 focus:ring-sky-500 text-slate-200"
                        : "bg-slate-50 ring-slate-200 focus:ring-sky-500 text-slate-900",
                    )}
                    value={callState.selectedMicrophoneId || ""}
                    onChange={(e) => switchDevice("audio", e.target.value)}
                  >
                    {availableDevices.audioInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 4)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Camera
                </label>
                <div className="relative group">
                  <select
                    className={clsx(
                      "w-full appearance-none rounded-2xl border-none py-4 pl-5 pr-12 outline-none ring-1 transition-all",
                      isDark
                        ? "bg-slate-800 ring-slate-700 focus:ring-sky-500 text-slate-200"
                        : "bg-slate-50 ring-slate-200 focus:ring-sky-500 text-slate-900",
                    )}
                    value={callState.selectedCameraId || ""}
                    onChange={(e) => switchDevice("video", e.target.value)}
                  >
                    {availableDevices.videoInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 4)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className={clsx(
                  "flex-1 rounded-2xl py-4 font-bold transition-all hover:bg-opacity-80 active:scale-95",
                  isDark
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Done
              </button>
              {callState.status === "idle" && (
                <button
                  onClick={() => {
                    startCall(callState.callType);
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 rounded-2xl bg-sky-500 py-4 font-bold text-white shadow-[0_8px_20px_-4px_rgba(14,165,233,0.4)] transition-all hover:scale-[1.02] hover:bg-sky-600 active:scale-95"
                >
                  Join Call
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Others Popup */}
      {isInviteOpen && chatState.roomStatus === "joined" && (
        <InviteOthers
          roomName={normalizedRoomName}
          onClose={() => setIsInviteOpen(false)}
        />
      )}
    </div>
  );
}
