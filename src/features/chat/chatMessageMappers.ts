import type { ChatMessage, ChatMessageOrigin, RoomMember } from "./chatSlice";
import type {
  FileUploadedPayload,
  NewMessagePayload,
  RoomResponse,
  UserEnteredPayload,
} from "../../services/socket/types";
import { deriveDisplayNameFromUserId } from "../../utils/user";
import { generateUUID } from "../../utils/uuid";

type MessageFactoryOptions = {
  createId?: () => string;
  getTimestamp?: () => string;
  origin?: ChatMessageOrigin;
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

const createDefaultId = () => generateUUID();

function resolveMessageTimestamp(
  timestamp: string | undefined,
  getTimestamp?: () => string,
) {
  return timestamp ?? getTimestamp?.() ?? new Date().toISOString();
}

export function formatDisplayName(uuid?: string | null) {
  return deriveDisplayNameFromUserId(uuid ?? "");
}

export function resolveMessageRoomId(
  roomId: string | undefined,
  activeRoomId: string,
) {
  return roomId || activeRoomId || "general";
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

export function toRoomMember(
  payload: BackendRoomMemberPayload | NormalizedRoomMemberPayload,
): RoomMember {
  if (isNormalizedRoomMember(payload)) {
    return payload;
  }

  return {
    userId: payload.user_uuid,
    displayName:
      payload.display_name?.trim() || formatDisplayName(payload.user_uuid),
    avatarId: typeof payload.avatar_id === "number" ? payload.avatar_id : null,
  };
}

export function mapRoomMembersFromResponse(response: RoomResponse) {
  return response.members.map((member) => toRoomMember(member));
}

export function createChatMessageFromNewMessagePayload(
  payload: NewMessagePayload,
  options: MessageFactoryOptions = {},
): ChatMessage | null {
  if (payload.message === "__JOIN__") {
    return null;
  }

  return {
    id: (options.createId ?? createDefaultId)(),
    senderId: payload.sender_uuid || "system",
    senderName:
      payload.sender_name || formatDisplayName(payload.sender_uuid || ""),
    content: payload.message || "",
    timestamp: resolveMessageTimestamp(payload.timestamp, options.getTimestamp),
    origin: options.origin ?? "realtime",
  };
}

const ENCRYPTED_MESSAGE_PLACEHOLDER = "[encrypted message]";

/**
 * Resolves the plaintext body of an incoming message payload, decrypting it
 * with the supplied room key when the body carries an encryption envelope.
 * Non-envelope values (legacy plaintext, control markers like __JOIN__) pass
 * through untouched so old history keeps rendering.
 *
 * Decryption failures never throw — they return a placeholder and log, so a
 * single bad frame can't take down the chat view.
 */
export async function resolveIncomingMessageBody(
  rawBody: string,
  roomKey: string | null | undefined,
  decryptor: (envelope: string, roomKey: string) => Promise<string>,
  isEnvelope: (value: string) => boolean,
): Promise<string> {
  if (!rawBody || !isEnvelope(rawBody)) {
    return rawBody;
  }
  if (!roomKey || roomKey === "no-key") {
    console.warn(
      "[chatMessageMappers] Received encrypted message without a room key.",
    );
    return ENCRYPTED_MESSAGE_PLACEHOLDER;
  }
  try {
    return await decryptor(rawBody, roomKey);
  } catch (err) {
    console.warn("[chatMessageMappers] Failed to decrypt message:", err);
    return ENCRYPTED_MESSAGE_PLACEHOLDER;
  }
}

export function createSystemMessageFromUserEnteredPayload(
  payload: UserEnteredPayload,
  currentUserId: string,
  options: MessageFactoryOptions = {},
): ChatMessage | null {
  if (payload.user_uuid === currentUserId) {
    return null;
  }

  return {
    id: (options.createId ?? createDefaultId)(),
    senderId: "system",
    senderName: "System",
    content: `${payload.display_name?.trim() || formatDisplayName(payload.user_uuid)} entered the room.`,
    timestamp: resolveMessageTimestamp(payload.timestamp, options.getTimestamp),
    origin: options.origin ?? "realtime",
  };
}

export function createChatMessageFromFileUploadedPayload(
  payload: FileUploadedPayload,
  options: MessageFactoryOptions = {},
): ChatMessage | null {
  const fileName = payload.file_name;
  const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);
  const isAudio = /\.(webm|ogg|mp3|m4a|wav)$/i.test(fileName);

  if (isImage && !payload.poster) {
    return null;
  }

  return {
    id: (options.createId ?? createDefaultId)(),
    senderId: payload.user_uuid,
    senderName: formatDisplayName(payload.user_uuid),
    content: "",
    timestamp: resolveMessageTimestamp(payload.timestamp, options.getTimestamp),
    origin: options.origin ?? "realtime",
    attachment: {
      fileName,
      originalName: fileName,
      type: isImage ? "image" : isAudio ? "audio" : "file",
      ...(isImage ? { thumbnailFile: fileName.replace("_poster", "") } : {}),
    },
  };
}
