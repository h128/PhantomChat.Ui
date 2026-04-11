import { describe, expect, it, vi } from "vitest";
import {
  createNotificationBody,
  createNotificationTitle,
  getAppActivityState,
  showChatNotification,
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
      "Alpha",
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

  it("prefers resolved sender labels over raw message sender names", async () => {
    const notificationSpy = {
      showNotification: vi.fn().mockResolvedValue(undefined),
    };

    const originalNotification = globalThis.Notification;
    const originalNavigator = globalThis.navigator;
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: { permission: "granted" },
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        Notification: globalThis.Notification,
      },
    });

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue(notificationSpy),
          getRegistration: vi.fn().mockResolvedValue(notificationSpy),
        },
      },
    });

    await showChatNotification({
      roomId: "signal-lab",
      senderLabel: "Alpha",
      iconUrl: "/avatar-alpha.svg",
      imageUrl: "/avatar-alpha.svg",
      message: {
        id: "msg-3",
        senderId: "user_alpha_123",
        senderName: "user_alpha_123",
        content: "Hello there",
        timestamp: "2026-04-11T12:00:00.000Z",
      },
    });

    expect(notificationSpy.showNotification).toHaveBeenCalledWith(
      "Alpha",
      expect.objectContaining({
        icon: "/avatar-alpha.svg",
        image: "/avatar-alpha.svg",
      }),
    );

    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: originalNotification,
    });

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  });
});