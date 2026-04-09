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
}

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

export interface RoomMember {
  userId: string;
  displayName: string;
  avatarId: number | null;
}

interface ChatState {
  presenceMode: PresenceMode;
  activeRoomId: string;
  rooms: Room[];
  messages: Record<string, ChatMessage[]>;
  membersByRoom: Record<string, Record<string, RoomMember>>;
  roomKey: string | null;
  roomStatus: "idle" | "joining" | "joined" | "error";
  callState: CallState;
}

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

const initialState: ChatState = {
  presenceMode: "focused",
  activeRoomId: "launch-pad",
  rooms: [],
  messages: {},
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
      delete state.membersByRoom[action.payload.roomId]?.[action.payload.userId];
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
        return {
          payload: {
            roomId: payload.roomId,
            message: {
              id: nanoid(),
              senderId: getPersistentUserId(),
              senderName: payload.senderName,
              content: payload.content,
              timestamp: new Date().toISOString(),
            },
          },
        };
      },
    },
    messageReceived(
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
    fileMessageReceived(
      state,
      action: PayloadAction<{
        roomId: string;
        message: ChatMessage;
      }>,
    ) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(message);
      syncRoomSummary(state, roomId);
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

export const selectActiveRoomMembers = (state: RootState) =>
  state.chat.membersByRoom[state.chat.activeRoomId] ?? {};

export const selectRoomKey = (state: RootState) => state.chat.roomKey;

export const selectCallState = (state: RootState) => state.chat.callState;

export default chatSlice.reducer;
