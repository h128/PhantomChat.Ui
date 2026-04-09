import { createSelector } from "@reduxjs/toolkit";
import {
  selectActiveRoomMembers,
  type RoomMember,
} from "../../features/chat/chatSlice";

export const selectActiveRoomMembersInArray = createSelector(
  [selectActiveRoomMembers],
  (members) => Object.values(members) satisfies RoomMember[],
);
