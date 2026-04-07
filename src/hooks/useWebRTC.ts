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

      if (webrtc && (webrtc.isClosed() || webrtc.isFailed())) {
        webrtc.close();
        webrtc = undefined;
      }

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
          () => {
            // Abrupt disconnection handler:
            removePeer(peerId);
            // If the mesh is empty now, clear the call state entirely
            if (peersRef.current.size === 0) {
              dispatch(clearCall());
            }
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

          // Unify signaling: strip prefixes if they exist to handle mixed calls
          const pureAction = realPayload.replace(/^(VIDEO_|VOICE_)/, "");
          const isVideo = realPayload.startsWith("VIDEO_");

          if (
            (pureAction === "CALL_RING" || pureAction === "JOIN_REQUEST") &&
            targetUuid === "*"
          ) {
            if (callState.status === "idle") {
              dispatch(
                setCallStatus({
                  status: "incoming",
                  peerId: sender_uuid,
                  isIncoming: true,
                  callType: isVideo ? "video" : "voice",
                }),
              );
              startRinging();
            } else if (
              (callState.status === "connected" ||
                callState.status === "calling") &&
              localStream
            ) {
              // Existing member in the call: Pull the newcomer in regardless of their prefix
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

          // Must be a real MESH targeted offer (direct SDP)
          if (targetUuid !== myId) return;
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

  const startCall = async (type: "video" | "voice" = "video") => {
    try {
      const isVideo = type === "video";
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === "audioinput");
      const hasCam = devices.some((d) => d.kind === "videoinput");

      if (!hasMic) {
        toast.error("Microphone not found. Please connect it to join.");
        return;
      }
      if (isVideo && !hasCam) {
        toast.error("Camera not found. Video calls require a camera.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: callState.selectedMicrophoneId
          ? { deviceId: { exact: callState.selectedMicrophoneId } }
          : true,
        video: isVideo
          ? callState.selectedCameraId
            ? { deviceId: { exact: callState.selectedCameraId } }
            : true
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const prefix = isVideo ? "VIDEO_" : "VOICE_";
      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.OFFER,
        data: { type: "offer", sdp: encodeSignal("*", `${prefix}CALL_RING`) },
      });

      dispatch(
        setCallStatus({ status: "calling", isIncoming: false, callType: type }),
      );
    } catch (err) {
      toast.error(
        `Failed to start ${type} call. Check your camera/microphone.`,
      );
      console.error(err);
    }
  };

  const acceptCall = async () => {
    try {
      stopRinging();
      const isVideo = callState.callType === "video";
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === "audioinput");
      const hasCam = devices.some((d) => d.kind === "videoinput");

      if (!hasMic) {
        toast.error("Microphone not found.");
        return;
      }
      if (isVideo && !hasCam) {
        toast.error("Camera not found.");
        return;
      }

      const constraints: MediaStreamConstraints = {
        audio: callState.selectedMicrophoneId
          ? { deviceId: { exact: callState.selectedMicrophoneId } }
          : true,
        video: isVideo
          ? callState.selectedCameraId
            ? { deviceId: { exact: callState.selectedCameraId } }
            : true
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const prefix = isVideo ? "VIDEO_" : "VOICE_";
      await sendCommandRef.current(SocketCommands.SIGNAL_CALL, {
        action: SignalCallAction.OFFER, // Send JOIN_REQUEST using OFFER action
        data: {
          type: "offer",
          sdp: encodeSignal("*", `${prefix}JOIN_REQUEST`),
        },
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

  const toggleMicrophone = useCallback(() => {
    const newVal = !callState.microphoneEnabled;
    dispatch(setCallStatus({ microphoneEnabled: newVal }));
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = newVal));
    }
  }, [callState.microphoneEnabled, localStream, dispatch]);

  const toggleCamera = useCallback(() => {
    const newVal = !callState.cameraEnabled;
    dispatch(setCallStatus({ cameraEnabled: newVal }));
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = newVal));
    }
  }, [callState.cameraEnabled, localStream, dispatch]);

  const switchDevice = useCallback(
    async (kind: "audio" | "video", deviceId: string) => {
      if (!localStream) return;

      const isVideo = kind === "video";
      const constraints = isVideo
        ? { video: { deviceId: { exact: deviceId } } }
        : { audio: { deviceId: { exact: deviceId } } };

      try {
        const newMedia = await navigator.mediaDevices.getUserMedia(constraints);
        const newTrack = isVideo
          ? newMedia.getVideoTracks()[0]
          : newMedia.getAudioTracks()[0];

        if (!newTrack) return;

        // 1. Replace in all active Mesh peer connections
        const replacePromises: Promise<void>[] = [];
        peersRef.current.forEach((pc) => {
          replacePromises.push(pc.replaceTrack(kind, newTrack));
        });
        await Promise.all(replacePromises);

        // 2. Local stream update
        const oldTrack = isVideo
          ? localStream.getVideoTracks()[0]
          : localStream.getAudioTracks()[0];

        if (oldTrack) {
          oldTrack.stop();
          localStream.removeTrack(oldTrack);
        }
        localStream.addTrack(newTrack);

        // 3. Store update
        if (isVideo) {
          dispatch(setCallStatus({ selectedCameraId: deviceId }));
        } else {
          dispatch(setCallStatus({ selectedMicrophoneId: deviceId }));
        }
      } catch (err) {
        toast.error(`Failed to switch ${kind} device.`);
        console.error(err);
      }
    },
    [localStream, dispatch],
  );

  const getDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      const videoInputs = devices.filter((d) => d.kind === "videoinput");

      // Auto-select if only one
      if (audioInputs.length === 1 && !callState.selectedMicrophoneId) {
        dispatch(
          setCallStatus({ selectedMicrophoneId: audioInputs[0].deviceId }),
        );
      }
      if (videoInputs.length === 1 && !callState.selectedCameraId) {
        dispatch(setCallStatus({ selectedCameraId: videoInputs[0].deviceId }));
      }

      return { audioInputs, videoInputs };
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
      return { audioInputs: [], videoInputs: [] };
    }
  }, [callState.selectedMicrophoneId, callState.selectedCameraId, dispatch]);

  return {
    callState,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMicrophone,
    toggleCamera,
    switchDevice,
    getDevices,
    localStream,
    remoteStreams,
  };
}
