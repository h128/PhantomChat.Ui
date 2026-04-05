import clsx from "clsx";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { LogOut, Paperclip, Send, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  addMessage,
  fileMessageReceived,
  selectActiveRoomId,
  selectRoomKey,
  setRoomInfo,
} from "../../features/chat/chatSlice";
import type { FileAttachment } from "../../features/chat/chatSlice";
import { useSocketCommand } from "../../hooks/useSocket";
import { encryptFile, isEncryptionEnabled } from "../../services/crypto";
import type { CommandResponse } from "../../services/socket/types";
import { generateUUID } from "../../utils/uuid";
import {
  createThumbnail,
  generateFileName,
  getExtension,
  isImageFile,
  uploadFile,
} from "../../services/fileUpload";
import { SocketCommands } from "../../services/socket/SocketCommands";
import { getPersistentUserId, getPersistentUserName } from "../../utils/user";
import { useChatBox } from "./ChatBoxContext";

async function processFileUpload(
  file: File,
  roomKey: string,
  activeRoomId: string,
  userId: string,
): Promise<FileAttachment> {
  const ext = getExtension(file.name);

  if (isImageFile(file)) {
    const thumbnailFileName = generateFileName(userId, ext, false);
    const originalFileName = generateFileName(userId, ext, true);

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

  const fileName = generateFileName(userId, ext, false);
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
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const roomKey = useAppSelector(selectRoomKey);
  const roomStatus = useAppSelector((state) => state.chat.roomStatus);
  const sendCommand = useSocketCommand();

  const isJoined = roomStatus === "joined";

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || !isJoined) return;

    const userId = getPersistentUserId();

    // 1. Optimistic Update (Local UI)
    dispatch(addMessage({ roomId: activeRoomId, content: trimmed }));
    setValue("");
    setShowEmojiPicker(false);

    // 2. Network Sync (Socket)
    let response: CommandResponse | undefined;
    try {
      response = (await sendCommand(SocketCommands.JOIN_OR_MESSAGE, {
        user_uuid: userId,
        room_name: activeRoomId,
        message: trimmed,
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
              senderName: getPersistentUserName(),
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
        <div ref={pickerRef} className="absolute bottom-full left-0 z-10 mb-2">
          <EmojiPicker
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={handleEmojiClick}
            searchPlaceholder="Search Emoji"
            width={350}
            height={400}
          />
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
            <button
              type="button"
              disabled={isUploading || !isJoined}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-xl transition",
                (isUploading || !isJoined) && "cursor-not-allowed opacity-50",
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
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate("/")}
          title="Exit Room"
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
            isDark
              ? "text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
              : "text-slate-400 hover:bg-rose-50 hover:text-rose-500",
          )}
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}
