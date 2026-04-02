import React, { createContext, useEffect, useMemo, useState } from "react";
import { WebSocketClient } from "../services/socket/WebSocketClient";
import type { SocketState } from "../services/socket/types";

interface SocketContextValue {
  client: WebSocketClient;
  state: SocketState;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<SocketState>("idle");
  const client = useMemo(() => {
    const url = import.meta.env.VITE_WS_URL || "ws://89.167.104.26:8080/room";
    return new WebSocketClient(url);
  }, []);

  useEffect(() => {
    // React state sink for the state machine
    client.on("state_changed", (newState: SocketState) => {
      setState(newState);
    });

    client.connect();

    // Strict Cleanup Rule on Unmount
    return () => {
      client.destroy();
    };
  }, [client]);

  return (
    <SocketContext.Provider value={{ client, state }}>
      {children}
    </SocketContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSocketContext = () => {
  const context = React.useContext(SocketContext);
  if (!context)
    throw new Error("useSocketContext must be used within SocketProvider");
  return context;
};
