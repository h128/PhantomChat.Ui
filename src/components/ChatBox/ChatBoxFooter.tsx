import clsx from "clsx";
import { Mic, Paperclip, Send, Smile, Trash2 } from "lucide-react";
import { Suspense, lazy } from "react";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import type { FileAttachment } from "../../features/chat/chatSlice";
import {
  addMessage,
  fileMessageReceived,
  selectActiveRoomId,
  selectRoomKey,
  setRoomInfo,
} from "../../features/chat/chatSlice";
import { selectProfile } from "../../features/profile/profileSlice";
import { useSocketCommand } from "../../hooks/useSocket";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import {
  encryptFile,
  encryptMessage,
  isEncryptionEnabled,
} from "../../services/crypto";
import {
  createThumbnail,
  isImageFile,
  uploadFile,
} from "../../services/fileUpload";
import { SocketCommands } from "../../services/socket/SocketCommands";
import type { CommandResponse } from "../../services/socket/types";
import { getPersistentUserId } from "../../utils/user";
import { generateUUID } from "../../utils/uuid";
import { useChatBox } from "./ChatBoxContext";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")},${String(centiseconds).padStart(2, "0")}`;
}

async function processFileUpload(
  file: File,
  roomKey: string,
  activeRoomId: string,
  userId: string,
): Promise<FileAttachment> {
  if (isImageFile(file)) {
    const originalFileName = file.name;
    const thumbnailFileName = `thumb_${file.name}`;

    const thumbnailBytes = await createThumbnail(file);
    const originalBytes = new Uint8Array(await file.arrayBuffer());

    const encrypt = isEncryptionEnabled();
    const [processedThumb, processedOriginal] = await Promise.all([
      encrypt ? encryptFile(thumbnailBytes, roomKey) : thumbnailBytes,
      encrypt ? encryptFile(originalBytes, roomKey) : originalBytes,
    ]);

    await Promise.all([
      uploadFile(processedThumb, thumbnailFileName, activeRoomId, userId),
      uploadFile(processedOriginal, originalFileName, activeRoomId, userId),
    ]);

    return {
      fileName: originalFileName,
      originalName: file.name,
      type: "image",
      thumbnailFile: thumbnailFileName,
    };
  }

  const fileName = file.name;
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const processed = isEncryptionEnabled()
    ? await encryptFile(fileBytes, roomKey)
    : fileBytes;
  await uploadFile(processed, fileName, activeRoomId, userId);

  return {
    fileName,
    originalName: file.name,
    type: "file",
  };
}

export function ChatBoxFooter() {
  const { isDark } = useChatBox();
  const [value, setValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const profile = useAppSelector(selectProfile);
  const roomKey = useAppSelector(selectRoomKey);
  const roomStatus = useAppSelector((state) => state.chat.roomStatus);
  const sendCommand = useSocketCommand();

  const isJoined = roomStatus === "joined";

  const handleVoiceUploaded = (fileName: string) => {
    const userId = getPersistentUserId();
    dispatch(
      fileMessageReceived({
        roomId: activeRoomId,
        message: {
          id: generateUUID(),
          senderId: userId,
          senderName: profile.displayName,
          content: "",
          timestamp: new Date().toISOString(),
          attachment: {
            fileName,
            originalName: fileName,
            type: "audio",
          },
        },
      }),
    );
  };

  const voice = useVoiceRecorder({
    roomId: activeRoomId,
    roomKey,
    onUploaded: handleVoiceUploaded,
  });

  const isRecording = voice.state === "recording";
  const isVoiceUploading = voice.state === "uploading";

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || !isJoined) return;

    const userId = getPersistentUserId();

    dispatch(
      addMessage({
        roomId: activeRoomId,
        content: trimmed,
        senderName: profile.displayName,
      }),
    );
    setValue("");
    setShowEmojiPicker(false);

    // 2. Network Sync (Socket) — encrypt body with room key when available.
    let wirePayload = trimmed;
    if (roomKey && roomKey !== "no-key") {
      try {
        wirePayload = await encryptMessage(trimmed, roomKey);
      } catch (err) {
        console.error("Failed to encrypt outgoing message:", err);
        toast.error("Failed to encrypt message. Please try again.");
        return;
      }
    } else {
      console.warn(
        "[ChatBoxFooter] Sending message without encryption (no room key).",
      );
    }

    let response: CommandResponse | undefined;
    try {
      response = (await sendCommand(SocketCommands.SEND_MESSAGE, {
        user_uuid: userId,
        room_name: activeRoomId,
        message: wirePayload,
      })) as CommandResponse;
    } catch (err) {
      console.error("Failed to send socket message:", err);
      toast.error("Failed to send message. Please try again.");
      return;
    }

    const responseMessage = response?.message?.toLowerCase();
    if (
      responseMessage &&
      responseMessage.includes("already in another room")
    ) {
      dispatch(setRoomInfo({ key: "no-key", status: "error" }));
      toast.error("Connection error: already in another room.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomKey) return;

    e.target.value = "";

    const userId = getPersistentUserId();

    setIsUploading(true);

    processFileUpload(file, roomKey, activeRoomId, userId)
      .then((attachment) => {
        dispatch(
          fileMessageReceived({
            roomId: activeRoomId,
            message: {
              id: generateUUID(),
              senderId: userId,
              senderName: profile.displayName,
              content: "",
              timestamp: new Date().toISOString(),
              attachment,
            },
          }),
        );
      })
      .catch((err) => {
        console.error("File upload failed:", err);
        toast.error("File upload failed. Please try again.");
      })
      .then(() => {
        setIsUploading(false);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: { emoji: string }) => {
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
      {showEmojiPicker && !isRecording && (
        <div ref={pickerRef} className="absolute bottom-full left-0 z-10 mb-2">
          <Suspense>
            <EmojiPicker
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              theme={(isDark ? "dark" : "light") as any}
              onEmojiClick={handleEmojiClick}
              searchPlaceholder="Search Emoji"
              width={350}
              height={400}
            />
          </Suspense>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "flex flex-1 items-center gap-2 rounded-2xl border px-4 py-2.5",
            isDark
              ? "border-slate-700 bg-slate-900/80"
              : "border-slate-200 bg-slate-50",
          )}
        >
          {isRecording || isVoiceUploading ? (
            /* ── Recording bar ── */
            <>
              <button
                type="button"
                onClick={voice.cancel}
                disabled={isVoiceUploading}
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition",
                  isVoiceUploading
                    ? "cursor-not-allowed opacity-40"
                    : isDark
                      ? "text-rose-400 hover:text-rose-300"
                      : "text-rose-500 hover:text-rose-600",
                )}
              >
                <Trash2 size={18} />
              </button>

              <div className="flex flex-1 items-center gap-2">
                {isVoiceUploading ? (
                  <span
                    className={clsx(
                      "text-sm",
                      isDark ? "text-slate-400" : "text-slate-500",
                    )}
                  >
                    Sending…
                  </span>
                ) : (
                  <>
                    <span className="animate-pulse text-rose-500">●</span>
                    <span
                      className={clsx(
                        "tabular-nums text-sm",
                        isDark ? "text-slate-200" : "text-slate-700",
                      )}
                    >
                      {formatDuration(voice.elapsedMs)}
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={voice.stopAndSend}
                disabled={isVoiceUploading}
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition",
                  isVoiceUploading && "cursor-not-allowed opacity-40",
                  isDark
                    ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                    : "bg-[#3390ec] text-white hover:bg-[#2b82d9]",
                )}
              >
                <Send size={16} />
              </button>
            </>
          ) : (
            /* ── Normal input bar ── */
            <>
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
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isJoined}
                placeholder={
                  roomStatus === "joining"
                    ? "Joining Room..."
                    : roomStatus === "error"
                      ? "Connection Error"
                      : "Message"
                }
                className={clsx(
                  "flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400",
                  !isJoined && "cursor-not-allowed opacity-50",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              />
              {value.trim() ? (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!isJoined}
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition",
                    !isJoined && "cursor-not-allowed opacity-50",
                    isDark
                      ? "bg-sky-400 text-slate-950 hover:bg-sky-300"
                      : "bg-[#3390ec] text-white hover:bg-[#2b82d9]",
                  )}
                >
                  <Send size={16} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isUploading || !isJoined}
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition",
                      (isUploading || !isJoined) &&
                        "cursor-not-allowed opacity-50",
                      isUploading
                        ? isDark
                          ? "text-slate-600"
                          : "text-slate-300"
                        : isDark
                          ? "text-slate-500 hover:text-slate-300"
                          : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="button"
                    disabled={!isJoined}
                    onClick={voice.startRecording}
                    title="Record voice message"
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-xl transition",
                      !isJoined && "cursor-not-allowed opacity-50",
                      isDark
                        ? "text-slate-500 hover:text-slate-300"
                        : "text-slate-400 hover:text-slate-600",
                    )}
                  >
                    <Mic size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
