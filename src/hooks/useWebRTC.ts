import { useRef, useCallback, useState } from "react";
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

export function useWebRTC() {
  const dispatch = useAppDispatch();
  const callState = useAppSelector(selectCallState);
  const sendCommand = useSocketCommand();
  const webrtcRef = useRef<WebRTCService | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // Initialize WebRTC Service
  const getWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService(
        (stream) => {
          setRemoteStream(stream);
          dispatch(setCallStatus({ status: "connected" }));
        },
        (candidate) => {
          // Send ICE candidate to peer
          sendCommand(SocketCommands.SIGNAL_CALL, {
            action: SignalCallAction.CANDIDATE,
            data: {
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
            },
          }).catch((err) => {
            toast.error(
              "Connection issue encountered. The call might be unstable.",
            );
            console.error("Failed to send ICE candidate:", err);
          });
        },
      );
    }
    return webrtcRef.current;
  }, [dispatch, sendCommand]);

  // Handle Signal Events from Socket
  useSocketEvent("SignalCallRelay", async (payload) => {
    const { action, sender_uuid, signaling_data } = payload;
    const webrtc = getWebRTC();

    switch (action) {
      case SignalCallAction.OFFER:
        dispatch(
          setCallStatus({
            status: "incoming",
            peerId: sender_uuid,
            isIncoming: true,
            offer: signaling_data as RTCSessionDescriptionInit,
          }),
        );
        break;

      case SignalCallAction.ANSWER:
        if (signaling_data.sdp) {
          await webrtc.setAnswer({
            type: "answer",
            sdp: signaling_data.sdp,
          });
        }
        break;

      case SignalCallAction.CANDIDATE:
        await webrtc.addIceCandidate(signaling_data as RTCIceCandidateInit);
        break;

      case SignalCallAction.REJECT:
      case SignalCallAction.HANGUP:
        webrtc.close();
        dispatch(clearCall());
        setLocalStream(null);
        setRemoteStream(null);
        break;
    }
  });

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

      await sendCommand(SocketCommands.SIGNAL_CALL, {
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      const webrtc = getWebRTC();
      await webrtc.initialize(stream);
      const answer = await webrtc.createAnswer(offer);

      await sendCommand(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.ANSWER,
        data: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });

      dispatch(setCallStatus({ status: "connected" }));
    } catch (err) {
      toast.error(
        "Failed to accept call. Please check your camera/microphone.",
      );
      console.error("Failed to accept call:", err);
    }
  };

  const rejectCall = async () => {
    await sendCommand(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.REJECT,
    });
    dispatch(clearCall());
  };

  const hangUp = async () => {
    await sendCommand(SocketCommands.SIGNAL_CALL, {
      action: SignalCallAction.HANGUP,
    });
    if (webrtcRef.current) {
      webrtcRef.current.close();
    }
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
