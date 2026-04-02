import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import { getPersistentUserId, getPersistentUserName } from "../../utils/user";
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
  type: "image" | "file";
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

interface ChatState {
  presenceMode: PresenceMode;
  activeRoomId: string;
  rooms: Room[];
  messages: Record<string, ChatMessage[]>;
  roomKey: string | null;
  roomStatus: "idle" | "joining" | "joined" | "error";
}

const presenceOrder: PresenceMode[] = ["focused", "available", "quiet"];

export const presenceLabels: Record<PresenceMode, string> = {
  focused: "Focused",
  available: "Available",
  quiet: "Quiet Hours",
};



const initialState: ChatState = {
  presenceMode: "focused",
  activeRoomId: "launch-pad",
  rooms: [
    {
      id: "launch-pad",
      name: "Launch Pad",
      topic: "Ship blockers, release timing, and cutover prep.",
      members: 14,
      unread: 7,
    },
    {
      id: "signal-lab",
      name: "Signal Lab",
      topic: "User feedback triage and validation experiments.",
      members: 8,
      unread: 3,
    },
    {
      id: "ops-watch",
      name: "Ops Watch",
      topic: "Deploy health, alerts, and overnight handoff notes.",
      members: 5,
      unread: 1,
    },
  ],
  messages: {},
  roomKey: null,
  roomStatus: "idle",
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
      },
      prepare(payload: { roomId: string; content: string }) {
        return {
          payload: {
            roomId: payload.roomId,
            message: {
              id: nanoid(),
              senderId: getPersistentUserId(),
              senderName: getPersistentUserName(),
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
  setRoomInfo,
} = chatSlice.actions;

export const selectActiveRoomId = (state: RootState) => state.chat.activeRoomId;

export const selectActiveRoom = (state: RootState) =>
  state.chat.rooms.find((r) => r.id === state.chat.activeRoomId);

export const selectActiveRoomMessages = (state: RootState) =>
  state.chat.messages[state.chat.activeRoomId] ?? [];

export const selectRoomKey = (state: RootState) => state.chat.roomKey;

export default chatSlice.reducer;
