import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import { getPersistentUserId } from "../../utils/user";
import type { RootState } from "../../app/store";

export type PresenceMode = "focused" | "available" | "quiet";

export interface Room {
  id: string;
  name: string;
  topic: string;
  members: number;
  unread: number;
}

export interface FileAttachment {
  fileName: string;
  originalName: string;
  type: "image" | "file" | "audio";
  thumbnailFile?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  attachment?: FileAttachment;
  origin?: ChatMessageOrigin;
}

export type ChatMessageOrigin = "history" | "optimistic" | "realtime";

export interface CallState {
  status: "idle" | "calling" | "incoming" | "connected";
  peerId: string | null;
  isIncoming: boolean;
  callType: "video" | "voice";
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  selectedMicrophoneId: string | null;
  selectedCameraId: string | null;
  offer?: RTCSessionDescriptionInit;
}

export type RoomMember = {
  userId: string;
  displayName: string;
  avatarId: number | null;
};

interface ChatState {
  presenceMode: PresenceMode;
  activeRoomId: string;
  rooms: Room[];
  messages: Record<string, ChatMessage[]>;
  historyByRoom: Record<string, RoomHistoryState>;
  membersByRoom: Record<string, Record<string, RoomMember>>;
  roomKey: string | null;
  roomStatus: "idle" | "joining" | "joined" | "error";
  callState: CallState;
}

export type RoomHistoryState = {
  status: "idle" | "loading" | "loaded" | "error";
  error: string | null;
  lastLoadedAt: string | null;
};

const presenceOrder: PresenceMode[] = ["focused", "available", "quiet"];

export const presenceLabels: Record<PresenceMode, string> = {
  focused: "Focused",
  available: "Available",
  quiet: "Quiet Hours",
};

function formatRoomName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
    .join(" ");
}

function syncRoomSummary(state: ChatState, roomId: string) {
  const memberCount = Object.keys(state.membersByRoom[roomId] ?? {}).length;
  const existingRoom = state.rooms.find((room) => room.id === roomId);

  if (existingRoom) {
    existingRoom.members = memberCount;
    existingRoom.name = formatRoomName(roomId) || "Untitled Room";
    return;
  }

  state.rooms.push({
    id: roomId,
    name: formatRoomName(roomId) || "Untitled Room",
    topic: "Secure room chat",
    members: memberCount,
    unread: 0,
  });
}

const emptyRoomHistoryState: RoomHistoryState = {
  status: "idle",
  error: null,
  lastLoadedAt: null,
};

function ensureRoomHistoryState(state: ChatState, roomId: string) {
  if (!state.historyByRoom[roomId]) {
    state.historyByRoom[roomId] = { ...emptyRoomHistoryState };
  }

  return state.historyByRoom[roomId];
}

function getAttachmentFingerprint(attachment?: FileAttachment) {
  if (!attachment) {
    return "";
  }

  return [
    attachment.type,
    attachment.fileName,
    attachment.originalName,
    attachment.thumbnailFile ?? "",
  ].join("|");
}

function getTimestampValue(timestamp: string) {
  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function areMessagesEquivalent(left: ChatMessage, right: ChatMessage) {
  return (
    left.senderId === right.senderId &&
    left.content === right.content &&
    left.timestamp === right.timestamp &&
    getAttachmentFingerprint(left.attachment) ===
      getAttachmentFingerprint(right.attachment)
  );
}

function isOptimisticEchoMatch(existing: ChatMessage, incoming: ChatMessage) {
  if (existing.origin !== "optimistic" || incoming.origin !== "realtime") {
    return false;
  }

  if (
    existing.senderId !== incoming.senderId ||
    existing.content !== incoming.content ||
    getAttachmentFingerprint(existing.attachment) !==
      getAttachmentFingerprint(incoming.attachment)
  ) {
    return false;
  }

  const existingTimestamp = Date.parse(existing.timestamp);
  const incomingTimestamp = Date.parse(incoming.timestamp);

  if (Number.isNaN(existingTimestamp) || Number.isNaN(incomingTimestamp)) {
    return false;
  }

  return Math.abs(existingTimestamp - incomingTimestamp) <= 15000;
}

function sortRoomMessages(messages: ChatMessage[]) {
  messages.sort((left, right) => {
    const delta = getTimestampValue(left.timestamp) - getTimestampValue(right.timestamp);
    return delta === 0 ? 0 : delta;
  });
}

function mergeRoomMessages(
  state: ChatState,
  roomId: string,
  incomingMessages: ChatMessage[],
) {
  if (!state.messages[roomId]) {
    state.messages[roomId] = [];
  }

  const roomMessages = state.messages[roomId];
  let didChange = false;

  for (const incomingMessage of incomingMessages) {
    const exactMatch = roomMessages.find((message) =>
      areMessagesEquivalent(message, incomingMessage),
    );

    if (exactMatch) {
      if (exactMatch.origin === "history" && incomingMessage.origin === "realtime") {
        exactMatch.origin = "realtime";
      }
      continue;
    }

    const optimisticEchoIndex = roomMessages.findIndex((message) =>
      isOptimisticEchoMatch(message, incomingMessage),
    );

    if (optimisticEchoIndex >= 0) {
      roomMessages[optimisticEchoIndex] = {
        ...roomMessages[optimisticEchoIndex],
        ...incomingMessage,
        id: roomMessages[optimisticEchoIndex].id,
        origin: "realtime",
      };
      didChange = true;
      continue;
    }

    roomMessages.push(incomingMessage);
    didChange = true;
  }

  if (didChange) {
    sortRoomMessages(roomMessages);
  }

  syncRoomSummary(state, roomId);
}

const initialState: ChatState = {
  presenceMode: "focused",
  activeRoomId: "launch-pad",
  rooms: [],
  messages: {},
  historyByRoom: {},
  membersByRoom: {},
  roomKey: null,
  roomStatus: "idle",
  callState: {
    status: "idle",
    peerId: null,
    isIncoming: false,
    callType: "video",
    microphoneEnabled: true,
    cameraEnabled: true,
    selectedMicrophoneId: null,
    selectedCameraId: null,
  },
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    cyclePresenceMode(state) {
      const currentIndex = presenceOrder.indexOf(state.presenceMode);
      state.presenceMode =
        presenceOrder[(currentIndex + 1) % presenceOrder.length];
    },
    setActiveRoom(state, action: PayloadAction<string>) {
      state.activeRoomId = action.payload;
      syncRoomSummary(state, action.payload);
      ensureRoomHistoryState(state, action.payload);
    },
    markRoomRead(state, action: PayloadAction<string>) {
      const room = state.rooms.find((entry) => entry.id === action.payload);

      if (room) {
        room.unread = 0;
      }
    },
    setRoomInfo(
      state,
      action: PayloadAction<{ key: string; status: ChatState["roomStatus"] }>,
    ) {
      state.roomKey = action.payload.key;
      state.roomStatus = action.payload.status;
    },
    setRoomMembers(
      state,
      action: PayloadAction<{ roomId: string; members: RoomMember[] }>,
    ) {
      state.membersByRoom[action.payload.roomId] = Object.fromEntries(
        action.payload.members.map((member) => [member.userId, member]),
      );
      syncRoomSummary(state, action.payload.roomId);
    },
    startRoomHistoryLoad(state, action: PayloadAction<{ roomId: string }>) {
      const historyState = ensureRoomHistoryState(state, action.payload.roomId);
      historyState.status = "loading";
      historyState.error = null;
    },
    completeRoomHistoryLoad(
      state,
      action: PayloadAction<{
        roomId: string;
        messages: ChatMessage[];
        loadedAt: string;
      }>,
    ) {
      mergeRoomMessages(state, action.payload.roomId, action.payload.messages);

      const historyState = ensureRoomHistoryState(state, action.payload.roomId);
      historyState.status = "loaded";
      historyState.error = null;
      historyState.lastLoadedAt = action.payload.loadedAt;
    },
    failRoomHistoryLoad(
      state,
      action: PayloadAction<{ roomId: string; error: string }>,
    ) {
      const historyState = ensureRoomHistoryState(state, action.payload.roomId);
      historyState.status = "error";
      historyState.error = action.payload.error;
    },
    upsertRoomMember(
      state,
      action: PayloadAction<{ roomId: string; member: RoomMember }>,
    ) {
      if (!state.membersByRoom[action.payload.roomId]) {
        state.membersByRoom[action.payload.roomId] = {};
      }

      state.membersByRoom[action.payload.roomId][action.payload.member.userId] =
        action.payload.member;
      syncRoomSummary(state, action.payload.roomId);
    },
    removeRoomMember(
      state,
      action: PayloadAction<{ roomId: string; userId: string }>,
    ) {
      delete state.membersByRoom[action.payload.roomId]?.[
        action.payload.userId
      ];
      syncRoomSummary(state, action.payload.roomId);
    },
    addMessage: {
      reducer(
        state,
        action: PayloadAction<{ roomId: string; message: ChatMessage }>,
      ) {
        const { roomId, message } = action.payload;
        if (!state.messages[roomId]) {
          state.messages[roomId] = [];
        }
        state.messages[roomId].push(message);
        syncRoomSummary(state, roomId);
      },
      prepare(payload: {
        roomId: string;
        content: string;
        senderName: string;
      }) {
        const message: ChatMessage = {
          id: nanoid(),
          senderId: getPersistentUserId(),
          senderName: payload.senderName,
          content: payload.content,
          timestamp: new Date().toISOString(),
          origin: "optimistic",
        };

        return {
          payload: {
            roomId: payload.roomId,
            message,
          },
        };
      },
    },
    messageReceived(
      state,
      action: PayloadAction<{ roomId: string; message: ChatMessage }>,
    ) {
      mergeRoomMessages(state, action.payload.roomId, [action.payload.message]);
    },
    fileMessageReceived(
      state,
      action: PayloadAction<{
        roomId: string;
        message: ChatMessage;
      }>,
    ) {
      mergeRoomMessages(state, action.payload.roomId, [action.payload.message]);
    },
    setCallStatus(state, action: PayloadAction<Partial<CallState>>) {
      state.callState = { ...state.callState, ...action.payload };
    },
    clearCall(state) {
      state.callState = initialState.callState;
    },
  },
});

export const {
  cyclePresenceMode,
  markRoomRead,
  setActiveRoom,
  addMessage,
  messageReceived,
  fileMessageReceived,
  startRoomHistoryLoad,
  completeRoomHistoryLoad,
  failRoomHistoryLoad,
  setRoomMembers,
  upsertRoomMember,
  removeRoomMember,
  setRoomInfo,
  setCallStatus,
  clearCall,
} = chatSlice.actions;

export const selectActiveRoomId = (state: RootState) => state.chat.activeRoomId;

export const selectActiveRoom = (state: RootState) =>
  state.chat.rooms.find((r) => r.id === state.chat.activeRoomId);

export const selectActiveRoomMessages = (state: RootState) =>
  state.chat.messages[state.chat.activeRoomId] ?? [];

export const selectActiveRoomHistory = (state: RootState) =>
  state.chat.historyByRoom[state.chat.activeRoomId] ?? emptyRoomHistoryState;

export const selectActiveRoomMembers = (state: RootState) =>
  state.chat.membersByRoom[state.chat.activeRoomId] ?? {};

export const selectRoomKey = (state: RootState) => state.chat.roomKey;

export const selectCallState = (state: RootState) => state.chat.callState;

export default chatSlice.reducer;
