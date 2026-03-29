import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  id: string;
  user_uuid: string;
  text: string;
  timestamp: number;
}

interface ChatState {
  activeRoom: string | null;
  messages: ChatMessage[];
}

const initialState: ChatState = {
  activeRoom: null,
  messages: [],
};

// Architecture Requirement: Bounded In-Memory Window
const MAX_MESSAGES_IN_MEMORY = 200;

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setActiveRoom: (state, action: PayloadAction<string>) => {
      if (state.activeRoom !== action.payload) {
        state.activeRoom = action.payload;
        state.messages = []; // Safety cleanup on roam
      }
    },
    // Domain adapter directly accepts the event
    messageReceived: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      
      // Crucial part to resolve 4-hour memory crash
      if (state.messages.length > MAX_MESSAGES_IN_MEMORY) {
        state.messages = state.messages.slice(-MAX_MESSAGES_IN_MEMORY);
      }
    },
    clearMessages: (state) => {
      state.messages = [];
    }
  },
});

export const { setActiveRoom, messageReceived, clearMessages } = chatSlice.actions;
export default chatSlice.reducer;
