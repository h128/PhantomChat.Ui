import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "../features/chat/chatSlice";
import profileReducer from "../features/profile/profileSlice";
import { saveStoredProfile } from "../features/profile/profileStorage";
import themeReducer from "../features/theme/themeSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    profile: profileReducer,
    theme: themeReducer,
  },
});

store.subscribe(() => {
  const profile = store.getState().profile;
  saveStoredProfile({
    displayName: profile.displayName,
    avatarId: profile.avatarId,
  });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
