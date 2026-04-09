import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";
import { getPersistentUserId } from "../../utils/user";
import { loadStoredProfile } from "./profileStorage";

export interface ProfileState {
  userId: string;
  displayName: string;
  avatarId: number | null;
}

const storedProfile = loadStoredProfile();

const initialState: ProfileState = {
  userId: getPersistentUserId(),
  displayName: storedProfile.displayName,
  avatarId: storedProfile.avatarId,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile(
      state,
      action: PayloadAction<{ displayName: string; avatarId: number }>,
    ) {
      state.displayName = action.payload.displayName;
      state.avatarId = action.payload.avatarId;
    },
  },
});

export const { setProfile } = profileSlice.actions;

export const selectProfile = (state: RootState) => state.profile;

export const selectIsProfileComplete = (state: RootState) =>
  Boolean(state.profile.displayName.trim()) && state.profile.avatarId !== null;

export default profileSlice.reducer;