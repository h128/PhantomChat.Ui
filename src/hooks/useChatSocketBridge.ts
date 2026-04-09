import { useDispatch, useSelector } from "react-redux";
import {
  fileMessageReceived,
  messageReceived,
  removeRoomMember,
  selectActiveRoomId,
  setRoomMembers,
  upsertRoomMember,
} from "../features/chat/chatSlice";
import type { RoomMember } from "../features/chat/chatSlice";
import { useSocketEvent } from "./useSocket";
import {
  deriveDisplayNameFromUserId,
  getPersistentUserId,
} from "../utils/user";
import { generateUUID } from "../utils/uuid";
import type { ChatMessage } from "../features/chat/chatSlice";
import type {
  FileUploadedPayload,
  NewMessagePayload,
  RoomResponse,
  UserEnteredPayload,
} from "../services/socket/types";
import { useNotificationSound } from "./useNotificationSound";

type BridgeMessageOptions = {
  createId?: () => string;
  getTimestamp?: () => string;
};

type BackendRoomMemberPayload = {
  user_uuid: string;
  display_name?: string;
  avatar_id?: number;
};

type NormalizedRoomMemberPayload = {
  userId: string;
  displayName: string;
  avatarId: number | null;
};

export function formatDisplayName(uuid: string) {
  return deriveDisplayNameFromUserId(uuid);
}

function isNormalizedRoomMember(
  payload: BackendRoomMemberPayload | NormalizedRoomMemberPayload,
): payload is NormalizedRoomMemberPayload {
  return (
    "userId" in payload &&
    typeof payload.userId === "string" &&
    typeof payload.displayName === "string" &&
    (typeof payload.avatarId === "number" || payload.avatarId === null)
  );
}

function toRoomMember(
  payload: BackendRoomMemberPayload | NormalizedRoomMemberPayload,
): RoomMember {
  if (isNormalizedRoomMember(payload)) {
    return payload;
  }

  return {
    userId: payload.user_uuid,
    displayName:
      payload.display_name?.trim() ||
      deriveDisplayNameFromUserId(payload.user_uuid),
    avatarId: typeof payload.avatar_id === "number" ? payload.avatar_id : null,
  };
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
    `${payload.display_name?.trim() || formatDisplayName(payload.user_uuid)} entered the room.`,
    options,
  );
}

export function mapRoomMembers(roomId: string, response: RoomResponse) {
  return setRoomMembers({
    roomId,
    members: response.members.map((member) => toRoomMember(member)),
  });
}

export function useChatSocketBridge() {
  const dispatch = useDispatch();
  const activeRoomId = useSelector(selectActiveRoomId);
  const playBeep = useNotificationSound();

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
    playBeep();
  });

  // 4. User Entry Logic
  useSocketEvent("UserEnteredRoom", (payload: UserEnteredPayload) => {
    const currentUserId = getPersistentUserId();

    dispatch(
      upsertRoomMember({
        roomId: payload.room_name || activeRoomId || "general",
        member: toRoomMember(payload),
      }),
    );

    if (payload.user_uuid === currentUserId) return;

    handleIncomingMessage(
      payload.room_name,
      "system",
      "System",
      `${formatDisplayName(payload.user_uuid)} entered the room.`,
    );
    playBeep();
  });

  useSocketEvent("LeaveRoom", (payload) => {
    dispatch(
      removeRoomMember({
        roomId: activeRoomId || "general",
        userId: payload.user_uuid,
      }),
    );
  });

  // 5. File Uploaded Logic
  useSocketEvent("FileUploaded", (payload: FileUploadedPayload) => {
    const currentUserId = getPersistentUserId();
    // Skip files uploaded by the current user (already shown via optimistic update)
    if (payload.user_uuid === currentUserId) return;
    playBeep();
    // Only handle poster files for images (the original) or non-poster for regular files.
    // For images the backend sends two events: one poster=false (thumbnail) and one poster=true (original).
    // We only create a message on the poster=true event (the original), and use the thumbnail filename
    // by deriving it from the original filename (strip "_poster" from the name).
    // For non-image files, poster is always false.

    const fileName = payload.file_name;
    const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);
    const isAudio = /\.(webm|ogg|mp3|m4a|wav)$/i.test(fileName);

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
    } else if (isAudio) {
      const message: ChatMessage = {
        id: generateUUID(),
        senderId: payload.user_uuid,
        senderName: formatDisplayName(payload.user_uuid),
        content: "",
        timestamp: new Date().toISOString(),
        attachment: {
          fileName,
          originalName: fileName,
          type: "audio",
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
