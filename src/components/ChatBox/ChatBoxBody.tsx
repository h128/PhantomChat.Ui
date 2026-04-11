import clsx from "clsx";
import { Download, FileIcon, Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "../../app/hooks";
import { UserAvatar } from "../../components/UserAvatar";
import {
  selectActiveRoomHistory,
  selectActiveRoomId,
  selectActiveRoomMessages,
  selectActiveRoomMembers,
  selectRoomKey,
} from "../../features/chat/chatSlice";
import { selectProfile } from "../../features/profile/profileSlice";
import type { FileAttachment } from "../../features/chat/chatSlice";
import { decryptFile, isEncryptionEnabled } from "../../services/crypto";
import { downloadFile } from "../../services/fileUpload";
import {
  deriveDisplayNameFromUserId,
  getPersistentUserId,
} from "../../utils/user";
import { useChatBox } from "./ChatBoxContext";

function formatTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ImageAttachment({
  attachment,
  roomName,
  roomKey,
  isDark,
}: {
  attachment: FileAttachment;
  roomName: string;
  roomKey: string;
  isDark: boolean;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);

  // Load thumbnail on mount
  useEffect(() => {
    let cancelled = false;
    const thumbName = attachment.thumbnailFile
      ? attachment.thumbnailFile
      : attachment.fileName;
    downloadFile(roomName, thumbName)
      .then((data) =>
        isEncryptionEnabled() ? decryptFile(data, roomKey) : data,
      )
      .then((decrypted) => {
        if (!cancelled) {
          setThumbUrl(
            URL.createObjectURL(new Blob([new Uint8Array(decrypted)])),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load thumbnail:", err);
        toast.error("Failed to load image preview.");
      });
    return () => {
      cancelled = true;
    };
  }, [attachment, roomName, roomKey]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      if (fullUrl) URL.revokeObjectURL(fullUrl);
    };
  }, [thumbUrl, fullUrl]);

  const handleClick = useCallback(async () => {
    setShowLightbox(true);
    if (fullUrl) return;

    setLoadingFull(true);
    const result = await downloadFile(roomName, attachment.fileName)
      .then((data) =>
        isEncryptionEnabled() ? decryptFile(data, roomKey) : data,
      )
      .then((decrypted) =>
        URL.createObjectURL(new Blob([new Uint8Array(decrypted)])),
      )
      .catch((err) => {
        console.error("Failed to load full image:", err);
        toast.error("Failed to load full image.");
        return null;
      });
    if (result) setFullUrl(result);
    setLoadingFull(false);
  }, [fullUrl, roomName, attachment.fileName, roomKey]);

  return (
    <>
      <div className="mt-1.5 cursor-pointer" onClick={handleClick}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={attachment.originalName}
            className="max-w-50 rounded-lg"
          />
        ) : (
          <div
            className={clsx(
              "flex h-24 w-36 items-center justify-center rounded-lg text-xs",
              isDark
                ? "bg-white/5 text-slate-500"
                : "bg-slate-100 text-slate-400",
            )}
          >
            Loading...
          </div>
        )}
      </div>

      {showLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            onClick={() => setShowLightbox(false)}
          >
            <X size={20} />
          </button>
          {loadingFull ? (
            <div className="text-sm text-white">Loading full image...</div>
          ) : fullUrl ? (
            <img
              src={fullUrl}
              alt={attachment.originalName}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
        </div>
      )}
    </>
  );
}

async function downloadVoiceMessage(
  roomName: string,
  fileName: string,
  roomKey: string,
) {
  const { decryptFile, isEncryptionEnabled } =
    await import("../../services/crypto");
  const { downloadFile } = await import("../../services/fileUpload");
  const data = await downloadFile(roomName, fileName);
  const decrypted = isEncryptionEnabled()
    ? await decryptFile(data, roomKey)
    : data;
  return URL.createObjectURL(new Blob([new Uint8Array(decrypted)]));
}

function VoiceMessagePlayer({
  attachment,
  roomName,
  roomKey,
  isDark,
}: {
  attachment: FileAttachment;
  roomName: string;
  roomKey: string;
  isDark: boolean;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingPlayRef = useRef(false);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // When audioUrl is set and a play was pending, play immediately
  useEffect(() => {
    if (audioUrl && pendingPlayRef.current) {
      pendingPlayRef.current = false;
      audioRef.current?.play().catch(() => {});
    }
  }, [audioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (isPlaying && audio) {
      audio.pause();
      return;
    }

    if (audioUrl && audio) {
      audio.play().catch(() => {});
      return;
    }

    // Need to download first — mark pending so the useEffect above plays it
    if (isLoading) return;
    pendingPlayRef.current = true;
    setIsLoading(true);
    try {
      const url = await downloadVoiceMessage(
        roomName,
        attachment.fileName,
        roomKey,
      );
      setAudioUrl(url);
      setIsLoading(false);
    } catch (err) {
      console.error("Failed to load voice message:", err);
      toast.error("Failed to load voice message.");
      pendingPlayRef.current = false;
      setIsLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (!isFinite(audio.duration)) {
      // WebM blobs from MediaRecorder lack duration in the header;
      // seeking to a large value forces the browser to scan the file and update duration.
      audio.currentTime = 1e9;
    } else {
      setDuration(audio.duration);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setCurrentTime(audio.currentTime);
    // After the seek trick, duration becomes finite — capture it and reset position
    if (!isFinite(duration) || duration === 0) {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        audio.currentTime = 0;
      }
    }
  };

  const displayDuration =
    duration > 0 && isFinite(duration) ? formatTime(duration) : "…";

  return (
    <div
      className={clsx(
        "mt-1.5 flex items-center gap-2.5 rounded-xl border px-3 py-2",
        isDark ? "border-white/8 bg-white/5" : "border-slate-200 bg-slate-50",
      )}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        />
      )}
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition",
          isDark
            ? "bg-sky-400/20 text-sky-300 hover:bg-sky-400/30"
            : "bg-[#3390ec]/15 text-[#3390ec] hover:bg-[#3390ec]/25",
          isLoading && "cursor-wait opacity-60",
        )}
      >
        {isLoading ? (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause size={14} />
        ) : (
          <Play size={14} />
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1 min-w-0">
        <div
          className={clsx(
            "h-1 w-full rounded-full overflow-hidden",
            isDark ? "bg-white/10" : "bg-slate-200",
          )}
        >
          <div
            className={clsx(
              "h-full rounded-full transition-all",
              isDark ? "bg-sky-400" : "bg-[#3390ec]",
            )}
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            }}
          />
        </div>
        <span
          className={clsx(
            "text-xs tabular-nums",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          {formatTime(currentTime)} / {displayDuration}
        </span>
      </div>
    </div>
  );
}

function FileAttachmentCard({
  attachment,
  roomName,
  roomKey,
  isDark,
}: {
  attachment: FileAttachment;
  roomName: string;
  roomKey: string;
  isDark: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    await downloadFile(roomName, attachment.fileName)
      .then((data) =>
        isEncryptionEnabled() ? decryptFile(data, roomKey) : data,
      )
      .then((decrypted) => {
        const url = URL.createObjectURL(new Blob([new Uint8Array(decrypted)]));
        const a = document.createElement("a");
        a.href = url;
        a.download = attachment.originalName;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("Failed to download file:", err);
        toast.error("Failed to download file.");
      });
    setDownloading(false);
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={clsx(
        "mt-1.5 flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition",
        isDark
          ? "border-white/8 bg-white/5 hover:bg-white/8"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100",
      )}
    >
      <FileIcon
        size={20}
        className={isDark ? "text-sky-400" : "text-[#3390ec]"}
      />
      <span
        className={clsx(
          "flex-1 truncate text-sm",
          isDark ? "text-slate-200" : "text-slate-700",
        )}
      >
        {attachment.originalName}
      </span>
      <Download
        size={16}
        className={clsx(
          "shrink-0",
          downloading
            ? "animate-pulse text-slate-400"
            : isDark
              ? "text-slate-400"
              : "text-slate-500",
        )}
      />
    </button>
  );
}

export function ChatBoxBody() {
  const { isDark } = useChatBox();
  const messages = useAppSelector(selectActiveRoomMessages);
  const historyState = useAppSelector(selectActiveRoomHistory);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const roomMembers = useAppSelector(selectActiveRoomMembers);
  const profile = useAppSelector(selectProfile);
  const roomKey = useAppSelector(selectRoomKey);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const showLoadingBanner = historyState.status === "loading";
  const showHistoryError = historyState.status === "error";

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        {showLoadingBanner && (
          <div
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              isDark ? "bg-sky-400/10 text-sky-300" : "bg-sky-100 text-sky-700",
            )}
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-current" />
            Loading room history...
          </div>
        )}
        <p
          className={clsx(
            "text-sm",
            isDark ? "text-slate-500" : "text-slate-400",
          )}
        >
          {showLoadingBanner
            ? "Messages will appear here as history finishes loading."
            : "No messages yet. Start the conversation!"}
        </p>
        {showHistoryError && (
          <p
            className={clsx(
              "text-xs",
              isDark ? "text-amber-300" : "text-amber-700",
            )}
          >
            Previous history is unavailable right now. Live chat is still
            active.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
      {(showLoadingBanner || showHistoryError) && (
        <div className="flex justify-center pb-1">
          <div
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium",
              showLoadingBanner
                ? isDark
                  ? "bg-sky-400/10 text-sky-300"
                  : "bg-sky-100 text-sky-700"
                : isDark
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-amber-100 text-amber-700",
            )}
          >
            {showLoadingBanner
              ? "Loading earlier messages..."
              : "History unavailable. Live chat is still active."}
          </div>
        </div>
      )}
      {messages.map((msg) => {
        const isOwn = msg.senderId === getPersistentUserId();
        const roomMember = roomMembers[msg.senderId];
        const resolvedDisplayName = isOwn
          ? profile.displayName || roomMember?.displayName || msg.senderName
          : roomMember?.displayName ||
            msg.senderName ||
            deriveDisplayNameFromUserId(msg.senderId);
        const resolvedAvatarId = isOwn
          ? (profile.avatarId ?? roomMember?.avatarId ?? null)
          : (roomMember?.avatarId ?? null);

        return (
          <div
            key={msg.id}
            className={clsx("flex", isOwn ? "justify-end" : "justify-start")}
          >
            <div
              className={clsx(
                "flex max-w-[75%] gap-3 rounded-2xl px-3.5 py-2.5",
                isOwn && "flex-row-reverse",
                isOwn
                  ? isDark
                    ? "bg-sky-400/15"
                    : "bg-[#3390ec]/10"
                  : isDark
                    ? "bg-white/5"
                    : "bg-slate-100/80",
              )}
            >
              <UserAvatar
                avatarId={resolvedAvatarId}
                displayName={resolvedDisplayName}
                isDark={isDark}
                className="mt-0.5 h-9 w-9 shrink-0"
              />
              <div className="min-w-0">
                <div
                  className={clsx(
                    "flex items-baseline gap-2",
                    isOwn && "justify-end",
                  )}
                >
                  <span
                    className={clsx(
                      "text-sm font-semibold",
                      isOwn
                        ? isDark
                          ? "text-sky-300"
                          : "text-[#3390ec]"
                        : isDark
                          ? "text-slate-100"
                          : "text-slate-900",
                    )}
                  >
                    {resolvedDisplayName}
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
                {msg.content && (
                  <p
                    className={clsx(
                      "mt-0.5 text-sm leading-relaxed",
                      isOwn
                        ? isDark
                          ? "text-slate-200"
                          : "text-slate-700"
                        : isDark
                          ? "text-slate-300"
                          : "text-slate-600",
                    )}
                  >
                    {msg.content}
                  </p>
                )}
                {msg.attachment &&
                  roomKey &&
                  (msg.attachment.type === "image" ? (
                    <ImageAttachment
                      attachment={msg.attachment}
                      roomName={activeRoomId}
                      roomKey={roomKey}
                      isDark={isDark}
                    />
                  ) : msg.attachment.type === "audio" ? (
                    <VoiceMessagePlayer
                      attachment={msg.attachment}
                      roomName={activeRoomId}
                      roomKey={roomKey}
                      isDark={isDark}
                    />
                  ) : (
                    <FileAttachmentCard
                      attachment={msg.attachment}
                      roomName={activeRoomId}
                      roomKey={roomKey}
                      isDark={isDark}
                    />
                  ))}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
