import { createSlice } from "@reduxjs/toolkit";
import type { UiSliceState } from "./types";

const initialState: UiSliceState = {
  usersListIsOpen: true,
};

const slice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setUsersListIsOpen(state, action: { payload: boolean }) {
      state.usersListIsOpen = action.payload;
    },
    toggle(state) {
      state.usersListIsOpen = !state.usersListIsOpen;
    },
  },
});

export const uiSlice = {
  ...slice,
  actions: {
    ...slice.actions,
  },
};
