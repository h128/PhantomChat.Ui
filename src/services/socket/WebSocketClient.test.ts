import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketClient } from "./WebSocketClient";
import { SocketTimeoutError } from "./errors";

// Access private members in tests without `any`
type ClientInternals = {
  updateState: (state: string) => void;
  ws: {
    send: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    readyState: number;
  } | null;
  pendingRequests: Map<string, unknown>;
};

function internals(c: WebSocketClient): ClientInternals {
  return c as unknown as ClientInternals;
}

describe("WebSocketClient Core Infrastructure", () => {
  let client: WebSocketClient;

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient("ws://localhost/dummy");
  });

  afterEach(() => {
    client.destroy();
    vi.clearAllTimers();
  });

  it("should instantiate with idle state", () => {
    expect(client.getState()).toBe("idle");
  });

  it("should reject active requests deterministically with TimeoutError", async () => {
    // Mock socket connection logically
    internals(client).updateState("connected");
    internals(client).ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };

    const promise = client.sendRequest(1, {});

    // Fast-forward exact timeout window
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow(SocketTimeoutError);
  });

  it("should clear pending timeouts securely on destroy()", () => {
    internals(client).updateState("connected");
    internals(client).ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };

    client.sendRequest(1, {}).catch(() => {});
    expect(internals(client).pendingRequests.size).toBe(1);

    client.destroy();

    expect(internals(client).pendingRequests.size).toBe(0);
  });
});
