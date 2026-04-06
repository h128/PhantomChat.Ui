export type SocketState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type CommandRequest = {
  request_uuid: string;
  command: number;
  [key: string]: unknown;
};

export type CommandResponse = {
  request_uuid: string; // Backend echoes the original request_uuid back
  status: number; // 0 = success
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export type RoomResponse = CommandResponse & {
  room_name: string;
  room_key: string;
  room_created: boolean;
  members: string[];
};

export type NewMessagePayload = {
  request_uuid?: string;
  sender_uuid: string;
  sender_name?: string;
  message: string;
  room_name?: string;
};

export type UserEnteredPayload = {
  user_uuid: string;
  room_name: string;
};

export type FileUploadedPayload = {
  event_name: "FileUploaded";
  file_name: string;
  user_uuid: string;
  poster: boolean;
};

export type SignalingData = {
  type?: "offer" | "answer";
  sdp?: string;
  candidate?: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
  usernameFragment?: string;
};

export type SignalCallRelayPayload = {
  action: number;
  sender_uuid: string;
  data: SignalingData;
};

export type SocketEvent =
  | { event_name: "NewMessageReceived"; payload: NewMessagePayload }
  | { event_name: "UserEnteredRoom"; payload: UserEnteredPayload }
  | { event_name: "FileUploaded"; payload: FileUploadedPayload }
  | { event_name: "SignalCallRelay"; payload: SignalCallRelayPayload }
  | { event_name: "user_joined"; payload: unknown }
  | { event_name: "room_created"; payload: RoomResponse }
  | { event_name: "balloon_received"; payload: unknown }
  | { event_name: "state_changed"; payload: SocketState };

export type PendingRequest = {
  resolve: (value: CommandResponse) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};
