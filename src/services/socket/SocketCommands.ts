/**
 * WebSocket Command Protocol
 *
 * Based on the backend implementation at ws://89.167.104.26:8080/room
 */
export const SocketCommands = {
  /** Join an existing room or create a new room (Requires room_name, user_uuid, public_key) */
  JOIN_OR_CREATE_ROOM: 1,

  /** Send a chat message */
  SEND_MESSAGE: 2,

  /** Leave the current room */
  LEAVE_ROOM: 3,

  /** System heartbeat (ping/pong) */
  HEARTBEAT: 0,

  /** WebRTC Signaling (Offer, Answer, Candidate, Reject, Hangup) */
  SIGNAL_CALL: 4,

  /** Update user presence status (Active / Idle) */
  SET_USER_STATUS: 5,
} as const;

export const UserStatus = {
  ACTIVE: 0,
  IDLE: 1,
} as const;

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export const SignalCallAction = {
  OFFER: 1,
  ANSWER: 2,
  REJECT: 3,
  CANDIDATE: 4,
  HANGUP: 5,
} as const;

export type SocketCommand =
  (typeof SocketCommands)[keyof typeof SocketCommands];
export type SignalCallActionType =
  (typeof SignalCallAction)[keyof typeof SignalCallAction];
