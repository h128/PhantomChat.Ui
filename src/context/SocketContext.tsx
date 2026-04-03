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
    const url = import.meta.env.VITE_WS_URL;
    return new WebSocketClient(url);
  }, []);

  useEffect(() => {
    const handler = (newState: SocketState) => {
      setState(newState);
    };

    client.on("state_changed", handler);
    client.connect();

    return () => {
      client.off("state_changed", handler);
      client.disconnect();
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
