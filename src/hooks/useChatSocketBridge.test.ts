import { describe, expect, it } from "vitest";
import {
  createChatMessageFromFileUploadedPayload,
  createChatMessageFromNewMessagePayload,
  createSystemMessageFromUserEnteredPayload,
  formatDisplayName,
  mapRoomMembersFromResponse,
  resolveMessageRoomId,
} from "../features/chat/chatMessageMappers";

const fixedMessageOptions = {
  createId: () => "message-1",
  getTimestamp: () => "2026-04-02T10:30:00.000Z",
};

const expectedMappedMessage = {
  id: "message-1",
  senderId: "user_alpha_123",
  senderName: "Alpha",
  content: "Hello team",
  timestamp: "2026-04-02T10:30:00.000Z",
  origin: "realtime",
};

describe("chatMessageMappers", () => {
  it("formats display names from structured user ids", () => {
    expect(formatDisplayName("user_alpha_123")).toBe("User alpha");
    expect(formatDisplayName("")).toBe("Unknown");
  });

  it("maps new message payloads into chat messages", () => {
    const message = createChatMessageFromNewMessagePayload(
      {
        sender_uuid: "user_alpha_123",
        sender_name: "Alpha",
        room_name: "launch-pad",
        message: "Hello team",
        timestamp: "2026-04-02T10:30:00.000Z",
      },
      fixedMessageOptions,
    );

    expect(message).toMatchObject(expectedMappedMessage);
  });

  it("ignores join marker messages to avoid duplicate room-entry chatter", () => {
    const action = createChatMessageFromNewMessagePayload(
      {
        sender_uuid: "user_alpha_123",
        room_name: "launch-pad",
        message: "__JOIN__",
      },
      fixedMessageOptions,
    );

    expect(action).toBeNull();
  });

  it("falls back to derived sender names when needed", () => {
    const message = createChatMessageFromNewMessagePayload(
      {
        sender_uuid: "user_bravo_456",
        message: "Fallback path",
      },
      fixedMessageOptions,
    );

    expect(message).toMatchObject({
      senderId: "user_bravo_456",
      senderName: "User bravo",
      content: "Fallback path",
    });
  });

  it("resolves room ids from payload room, active room, and fallback", () => {
    expect(resolveMessageRoomId("launch-pad", "signal-lab")).toBe(
      "launch-pad",
    );
    expect(resolveMessageRoomId(undefined, "signal-lab")).toBe("signal-lab");
    expect(resolveMessageRoomId(undefined, "")).toBe("general");
  });

  it("maps other-user room entry payloads into system messages", () => {
    const message = createSystemMessageFromUserEnteredPayload(
      {
        user_uuid: "user_delta_001",
        room_name: "launch-pad",
        display_name: "Delta",
        timestamp: "2026-04-02T10:30:00.000Z",
      },
      "user_self_999",
      fixedMessageOptions,
    );

    expect(message).toMatchObject({
      id: "message-1",
      senderId: "system",
      senderName: "System",
      content: "Delta entered the room.",
      timestamp: "2026-04-02T10:30:00.000Z",
      origin: "realtime",
    });
  });

  it("ignores room entry events for the current user", () => {
    const action = createSystemMessageFromUserEnteredPayload(
      {
        user_uuid: "user_self_999",
        room_name: "launch-pad",
      },
      "user_self_999",
      fixedMessageOptions,
    );

    expect(action).toBeNull();
  });

  it("maps backend room members into normalized chat members", () => {
    const members = mapRoomMembersFromResponse({
      request_uuid: "request-1",
      status: 0,
      room_name: "launch-pad",
      room_key: "encrypted-key",
      room_created: false,
      members: [
        {
          user_uuid: "user_alpha_123",
          avatar_id: 2,
          display_name: "Alpha",
        },
      ],
    });

    expect(members).toEqual([
      {
        userId: "user_alpha_123",
        avatarId: 2,
        displayName: "Alpha",
      },
    ]);
  });

  it("maps file upload payloads into attachment messages", () => {
    const message = createChatMessageFromFileUploadedPayload(
      {
        event_name: "FileUploaded",
        file_name: "voice-note.webm",
        user_uuid: "user_echo_321",
        poster: false,
        timestamp: "2026-04-02T10:30:00.000Z",
      },
      fixedMessageOptions,
    );

    expect(message).toMatchObject({
      senderId: "user_echo_321",
      timestamp: "2026-04-02T10:30:00.000Z",
      origin: "realtime",
      attachment: {
        fileName: "voice-note.webm",
        originalName: "voice-note.webm",
        type: "audio",
      },
    });
  });
});
