import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { WebSocketClient } from "../services/socket/WebSocketClient";
import type { SocketState } from "../services/socket/types";

interface SocketContextValue {
  client: WebSocketClient | null;
  state: SocketState;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [state, setState] = useState<SocketState>("idle");

  useEffect(() => {
    // 1. Enforce Singleton rule across the lifecycle
    const url = import.meta.env.VITE_WS_URL || "ws://89.167.104.26:8080/room";
    const client = new WebSocketClient(url);
    clientRef.current = client;

    // React state sink for the state machine
    client.on("state_changed", (newState: SocketState) => {
      setState(newState);
    });

    client.connect();

    // 2. Strict Cleanup Rule on Unmount
    return () => {
      client.destroy();
      clientRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ client: clientRef.current, state }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocketContext must be used within SocketProvider");
  return context;
};
