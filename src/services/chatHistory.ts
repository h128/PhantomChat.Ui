import type { ChatMessage } from "../features/chat/chatSlice";
import {
  createChatMessageFromFileUploadedPayload,
  createChatMessageFromNewMessagePayload,
  createSystemMessageFromUserEnteredPayload,
} from "../features/chat/chatMessageMappers";
import type {
  FileUploadedPayload,
  NewMessagePayload,
  UserEnteredPayload,
} from "./socket/types";

const BASE_URL = import.meta.env.VITE_HTTP_URL;

type HistoryEventName =
  | "FileUploaded"
  | "NewMessageReceived"
  | "RoomCreated"
  | "LeaveRoom"
  | "SignalCallRelay"
  | "UserEnteredRoom";

type HistoryRecord = {
  event_name?: HistoryEventName;
  [key: string]: unknown;
};

export type RoomHistoryResult = {
  messages: ChatMessage[];
  malformedLineCount: number;
};

function isHistoryRecord(value: unknown): value is HistoryRecord {
  return typeof value === "object" && value !== null;
}

function createHistoryMessageId(roomName: string, lineNumber: number) {
  return `history:${roomName}:${lineNumber}`;
}

function mapHistoryRecordToMessage(
  record: HistoryRecord,
  roomName: string,
  lineNumber: number,
  currentUserId: string,
): ChatMessage | null {
  const options = {
    createId: () => createHistoryMessageId(roomName, lineNumber),
    origin: "history" as const,
  };

  switch (record.event_name) {
    case "NewMessageReceived":
      return createChatMessageFromNewMessagePayload(
        record as NewMessagePayload,
        options,
      );
    case "UserEnteredRoom":
      return createSystemMessageFromUserEnteredPayload(
        record as UserEnteredPayload,
        currentUserId,
        options,
      );
    case "FileUploaded":
      return createChatMessageFromFileUploadedPayload(
        record as FileUploadedPayload,
        options,
      );
    default:
      return null;
  }
}

export function parseRoomHistoryNdjson(
  roomName: string,
  ndjson: string,
  currentUserId = "",
): RoomHistoryResult {
  const messages: ChatMessage[] = [];
  let malformedLineCount = 0;

  const lines = ndjson.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    try {
      const parsed = JSON.parse(line) as unknown;

      if (!isHistoryRecord(parsed)) {
        malformedLineCount += 1;
        continue;
      }

      const message = mapHistoryRecordToMessage(
        parsed,
        roomName,
        index + 1,
        currentUserId,
      );
      if (message) {
        messages.push(message);
      }
    } catch {
      malformedLineCount += 1;
    }
  }

  return { messages, malformedLineCount };
}

export async function fetchRoomHistory(
  roomName: string,
  currentUserId = "",
  signal?: AbortSignal,
): Promise<RoomHistoryResult> {
  const filename = `${roomName}.ndjson`;
  const response = await fetch(
    `${BASE_URL}/download-document/${encodeURIComponent(roomName)}/${encodeURIComponent(filename)}`,
    { signal },
  );

  if (response.status === 404) {
    return { messages: [], malformedLineCount: 0 };
  }

  if (!response.ok) {
    throw new Error(`History download failed (${response.status})`);
  }

  const ndjson = await response.text();
  if (!ndjson.trim()) {
    return { messages: [], malformedLineCount: 0 };
  }

  return parseRoomHistoryNdjson(roomName, ndjson, currentUserId);
}