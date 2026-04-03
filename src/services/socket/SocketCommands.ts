/**
 * WebSocket Command Protocol
 *
 * Based on the backend implementation at ws://89.167.104.26:8080/room
 */
export const SocketCommands = {
  /** Create a new room (Requires room_name, user_uuid, public_key) */
  CREATE_ROOM: 1,

  /** Join an existing room or send message (Requires message) */
  JOIN_OR_MESSAGE: 2,

  /** Leave the current room */
  LEAVE_ROOM: 3,

  /** System heartbeat (ping/pong) */
  HEARTBEAT: 0,

  /** WebRTC Signaling (Offer, Answer, Candidate, Reject, Hangup) */
  SIGNAL_CALL: 4,
} as const;

export const SignalCallAction = {
  OFFER: 1,
  ANSWER: 2,
  REJECT: 3,
  CANDIDATE: 4,
  HANGUP: 5,
} as const;

export type SocketCommand = (typeof SocketCommands)[keyof typeof SocketCommands];
export type SignalCallActionType = (typeof SignalCallAction)[keyof typeof SignalCallAction];
