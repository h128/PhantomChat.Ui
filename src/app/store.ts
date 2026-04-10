import { configureStore, createListenerMiddleware } from "@reduxjs/toolkit";
import chatReducer from "../features/chat/chatSlice";
import profileReducer, { setProfile } from "../features/profile/profileSlice";
import { saveStoredProfile } from "../features/profile/profileStorage";
import themeReducer from "../features/theme/themeSlice";
import { uiSlice } from "../features/ui/uiSlice";

const profilePersistenceMiddleware = createListenerMiddleware<{
  profile: ReturnType<typeof profileReducer>;
}>();

profilePersistenceMiddleware.startListening({
  actionCreator: setProfile,
  effect: (_, listenerApi) => {
    const { displayName, avatarId } = listenerApi.getState().profile;
    saveStoredProfile({ displayName, avatarId });
  },
});

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    profile: profileReducer,
    theme: themeReducer,
    ui: uiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(profilePersistenceMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
