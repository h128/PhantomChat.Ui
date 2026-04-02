import clsx from "clsx";
import { Download, FileIcon, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "../../app/hooks";
import {
  selectActiveRoomId,
  selectActiveRoomMessages,
  selectRoomKey,
} from "../../features/chat/chatSlice";
import type { FileAttachment } from "../../features/chat/chatSlice";
import { decryptFile } from "../../services/crypto";
import { downloadFile } from "../../services/fileUpload";
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
      .then((encrypted) => decryptFile(encrypted, roomKey))
      .then((decrypted) => {
        if (!cancelled) {
          setThumbUrl(
            URL.createObjectURL(new Blob([new Uint8Array(decrypted)])),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load thumbnail:", err);
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
      .then((encrypted) => decryptFile(encrypted, roomKey))
      .then((decrypted) =>
        URL.createObjectURL(new Blob([new Uint8Array(decrypted)])),
      )
      .catch((err) => {
        console.error("Failed to load full image:", err);
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
      .then((encrypted) => decryptFile(encrypted, roomKey))
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
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const roomKey = useAppSelector(selectRoomKey);
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
    <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5">
      {messages.map((msg) => {
        const isOwn = msg.senderId === "current-user";

        return (
          <div
            key={msg.id}
            className={clsx("flex", isOwn ? "justify-end" : "justify-start")}
          >
            <div
              className={clsx(
                "flex max-w-[75%] gap-3 rounded-2xl px-3.5 py-2.5",
                isOwn
                  ? isDark
                    ? "bg-sky-400/15"
                    : "bg-[#3390ec]/10"
                  : isDark
                    ? "bg-white/5"
                    : "bg-slate-100/80",
              )}
            >
              {!isOwn && (
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
              )}
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
