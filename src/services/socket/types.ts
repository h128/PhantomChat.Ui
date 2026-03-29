export type SocketState = 
  | "idle" 
  | "connecting" 
  | "connected" 
  | "reconnecting" 
  | "disconnected" 
  | "error";

export interface CommandRequest {
  request_uuid: string;
  command: number;
  [key: string]: any;
}

export interface CommandResponse {
  request_uuid: string; // Backend echoes the original request_uuid back
  status: number;       // 0 = success
  message?: string;
  error?: string;
  [key: string]: any;
}

export interface RoomResponse extends CommandResponse {
  room_name: string;
  room_key: string;
  room_created: boolean;
  members: string[];
}

export interface SocketEvent {
  event_name: "message_received" | "user_joined" | "room_created" | "balloon_received";
  payload: any;
}

export interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}
