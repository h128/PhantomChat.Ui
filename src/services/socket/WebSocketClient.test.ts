import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketClient } from "./WebSocketClient";
import { SocketDisconnectedError, SocketTimeoutError } from "./errors";

type ClientInternals = {
    updateState: (state: string) => void;
    handleMessage: (event: MessageEvent) => void;
    handleClose: (event: CloseEvent) => void;
    handleError: (event: Event) => void;
    pendingRequests: Map<string, unknown>;
    ws: {
        send: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
        readyState: number;
        onopen?: (() => void) | null;
        onmessage?: ((event: MessageEvent) => void) | null;
        onclose?: ((event: CloseEvent) => void) | null;
        onerror?: ((event: Event) => void) | null;
    } | null;
    reconnectAttempts: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    pongTimeout: ReturnType<typeof setTimeout> | null;
};

function getInternals(client: WebSocketClient): ClientInternals {
    return client as unknown as ClientInternals;
}

function attachOpenSocket(client: WebSocketClient) {
    const internals = getInternals(client);
    const send = vi.fn();
    const close = vi.fn();

    internals.updateState("connected");
    internals.ws = { send, close, readyState: WebSocket.OPEN };

    return { send, close, internals };
}

describe("WebSocketClient Core Infrastructure", () => {
    let client: WebSocketClient;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "debug").mockImplementation(() => {});
        vi.spyOn(console, "table").mockImplementation(() => {});
        vi.spyOn(console, "log").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});
        client = new WebSocketClient("ws://localhost/dummy");
    });

    afterEach(() => {
        client.destroy();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("should instantiate with idle state", () => {
        expect(client.getState()).toBe("idle");
    });

    it("should throw when sending while disconnected", async () => {
        await expect(client.sendRequest(1, {})).rejects.toThrow(SocketDisconnectedError);
    });

    it("should reject active requests deterministically with TimeoutError", async () => {
        attachOpenSocket(client);

        const promise = client.sendRequest(1, {});

        vi.advanceTimersByTime(5000);

        await expect(promise).rejects.toThrow(SocketTimeoutError);
        expect(getInternals(client).pendingRequests.size).toBe(0);
    });

    it("should correlate responses back to the matching request", async () => {
        vi.spyOn(crypto, "randomUUID").mockReturnValue(
            "00000000-0000-0000-0000-000000000001",
        );
        const { send, internals } = attachOpenSocket(client);

        const promise = client.sendRequest(7, { room_name: "launch-pad" });

        expect(send).toHaveBeenCalledWith(
            JSON.stringify({
                request_uuid: "00000000-0000-0000-0000-000000000001",
                command: 7,
                room_name: "launch-pad",
            }),
        );
        expect(internals.pendingRequests.size).toBe(1);

        internals.handleMessage({
            data: JSON.stringify({
                request_uuid: "00000000-0000-0000-0000-000000000001",
                status: 0,
                room_key: "room-key-1",
            }),
        } as MessageEvent);

        await expect(promise).resolves.toMatchObject({
            request_uuid: "00000000-0000-0000-0000-000000000001",
            status: 0,
            room_key: "room-key-1",
        });
        expect(internals.pendingRequests.size).toBe(0);
    });

    it("should reject a correlated response when the server reports an error", async () => {
        vi.spyOn(crypto, "randomUUID").mockReturnValue(
            "00000000-0000-0000-0000-000000000002",
        );
        const { internals } = attachOpenSocket(client);

        const promise = client.sendRequest(2, { message: "hello" });

        internals.handleMessage({
            data: JSON.stringify({
                request_uuid: "00000000-0000-0000-0000-000000000002",
                status: 42,
                error: "No room found",
            }),
        } as MessageEvent);

        await expect(promise).rejects.toThrow("No room found");
        expect(internals.pendingRequests.size).toBe(0);
    });

    it("should emit explicit push events to subscribers", () => {
        const listener = vi.fn();
        client.on("UserEnteredRoom", listener);

        getInternals(client).handleMessage({
            data: JSON.stringify({
                event_name: "UserEnteredRoom",
                user_uuid: "user_2",
                room_name: "launch-pad",
            }),
        } as MessageEvent);

        expect(listener).toHaveBeenCalledWith({
            user_uuid: "user_2",
            room_name: "launch-pad",
        });
    });

    it("should emit broadcast messages through the NewMessageReceived fallback", () => {
        const listener = vi.fn();
        client.on("NewMessageReceived", listener);

        getInternals(client).handleMessage({
            data: JSON.stringify({
                sender_uuid: "user_2",
                sender_name: "User 2",
                room_name: "launch-pad",
                message: "Hi there",
            }),
        } as MessageEvent);

        expect(listener).toHaveBeenCalledWith({
            sender_uuid: "user_2",
            sender_name: "User 2",
            room_name: "launch-pad",
            message: "Hi there",
        });
    });

    it("should stop emitting after a listener is removed", () => {
        const listener = vi.fn();
        client.on("NewMessageReceived", listener);
        client.off("NewMessageReceived", listener);

        getInternals(client).handleMessage({
            data: JSON.stringify({
                sender_uuid: "user_3",
                room_name: "launch-pad",
                message: "Removed listener",
            }),
        } as MessageEvent);

        expect(listener).not.toHaveBeenCalled();
    });

    it("should ignore invalid socket payloads and log a parse error", () => {
        const internals = getInternals(client);

        internals.handleMessage({ data: "not-json" } as MessageEvent);

        expect(console.error).toHaveBeenCalledWith(
            "Failed to parse socket message",
            expect.any(SyntaxError),
        );
    });

    it("should clear pong timeout when a pong payload arrives", () => {
        const internals = getInternals(client);
        internals.pongTimeout = setTimeout(() => {}, 1000);

        internals.handleMessage({
            data: JSON.stringify({ type: "pong" }),
        } as MessageEvent);

        expect(internals.pongTimeout).toBeNull();
    });

    it("should move to error state when the socket errors", () => {
        const stateListener = vi.fn();
        client.on("state_changed", stateListener);

        getInternals(client).handleError(new Event("error"));

        expect(client.getState()).toBe("error");
        expect(stateListener).toHaveBeenCalledWith("error");
    });

    it("should schedule a reconnect after an unclean close", () => {
        const stateListener = vi.fn();
        client.on("state_changed", stateListener);
        const connectSpy = vi.spyOn(client, "connect");
        const { internals } = attachOpenSocket(client);

        internals.handleClose({ wasClean: false } as CloseEvent);

        expect(client.getState()).toBe("reconnecting");
        expect(internals.reconnectAttempts).toBe(1);
        expect(internals.reconnectTimer).not.toBeNull();

        vi.advanceTimersByTime(2000);

        expect(connectSpy).toHaveBeenCalled();
        expect(stateListener).toHaveBeenCalledWith("reconnecting");
    });

    it("should become disconnected on a clean close without reconnecting", () => {
        const connectSpy = vi.spyOn(client, "connect");
        const { internals } = attachOpenSocket(client);

        internals.handleClose({ wasClean: true } as CloseEvent);

        expect(client.getState()).toBe("disconnected");
        vi.advanceTimersByTime(30000);
        expect(connectSpy).not.toHaveBeenCalled();
    });

    it("should stop reconnecting after the maximum number of attempts", () => {
        const internals = getInternals(client);
        internals.reconnectAttempts = 10;

        internals.handleClose({ wasClean: false } as CloseEvent);

        expect(client.getState()).toBe("disconnected");
        expect(console.error).toHaveBeenCalledWith(
            "Max reconnect attempts reached. Exhausted.",
        );
    });

    it("should clear pending timeouts securely on destroy()", () => {
        const { internals } = attachOpenSocket(client);

        client.sendRequest(1, {}).catch(() => {});
        expect(internals.pendingRequests.size).toBe(1);

        client.destroy();

        expect(internals.pendingRequests.size).toBe(0);
    });
});
