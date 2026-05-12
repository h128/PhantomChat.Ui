import { useEffect, useRef } from "react";
import { useSocketCommand } from "./useSocket";
import {
  SocketCommands,
  UserStatus,
  type UserStatusValue,
} from "../services/socket/SocketCommands";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "wheel",
  "scroll",
] as const;

type Options = {
  enabled: boolean;
  idleAfterMs?: number;
};

export function useIdlePresence({ enabled, idleAfterMs = 60_000 }: Options) {
  const sendCommand = useSocketCommand();
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  const lastSentRef = useRef<UserStatusValue | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastSentRef.current = null;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
      return;
    }

    const publish = (status: UserStatusValue) => {
      if (lastSentRef.current === status) return;
      lastSentRef.current = status;
      sendCommandRef
        .current(SocketCommands.SET_USER_STATUS, { status })
        .catch((err) => {
          console.warn("[idlePresence] Failed to publish status:", err);
          lastSentRef.current = null;
        });
    };

    const armIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        publish(UserStatus.IDLE);
      }, idleAfterMs);
    };

    const handleActivity = () => {
      if (document.visibilityState === "hidden") return;
      publish(UserStatus.ACTIVE);
      armIdleTimer();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
          idleTimerRef.current = null;
        }
        publish(UserStatus.IDLE);
      } else {
        publish(UserStatus.ACTIVE);
        armIdleTimer();
      }
    };

    if (document.visibilityState === "hidden") {
      publish(UserStatus.IDLE);
    } else {
      publish(UserStatus.ACTIVE);
      armIdleTimer();
    }

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [enabled, idleAfterMs]);
}
