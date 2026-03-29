import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export type PresenceMode = "focused" | "available" | "quiet";

export interface Room {
  id: string;
  name: string;
  topic: string;
  members: number;
  unread: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface ChatState {
  presenceMode: PresenceMode;
  activeRoomId: string;
  rooms: Room[];
  messages: Record<string, ChatMessage[]>;
}

const presenceOrder: PresenceMode[] = ["focused", "available", "quiet"];

export const presenceLabels: Record<PresenceMode, string> = {
  focused: "Focused",
  available: "Available",
  quiet: "Quiet Hours",
};

const mockMessages: Record<string, ChatMessage[]> = {
  "launch-pad": [
    {
      id: "lp-1",
      senderId: "u1",
      senderName: "Alex Chen",
      content:
        "Just pushed the final batch of auth flow fixes. Ready for review.",
      timestamp: "2026-03-28T09:15:00Z",
    },
    {
      id: "lp-2",
      senderId: "u2",
      senderName: "Sam Rivera",
      content:
        "Nice work! I'll review after standup. Did you update the migration script?",
      timestamp: "2026-03-28T09:17:00Z",
    },
    {
      id: "lp-3",
      senderId: "u1",
      senderName: "Alex Chen",
      content:
        "Yep, migration is in the same PR. Also added rollback support just in case.",
      timestamp: "2026-03-28T09:18:00Z",
    },
    {
      id: "lp-4",
      senderId: "u3",
      senderName: "Jordan Lee",
      content: "Release branch looks clean on my end. No blockers from QA.",
      timestamp: "2026-03-28T09:22:00Z",
    },
    {
      id: "lp-5",
      senderId: "u4",
      senderName: "Taylor Kim",
      content:
        "Awesome — I'll start the cutover checklist this afternoon. Let's aim for a 4pm deploy window.",
      timestamp: "2026-03-28T09:25:00Z",
    },
    {
      id: "lp-6",
      senderId: "u2",
      senderName: "Sam Rivera",
      content:
        "4pm works. I'll have the review done by lunch so we have buffer time.",
      timestamp: "2026-03-28T09:27:00Z",
    },
  ],
  "signal-lab": [
    {
      id: "sl-1",
      senderId: "u2",
      senderName: "Sam Rivera",
      content:
        "Got three new feedback tickets from the beta group. Mostly around onboarding flow.",
      timestamp: "2026-03-28T08:45:00Z",
    },
    {
      id: "sl-2",
      senderId: "u5",
      senderName: "Morgan Park",
      content:
        "Can you share the ticket links? I want to cross-reference with our analytics data.",
      timestamp: "2026-03-28T08:48:00Z",
    },
    {
      id: "sl-3",
      senderId: "u2",
      senderName: "Sam Rivera",
      content:
        "Shared in the thread. The drop-off on step 3 is pretty consistent across all three reports.",
      timestamp: "2026-03-28T08:52:00Z",
    },
    {
      id: "sl-4",
      senderId: "u5",
      senderName: "Morgan Park",
      content:
        "Interesting. That matches what I see in the funnel — 40% drop between step 2 and 3. We should prototype a simplified version.",
      timestamp: "2026-03-28T08:58:00Z",
    },
  ],
  "ops-watch": [
    {
      id: "ow-1",
      senderId: "u6",
      senderName: "Casey Nguyen",
      content:
        "Overnight deploy went smooth. No alerts triggered. Handing off to day shift.",
      timestamp: "2026-03-28T07:00:00Z",
    },
    {
      id: "ow-2",
      senderId: "u3",
      senderName: "Jordan Lee",
      content:
        "Thanks Casey. I see CPU usage ticked up slightly on the API cluster — keeping an eye on it.",
      timestamp: "2026-03-28T08:30:00Z",
    },
    {
      id: "ow-3",
      senderId: "u6",
      senderName: "Casey Nguyen",
      content:
        "That spike might be from the nightly reindex job running long. Check the cron logs if it doesn't settle.",
      timestamp: "2026-03-28T08:35:00Z",
    },
  ],
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
  messages: mockMessages,
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
      const roomExists = state.rooms.some((room) => room.id === action.payload);

      if (roomExists) {
        state.activeRoomId = action.payload;
      }
    },
    markRoomRead(state, action: PayloadAction<string>) {
      const room = state.rooms.find((entry) => entry.id === action.payload);

      if (room) {
        room.unread = 0;
      }
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
              senderId: "current-user",
              senderName: "You",
              content: payload.content,
              timestamp: new Date().toISOString(),
            },
          },
        };
      },
    },
  },
});

export const { cyclePresenceMode, markRoomRead, setActiveRoom, addMessage } =
  chatSlice.actions;

export const selectActiveRoomId = (state: RootState) => state.chat.activeRoomId;

export const selectActiveRoom = (state: RootState) =>
  state.chat.rooms.find((r) => r.id === state.chat.activeRoomId);

export const selectActiveRoomMessages = (state: RootState) =>
  state.chat.messages[state.chat.activeRoomId] ?? [];

export default chatSlice.reducer;
