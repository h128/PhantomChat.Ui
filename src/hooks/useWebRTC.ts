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

// Ring audio for incoming calls — /public/ring.wav
let ringAudio: HTMLAudioElement | null = null;

function startRinging() {
  if (ringAudio) return;
  ringAudio = new Audio("/ring.wav");
  ringAudio.loop = true;
  ringAudio.volume = 0.6;
  ringAudio.play().catch(() => {
    // Browser autoplay policy — user interaction required before audio can play
  });
}

function stopRinging() {
  if (ringAudio) {
    ringAudio.pause();
    ringAudio.currentTime = 0;
    ringAudio = null;
  }
}

export function useWebRTC() {
  const dispatch = useAppDispatch();
  const callState = useAppSelector(selectCallState);
  const sendCommand = useSocketCommand();
  // Keep sendCommand in a ref so callbacks always use the latest version
  const sendCommandRef = useRef(sendCommand);
  useEffect(() => {
    sendCommandRef.current = sendCommand;
  }, [sendCommand]);

  const webrtcRef = useRef<WebRTCService | null>(null);
  // Buffer ICE candidates that arrive before the peer connection is ready
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Ring plays for the CALLER (calling), not the callee (incoming)
  useEffect(() => {
    if (callState.status === "calling") {
      startRinging();
    } else {
      stopRinging();
    }
    return () => stopRinging();
  }, [callState.status]);

  // Initialize (or reuse) the WebRTC peer connection
  const getWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService(
        (stream) => {
          setRemoteStream(stream);
          dispatch(setCallStatus({ status: "connected" }));
        },
        (candidate) => {
          sendCommandRef
            .current(SocketCommands.SIGNAL_CALL, {
              action: SignalCallAction.CANDIDATE,
              data: {
                candidate: candidate.candidate,
                sdpMid: candidate.sdpMid,
                sdpMLineIndex: candidate.sdpMLineIndex,
              },
            })
            .catch((err) => {
              toast.error(
                "Connection issue encountered. The call might be unstable.",
              );
              console.error("Failed to send ICE candidate:", err);
            });
        },
      );
    }
    return webrtcRef.current;
  }, [dispatch]);

  // Drain any ICE candidates that arrived before the peer connection was ready
  const drainPendingCandidates = useCallback(async () => {
    const webrtc = webrtcRef.current;
    if (!webrtc) return;
    while (pendingCandidatesRef.current.length > 0) {
      const candidate = pendingCandidatesRef.current.shift()!;
      await webrtc.addIceCandidate(candidate).catch(console.error);
    }
  }, []);

  // Stable socket event handler — does NOT change on every render
  const handleSignalEvent = useCallback(
    async (payload: SignalCallRelayPayload) => {
      const { action, sender_uuid, data } = payload;

      // CRITICAL: The backend broadcasts events back to the sender too.
      // We must ignore our own events to avoid self-interference.
      if (sender_uuid === getPersistentUserId()) return;

      switch (action) {
        case SignalCallAction.OFFER:
          // Store the offer in Redux for acceptCall() to use later
          dispatch(
            setCallStatus({
              status: "incoming",
              peerId: sender_uuid,
              isIncoming: true,
              offer: data as unknown as RTCSessionDescriptionInit,
            }),
          );
          break;

        case SignalCallAction.ANSWER: {
          // Callee sent an answer — set it as the remote description on the caller
          const webrtc = webrtcRef.current;
          if (!webrtc) break;
          if (data.sdp) {
            await webrtc
              .setAnswer({
                type: "answer",
                sdp: data.sdp as string,
              })
              .catch(console.error);
            // Drain any buffered candidates now that remote description is set
            await drainPendingCandidates();
          }
          break;
        }

        case SignalCallAction.CANDIDATE: {
          const webrtc = webrtcRef.current;
          if (webrtc && webrtc.isReadyForCandidates()) {
            await webrtc
              .addIceCandidate(data as unknown as RTCIceCandidateInit)
              .catch(console.error);
          } else {
            // Buffer it — peer connection isn't fully negotiated yet
            pendingCandidatesRef.current.push(
              data as unknown as RTCIceCandidateInit,
            );
          }
          break;
        }

        case SignalCallAction.REJECT:
        case SignalCallAction.HANGUP:
          webrtcRef.current?.close();
          webrtcRef.current = null;
          pendingCandidatesRef.current = [];
          dispatch(clearCall());
          setLocalStream(null);
          setRemoteStream(null);
          break;
      }
    },
    [dispatch, drainPendingCandidates],
  );

  useSocketEvent("SignalCallRelay", handleSignalEvent);

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const webrtc = getWebRTC();
      await webrtc.initialize(stream);
      const offer = await webrtc.createOffer();

      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.OFFER,
        data: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });

      dispatch(setCallStatus({ status: "calling", isIncoming: false }));
    } catch (err) {
      toast.error("Failed to start call. Please check your camera/microphone.");
      console.error("Failed to start call:", err);
    }
  };

  const acceptCall = async (offer: RTCSessionDescriptionInit) => {
    try {
      stopRinging();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const webrtc = getWebRTC();
      await webrtc.initialize(stream);

      // createAnswer sets remote description internally, which makes the pc ready
      const answer = await webrtc.createAnswer(offer);

      // Now it's safe to drain any ICE candidates that arrived during negotiation
      await drainPendingCandidates();

      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.ANSWER,
        data: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      // Update UI immediately so the "Answer" button disappears
      dispatch(setCallStatus({ status: "connected" }));
    } catch (err) {
      toast.error(
        "Failed to accept call. Please check your camera/microphone.",
      );
      console.error("Failed to accept call:", err);
    }
  };

  const rejectCall = async () => {
    stopRinging();
    await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.REJECT,
    });
    dispatch(clearCall());
  };

  const hangUp = async () => {
    await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.HANGUP,
    });
    webrtcRef.current?.close();
    webrtcRef.current = null;
    pendingCandidatesRef.current = [];
    dispatch(clearCall());
    setLocalStream(null);
    setRemoteStream(null);
  };

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    localStream,
    remoteStream,
  };
}
