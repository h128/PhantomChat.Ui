import { useDispatch, useSelector } from "react-redux";
import { useSocketEvent } from "./useSocket";
import {
  fileMessageReceived,
  messageReceived,
  selectActiveRoomId,
} from "../features/chat/chatSlice";
import { getPersistentUserId } from "../utils/user";
import { generateUUID } from "../utils/uuid";
import type { ChatMessage } from "../features/chat/chatSlice";
import type {
  FileUploadedPayload,
  NewMessagePayload,
  UserEnteredPayload,
} from "../services/socket/types";

type BridgeMessageOptions = {
  createId?: () => string;
  getTimestamp?: () => string;
};

export function formatDisplayName(uuid: string) {
  if (!uuid) return "Unknown";
  const segments = uuid.split("_");
  return `User ${segments[1] || uuid.substring(0, 5)}`;
}

function createBridgeMessageAction(
  roomId: string | undefined,
  activeRoomId: string,
  senderId: string,
  senderName: string,
  content: string,
  options: BridgeMessageOptions = {},
) {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const getTimestamp = options.getTimestamp ?? (() => new Date().toISOString());

  const message: ChatMessage = {
    id: createId(),
    senderId,
    senderName,
    content,
    timestamp: getTimestamp(),
  };

  return messageReceived({
    roomId: roomId || activeRoomId || "general",
    message,
  });
}

export function mapNewMessagePayloadToAction(
  payload: NewMessagePayload,
  activeRoomId: string,
  options: BridgeMessageOptions = {},
) {
  if (payload.message === "__JOIN__") {
    return null;
  }

  return createBridgeMessageAction(
    payload.room_name,
    activeRoomId,
    payload.sender_uuid || "system",
    payload.sender_name || formatDisplayName(payload.sender_uuid),
    payload.message || "",
    options,
  );
}

export function mapUserEnteredPayloadToAction(
  payload: UserEnteredPayload,
  activeRoomId: string,
  currentUserId: string,
  options: BridgeMessageOptions = {},
) {
  if (payload.user_uuid === currentUserId) {
    return null;
  }

  return createBridgeMessageAction(
    payload.room_name,
    activeRoomId,
    "system",
    "System",
    `${formatDisplayName(payload.user_uuid)} entered the room.`,
    options,
  );
}

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);

  // 2. Consolidated Message Handler
  const handleIncomingMessage = (
    roomId: string | undefined,
    senderId: string,
    senderName: string,
    content: string,
  ) => {
    const message: ChatMessage = {
      id: generateUUID(),
      senderId,
      senderName,
      content,
      timestamp: new Date().toISOString(),
    };

    dispatch(
      messageReceived({
        roomId: roomId || activeRoomId || "general",
        message,
      }),
    );
  };

  // 3. New Message Logic
  useSocketEvent("NewMessageReceived", (payload: NewMessagePayload) => {
    if (payload.message === "__JOIN__") return;

    handleIncomingMessage(
      payload.room_name,
      payload.sender_uuid || "system",
      payload.sender_name || formatDisplayName(payload.sender_uuid),
      payload.message || "",
    );
  });

  // 4. User Entry Logic
  useSocketEvent("UserEnteredRoom", (payload: UserEnteredPayload) => {
    const currentUserId = getPersistentUserId();
    if (payload.user_uuid === currentUserId) return;

    handleIncomingMessage(
      payload.room_name,
      "system",
      "System",
      `${formatDisplayName(payload.user_uuid)} entered the room.`,
    );
  });

  // 5. File Uploaded Logic
  useSocketEvent("FileUploaded", (payload: FileUploadedPayload) => {
    const currentUserId = getPersistentUserId();
    // Skip files uploaded by the current user (already shown via optimistic update)
    if (payload.user_uuid === currentUserId) return;
    // Only handle poster files for images (the original) or non-poster for regular files.
    // For images the backend sends two events: one poster=false (thumbnail) and one poster=true (original).
    // We only create a message on the poster=true event (the original), and use the thumbnail filename
    // by deriving it from the original filename (strip "_poster" from the name).
    // For non-image files, poster is always false.

    const fileName = payload.file_name;
    const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);

    if (isImage) {
      // Only react to the poster (original) event to avoid duplicate messages
      if (!payload.poster) return;

      const thumbnailFile = fileName.replace("_poster", "");
      const message: ChatMessage = {
        id: generateUUID(),
        senderId: payload.user_uuid,
        senderName: formatDisplayName(payload.user_uuid),
        content: "",
        timestamp: new Date().toISOString(),
        attachment: {
          fileName,
          originalName: fileName,
          type: "image",
          thumbnailFile,
        },
      };
      dispatch(
        fileMessageReceived({
          roomId: activeRoomId || "general",
          message,
        }),
      );
    } else {
      const message: ChatMessage = {
        id: generateUUID(),
        senderId: payload.user_uuid,
        senderName: formatDisplayName(payload.user_uuid),
        content: "",
        timestamp: new Date().toISOString(),
        attachment: {
          fileName,
          originalName: fileName,
          type: "file",
        },
      };
      dispatch(
        fileMessageReceived({
          roomId: activeRoomId || "general",
          message,
        }),
      );
    }
  });
}
