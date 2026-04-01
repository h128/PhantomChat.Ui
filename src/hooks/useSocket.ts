import { useEffect, useCallback } from "react";
import { useSocketContext } from "../context/SocketContext";
import type { SocketEvent } from "../services/socket/types";

export function useSocketState() {
  const { state } = useSocketContext();
  return state;
}

export function useSocketCommand() {
  const { client } = useSocketContext();
  
  return useCallback(
    async (command: number, payload: Record<string, any> = {}) => {
      if (!client) throw new Error("Socket client not initialized");
      return client.sendRequest(command, payload);
    },
    [client]
  );
}

export type CallbackType<T extends SocketEvent["event_name"]> = (
  payload: Extract<SocketEvent, { event_name: T }>["payload"]
) => void;

export function useSocketEvent<T extends SocketEvent["event_name"]>(
  eventName: T,
  callback: CallbackType<T>
) {
  const { client } = useSocketContext();

  useEffect(() => {
    if (!client) return;
    
    // Register strongly-typed safe listener
    client.on(eventName, callback as any);

    // Explicit cleanup prevents component unmount listener leaks
    return () => {
      client.off(eventName, callback as any);
    };
  }, [client, eventName, callback]);
}
