import { describe, expect, it } from "vitest";
import {
  formatDisplayName,
  mapNewMessagePayloadToAction,
  mapUserEnteredPayloadToAction,
} from "./useChatSocketBridge";

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
};

describe("useChatSocketBridge helpers", () => {
  it("formats display names from structured user ids", () => {
    expect(formatDisplayName("user_alpha_123")).toBe("User alpha");
    expect(formatDisplayName("")).toBe("Unknown");
  });

  it("maps new message payloads into Redux actions", () => {
    const action = mapNewMessagePayloadToAction(
      {
        sender_uuid: "user_alpha_123",
        sender_name: "Alpha",
        room_name: "launch-pad",
        message: "Hello team",
      },
      "signal-lab",
      fixedMessageOptions,
    );

    expect(action).toMatchObject({
      type: "chat/messageReceived",
      payload: {
        roomId: "launch-pad",
        message: expectedMappedMessage,
      },
    });
  });

  it("ignores join marker messages to avoid duplicate room-entry chatter", () => {
    const action = mapNewMessagePayloadToAction(
      {
        sender_uuid: "user_alpha_123",
        room_name: "launch-pad",
        message: "__JOIN__",
      },
      "signal-lab",
      fixedMessageOptions,
    );

    expect(action).toBeNull();
  });

  it("falls back to derived sender names and active room ids when needed", () => {
    const action = mapNewMessagePayloadToAction(
      {
        sender_uuid: "user_bravo_456",
        message: "Fallback path",
      },
      "signal-lab",
      fixedMessageOptions,
    );

    expect(action).toMatchObject({
      payload: {
        roomId: "signal-lab",
        message: {
          senderId: "user_bravo_456",
          senderName: "User bravo",
          content: "Fallback path",
        },
      },
    });
  });

  it("falls back to the general room when there is no payload room or active room", () => {
    const action = mapNewMessagePayloadToAction(
      {
        sender_uuid: "user_charlie_789",
        message: "No active room",
      },
      "",
      fixedMessageOptions,
    );

    expect(action).toMatchObject({
      payload: {
        roomId: "general",
      },
    });
  });

  it("maps other-user room entry payloads into system messages", () => {
    const action = mapUserEnteredPayloadToAction(
      {
        user_uuid: "user_delta_001",
        room_name: "launch-pad",
      },
      "signal-lab",
      "user_self_999",
      fixedMessageOptions,
    );

    expect(action).toMatchObject({
      type: "chat/messageReceived",
      payload: {
        roomId: "launch-pad",
        message: {
          id: "message-1",
          senderId: "system",
          senderName: "System",
          content: "User delta entered the room.",
          timestamp: "2026-04-02T10:30:00.000Z",
        },
      },
    });
  });

  it("ignores room entry events for the current user", () => {
    const action = mapUserEnteredPayloadToAction(
      {
        user_uuid: "user_self_999",
        room_name: "launch-pad",
      },
      "signal-lab",
      "user_self_999",
      fixedMessageOptions,
    );

    expect(action).toBeNull();
  });
});
