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
  [key: string]: any;
};

export type CommandResponse = {
  request_uuid: string; // Backend echoes the original request_uuid back
  status: number; // 0 = success
  message?: string;
  error?: string;
  [key: string]: any;
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

export type SocketEvent =
  | { event_name: "NewMessageReceived"; payload: NewMessagePayload }
  | { event_name: "UserEnteredRoom"; payload: UserEnteredPayload }
  | { event_name: "user_joined"; payload: any }
  | { event_name: "room_created"; payload: RoomResponse }
  | { event_name: "balloon_received"; payload: any }
  | { event_name: "state_changed"; payload: SocketState };

export type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};
