import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export const selectIsUsersListOpen = createSelector(
  [(state: RootState) => state.ui.usersListIsOpen],
  (usersListIsOpen) => usersListIsOpen,
);
