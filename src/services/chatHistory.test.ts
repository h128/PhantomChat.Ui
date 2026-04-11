import { describe, expect, it } from "vitest";
import { parseRoomHistoryNdjson } from "./chatHistory";

describe("chatHistory", () => {
  it("parses supported room history records and skips unsupported events", async () => {
    const result = await parseRoomHistoryNdjson(
      "launch-pad",
      [
        JSON.stringify({
          event_name: "RoomCreated",
          room_name: "launch-pad",
          timestamp: "2026-04-02T09:59:00.000Z",
        }),
        JSON.stringify({
          event_name: "NewMessageReceived",
          sender_uuid: "user_alpha_123",
          message: "Hello from history",
          timestamp: "2026-04-02T10:00:00.000Z",
        }),
        JSON.stringify({
          event_name: "UserEnteredRoom",
          room_name: "launch-pad",
          user_uuid: "user_bravo_456",
          display_name: "Bravo",
          timestamp: "2026-04-02T10:01:00.000Z",
        }),
        JSON.stringify({
          event_name: "FileUploaded",
          room_name: "launch-pad",
          file_name: "voice-note.webm",
          user_uuid: "user_charlie_789",
          poster: false,
          timestamp: "2026-04-02T10:02:00.000Z",
        }),
      ].join("\n"),
      "user_self_999",
    );

    expect(result.malformedLineCount).toBe(0);
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toMatchObject({
      id: "history:launch-pad:2",
      senderId: "user_alpha_123",
      content: "Hello from history",
      origin: "history",
    });
    expect(result.messages[1]).toMatchObject({
      id: "history:launch-pad:3",
      senderId: "system",
      content: "Bravo entered the room.",
      origin: "history",
    });
    expect(result.messages[2]).toMatchObject({
      id: "history:launch-pad:4",
      attachment: {
        fileName: "voice-note.webm",
        type: "audio",
      },
      origin: "history",
    });
  });

  it("skips malformed lines and join markers gracefully", async () => {
    const result = await parseRoomHistoryNdjson(
      "signal-lab",
      [
        "{not-json}",
        JSON.stringify({
          event_name: "NewMessageReceived",
          sender_uuid: "user_alpha_123",
          message: "__JOIN__",
          timestamp: "2026-04-02T10:00:00.000Z",
        }),
        JSON.stringify({
          event_name: "NewMessageReceived",
          sender_uuid: "user_alpha_123",
          message: "kept",
          timestamp: "2026-04-02T10:01:00.000Z",
        }),
      ].join("\n"),
      "user_self_999",
    );

    expect(result.malformedLineCount).toBe(1);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({
      content: "kept",
      origin: "history",
    });
  });
});
