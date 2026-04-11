import { describe, expect, it } from "vitest";
import {
  createNotificationBody,
  createNotificationTitle,
  getAppActivityState,
  shouldNotifyForIncomingMessage,
} from "./browserNotifications";

describe("browserNotifications", () => {
  it("derives app activity state from document visibility and focus", () => {
    expect(
      getAppActivityState({
        hidden: false,
        visibilityState: "visible",
        hasFocus: () => true,
      }),
    ).toBe("active");

    expect(
      getAppActivityState({
        hidden: false,
        visibilityState: "visible",
        hasFocus: () => false,
      }),
    ).toBe("inactive");

    expect(
      getAppActivityState({
        hidden: true,
        visibilityState: "hidden",
        hasFocus: () => false,
      }),
    ).toBe("hidden");
  });

  it("only notifies for non-system messages when the app is not active", () => {
    const message = {
      id: "msg-1",
      senderId: "user_alpha_123",
      senderName: "Alpha",
      content: "Hello there",
      timestamp: "2026-04-11T12:00:00.000Z",
    };

    expect(
      shouldNotifyForIncomingMessage({
        message,
        currentUserId: "user_alpha_123",
        appActivityState: "hidden",
      }),
    ).toBe(false);

    expect(
      shouldNotifyForIncomingMessage({
        message: { ...message, senderId: "system" },
        currentUserId: "user_self_123",
        appActivityState: "hidden",
      }),
    ).toBe(false);

    expect(
      shouldNotifyForIncomingMessage({
        message: { ...message, senderId: "user_beta_456" },
        currentUserId: "user_self_123",
        appActivityState: "active",
      }),
    ).toBe(false);

    expect(
      shouldNotifyForIncomingMessage({
        message: { ...message, senderId: "user_beta_456" },
        currentUserId: "user_self_123",
        appActivityState: "inactive",
      }),
    ).toBe(true);
  });

  it("creates readable notification titles and bodies", () => {
    expect(createNotificationTitle("signal-lab", "Alpha")).toBe(
      "Alpha in Signal Lab",
    );

    expect(
      createNotificationBody({
        id: "msg-2",
        senderId: "user_alpha_123",
        senderName: "Alpha",
        content: "",
        timestamp: "2026-04-11T12:00:00.000Z",
        attachment: {
          fileName: "voice.webm",
          originalName: "voice.webm",
          type: "audio",
        },
      }),
    ).toBe("Sent a voice message");
  });
});