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

let previousStoredProfile = {
  displayName: store.getState().profile.displayName,
  avatarId: store.getState().profile.avatarId,
};

store.subscribe(() => {
  const profile = store.getState().profile;
  const nextStoredProfile = {
    displayName: profile.displayName,
    avatarId: profile.avatarId,
  };

  if (
    nextStoredProfile.displayName !== previousStoredProfile.displayName ||
    nextStoredProfile.avatarId !== previousStoredProfile.avatarId
  ) {
    saveStoredProfile(nextStoredProfile);
    previousStoredProfile = nextStoredProfile;
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
