import type {
  SocketState,
  CommandRequest,
  CommandResponse,
  SocketEvent,
  PendingRequest
} from "./types";
import { SocketTimeoutError, SocketDisconnectedError } from "./errors";

// Typed Event Emitter callback
export type EventCallback = (payload: any) => void;

export class WebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private state: SocketState = "idle";
  
  // Maps & Timers
  private pendingRequests = new Map<string, PendingRequest>();
  private listeners = new Map<string, Set<EventCallback>>();
  
  // Reconnect Config
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat Config
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private pongTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly PING_RATE = 30000;
  private readonly PONG_WAIT = 5000;
  private readonly REQUEST_TIMEOUT = 5000;

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    if (this.state === "connected" || this.state === "connecting") return;
    this.updateState(this.reconnectAttempts > 0 ? "reconnecting" : "connecting");
    
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (err) {
      console.error("Failed to construct WebSocket:", err);
      this.updateState("error");
      this.triggerReconnect();
    }
  }

  public disconnect() {
    // Graceful intentional disconnect (prevents auto-reconnect)
    this.cleanup(true);
    this.updateState("disconnected");
  }

  public destroy() {
    // Complete teardown (unmount/logout scenario)
    this.cleanup(true);
    this.listeners.clear();
  }

  public getState(): SocketState {
    return this.state;
  }

  /**
   * Promisified Request Mapping.
   * Rejects deterministically upon timeout or drop.
   */
  public async sendRequest(command: number, payload: Record<string, any> = {}): Promise<any> {
    if (this.state !== "connected" || !this.ws) {
      throw new SocketDisconnectedError("Socket is not connected");
    }

    const request_uuid = crypto.randomUUID();
    const request: CommandRequest = {
      request_uuid,
      command,
      ...payload
    };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(request_uuid);
        reject(new SocketTimeoutError(`Request ${command} timed out after ${this.REQUEST_TIMEOUT}ms`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(request_uuid, { resolve, reject, timeoutId });

      this.ws!.send(JSON.stringify(request));
    });
  }

  /** Event Emitter Core */
  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  private emit(event: string, payload: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => cb(payload));
    }
  }

  /** Internal Handlers */

  private handleOpen() {
    this.reconnectAttempts = 0; // Reset backoff logic
    this.updateState("connected");
    this.startHeartbeat();
  }

  private handleMessage(messageEvent: MessageEvent) {
    try {
      const data = JSON.parse(messageEvent.data);

      // Handle PONGs
      if (data.command === 0 || data.type === 'pong') {
        this.handlePong();
        return;
      }

      // Discriminator: Response Mapping
      // Backend echoes the original request_uuid back in responses
      if (data.request_uuid && this.pendingRequests.has(data.request_uuid)) {
        const response = data as CommandResponse;
        const pending = this.pendingRequests.get(response.request_uuid)!;
        
        clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(response.request_uuid);
        
        if (response.status !== 0) {
          pending.reject(new Error(response.message || response.error || "Server error"));
        } else {
          pending.resolve(response);
        }
        return;
      }

      // Discriminator: Push Events
      if (data.event_name) {
        const event = data as SocketEvent;
        this.emit(event.event_name, event.payload);
      }
    } catch (err) {
      console.error("Failed to parse socket message", err);
    }
  }

  private handleClose(event: CloseEvent) {
    this.cleanup(false); // false = accidental drop, triggering reconnect
    
    if (event.wasClean) {
      this.updateState("disconnected");
    } else {
      this.triggerReconnect();
    }
  }

  private handleError(error: Event) {
    console.error("WebSocket Error", error);
    this.updateState("error");
  }

  private triggerReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateState("disconnected");
      console.error("Max reconnect attempts reached. Exhausted.");
      return;
    }

    this.reconnectAttempts++;
    
    // Exponential backoff: 2s, 4s, 8s, 16s, 30s max
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.updateState("reconnecting");
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.state === "connected") {
        this.ws.send(JSON.stringify({ command: 0, type: "ping" }));
        
        // Setup strict timeout for pong reflection
        this.pongTimeout = setTimeout(() => {
          console.warn("Heartbeat Pong Timeout. Forcing disconnect.");
          this.ws!.close();
        }, this.PONG_WAIT);
      }
    }, this.PING_RATE);
  }

  private handlePong() {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  private cleanup(_intentional: boolean) {
    // 1. Clear Infrastructure Timers
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pongTimeout) clearTimeout(this.pongTimeout);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.pingInterval = null;
    this.pongTimeout = null;
    this.reconnectTimer = null;

    // 2. Reject all inflight requests (prevent hanging promises)
    for (const [_uuid, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new SocketDisconnectedError());
    }
    this.pendingRequests.clear();

    // 3. Purge WebSocket listeners to prevent ghost events
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
  }

  private updateState(newState: SocketState) {
    if (this.state !== newState) {
      this.state = newState;
      this.emit("state_changed", this.state);
    }
  }
}
