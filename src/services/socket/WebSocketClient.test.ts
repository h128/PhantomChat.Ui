import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from './WebSocketClient';
import { SocketTimeoutError } from './errors';

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
        (client as any).updateState('connected'); 
        (client as any).ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };

        const promise = client.sendRequest(1, {});
        
        // Fast-forward exact timeout window
        vi.advanceTimersByTime(5000);
        
        await expect(promise).rejects.toThrow(SocketTimeoutError);
    });

    it("should clear pending timeouts securely on destroy()", () => {
        (client as any).updateState('connected'); 
        (client as any).ws = { send: vi.fn(), close: vi.fn(), readyState: 1 };

        client.sendRequest(1, {}).catch(() => {});
        expect((client as any).pendingRequests.size).toBe(1);

        client.destroy();
        
        expect((client as any).pendingRequests.size).toBe(0);
    });
});
