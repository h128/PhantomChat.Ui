import { useRef, useCallback, useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  clearCall,
  selectCallState,
  setCallStatus,
} from "../features/chat/chatSlice";
import { useSocketCommand, useSocketEvent } from "./useSocket";
import {
  SignalCallAction,
  SocketCommands,
} from "../services/socket/SocketCommands";
import { WebRTCService } from "../services/webrtc/WebRTCService";
import type { SignalCallRelayPayload } from "../services/socket/types";
import { getPersistentUserId } from "../utils/user";

// Ring audio for incoming calls
let ringAudio: HTMLAudioElement | null = null;

function startRinging() {
  if (ringAudio) return;
  ringAudio = new Audio("/ring.wav");
  ringAudio.loop = true;
  ringAudio.volume = 0.6;
  ringAudio.play().catch(() => {});
}

function stopRinging() {
  if (ringAudio) {
    ringAudio.pause();
    ringAudio.currentTime = 0;
    ringAudio = null;
  }
}

// Multiplexing helpers
function encodeSignal(targetUuid: string, payload: string) {
  return `${targetUuid}|||${payload}`;
}

function decodeSignal(payload?: string) {
  if (!payload) return null;
  const parts = payload.split("|||");
  if (parts.length >= 2) {
    return { targetUuid: parts[0], realPayload: parts.slice(1).join("|||") };
  }
  return null;
}

export function useWebRTC() {
  const dispatch = useAppDispatch();
  const callState = useAppSelector(selectCallState);
  const sendCommand = useSocketCommand();
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  // Map of active peer connections
  const peersRef = useRef<Map<string, WebRTCService>>(new Map());
  // Map of pending ICE candidates for each peer
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Track multiple remote streams for group call grid!
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(
    new Map(),
  );

  // Ring when calling
  useEffect(() => {
    if (callState.status === "calling") {
      startRinging();
    } else {
      stopRinging();
    }
    return () => stopRinging();
  }, [callState.status]);

  const removePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const createPeer = useCallback(
    (peerId: string, currentLocalStream: MediaStream | null) => {
      let webrtc = peersRef.current.get(peerId);
      if (!webrtc) {
        webrtc = new WebRTCService(
          (stream) => {
            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.set(peerId, stream);
              return next;
            });
            dispatch(setCallStatus({ status: "connected" }));
          },
          (candidate) => {
            sendCommandRef
              .current(SocketCommands.SIGNAL_CALL, {
                action: SignalCallAction.CANDIDATE,
                data: {
                  candidate: encodeSignal(peerId, candidate.candidate),
                  sdpMid: candidate.sdpMid,
                  sdpMLineIndex: candidate.sdpMLineIndex,
                },
              })
              .catch(console.error);
          },
        );
        peersRef.current.set(peerId, webrtc);
        if (currentLocalStream) {
          webrtc.initialize(currentLocalStream);
        }
      }
      return webrtc;
    },
    [dispatch],
  );

  const drainPendingCandidates = useCallback(
    async (peerId: string, webrtc: WebRTCService) => {
      const pending = pendingCandidatesRef.current.get(peerId) || [];
      while (pending.length > 0) {
        const candidate = pending.shift()!;
        await webrtc.addIceCandidate(candidate).catch(console.error);
      }
    },
    [],
  );

  const handleSignalEvent = useCallback(
    async (payload: SignalCallRelayPayload) => {
      const { action, sender_uuid, data } = payload;
      const myId = getPersistentUserId();

      if (sender_uuid === myId) return;

      switch (action) {
        case SignalCallAction.OFFER: {
          const decoded = decodeSignal(data.sdp);
          if (!decoded) return;
          const { targetUuid, realPayload } = decoded;

          if (realPayload === "CALL_RING" && targetUuid === "*") {
            if (callState.status === "idle") {
              dispatch(
                setCallStatus({
                  status: "incoming",
                  peerId: sender_uuid,
                  isIncoming: true,
                }),
              );
            } else if (
              callState.status === "connected" ||
              callState.status === "calling"
            ) {
              // Already in the call. Treat their CALL_RING exactly like a JOIN_REQUEST to pull them in.
              dispatch(setCallStatus({ status: "connected" }));
              const webrtc = createPeer(sender_uuid, localStream);
              const offer = await webrtc.createOffer();
              await sendCommandRef
                .current(SocketCommands.SIGNAL_CALL, {
                  action: SignalCallAction.OFFER,
                  data: {
                    type: offer.type,
                    sdp: encodeSignal(sender_uuid, offer.sdp!),
                  },
                })
                .catch(console.error);
            }
            return;
          }

          if (realPayload === "JOIN_REQUEST" && targetUuid === "*") {
            // Someone joined the call. If I am in the call, I must create an OFFER for them
            if (
              callState.status === "connected" ||
              callState.status === "calling"
            ) {
              dispatch(setCallStatus({ status: "connected" })); // Clear my calling state since someone is here
              const webrtc = createPeer(sender_uuid, localStream);
              const offer = await webrtc.createOffer();
              await sendCommandRef
                .current(SocketCommands.SIGNAL_CALL, {
                  action: SignalCallAction.OFFER,
                  data: {
                    type: offer.type,
                    sdp: encodeSignal(sender_uuid, offer.sdp!),
                  },
                })
                .catch(console.error);
            }
            return;
          }

          // Must be a real MESH targeted offer
          if (targetUuid !== myId) return; // Not for me
          const webrtc = createPeer(sender_uuid, localStream);
          await webrtc.setAnswer({ type: "offer", sdp: realPayload });
          const answer = await webrtc.createAnswer({
            type: "offer",
            sdp: realPayload,
          });
          await drainPendingCandidates(sender_uuid, webrtc);

          await sendCommandRef
            .current(SocketCommands.SIGNAL_CALL, {
              action: SignalCallAction.ANSWER,
              data: {
                type: answer.type,
                sdp: encodeSignal(sender_uuid, answer.sdp!),
              },
            })
            .catch(console.error);
          break;
        }

        case SignalCallAction.ANSWER: {
          const decoded = decodeSignal(data.sdp);
          if (!decoded) return;
          const { targetUuid, realPayload } = decoded;
          if (targetUuid !== myId) return;

          const webrtc = peersRef.current.get(sender_uuid);
          if (webrtc) {
            await webrtc
              .setAnswer({ type: "answer", sdp: realPayload })
              .catch(console.error);
            await drainPendingCandidates(sender_uuid, webrtc);
          }
          break;
        }

        case SignalCallAction.CANDIDATE: {
          const decoded = decodeSignal(data.candidate);
          if (!decoded) return;
          const { targetUuid, realPayload } = decoded;
          if (targetUuid !== myId) return;

          const candidateInit = {
            ...data,
            candidate: realPayload,
          } as unknown as RTCIceCandidateInit;
          const webrtc = peersRef.current.get(sender_uuid);

          if (webrtc && webrtc.isReadyForCandidates()) {
            await webrtc.addIceCandidate(candidateInit).catch(console.error);
          } else {
            const pending = pendingCandidatesRef.current.get(sender_uuid) || [];
            pending.push(candidateInit);
            pendingCandidatesRef.current.set(sender_uuid, pending);
          }
          break;
        }

        case SignalCallAction.REJECT:
        case SignalCallAction.HANGUP: {
          // The backend strips data for REJECT and HANGUP, but sender_uuid tells us who left.
          removePeer(sender_uuid);

          // If nobody else is left, clear the call locally
          if (peersRef.current.size === 0) {
            dispatch(clearCall());
            setLocalStream((prev) => {
              if (prev) prev.getTracks().forEach((t) => t.stop());
              return null;
            });
          }
          break;
        }
      }
    },
    [
      callState.status,
      localStream,
      dispatch,
      createPeer,
      drainPendingCandidates,
      removePeer,
    ],
  );

  useSocketEvent("SignalCallRelay", handleSignalEvent);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.OFFER,
        data: { type: "offer", sdp: encodeSignal("*", "CALL_RING") },
      });

      dispatch(setCallStatus({ status: "calling", isIncoming: false }));
    } catch (err) {
      toast.error("Failed to start call. Check your camera/microphone.");
      console.error(err);
    }
  };

  const acceptCall = async () => {
    try {
      stopRinging();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);

      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.OFFER, // Send JOIN_REQUEST using OFFER action
        data: { type: "offer", sdp: encodeSignal("*", "JOIN_REQUEST") },
      });

      dispatch(setCallStatus({ status: "connected" }));
    } catch (err) {
      toast.error("Failed to join call. Check your camera/microphone.");
      console.error(err);
    }
  };

  const rejectCall = async () => {
    stopRinging();
    await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.REJECT,
      data: { type: "offer", sdp: encodeSignal("*", "REJECT") },
    });
    dispatch(clearCall());
  };

  const hangUp = async () => {
    await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.HANGUP,
      data: { type: "offer", sdp: encodeSignal("*", "HANGUP") },
    });
    peersRef.current.forEach((_, peerId) => removePeer(peerId));
    dispatch(clearCall());
    setLocalStream((prev) => {
      if (prev) prev.getTracks().forEach((t) => t.stop());
      return null;
    });
  };

  return {
    callState,
    startCall,
    acceptCall, // Removed the offer parameter, it's automatic now!
    rejectCall,
    hangUp,
    localStream,
    remoteStreams,
  };
}
