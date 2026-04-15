import { DateTime } from "luxon";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { encryptFile, isEncryptionEnabled } from "../services/crypto";
import { uploadFile } from "../services/fileUpload";
import { getPersistentUserId } from "../utils/user";

export type VoiceRecorderState = "idle" | "recording" | "uploading";

export interface UseVoiceRecorderOptions {
  roomId: string;
  roomKey: string | null;
  onUploaded: (fileName: string) => void;
}

export function useVoiceRecorder({
  roomId,
  roomKey,
  onUploaded,
}: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    stopTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (state !== "idle") return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(
        "Microphone access denied. Please allow microphone access to record voice messages.",
      );
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(100);
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    setState("recording");

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);
  }, [state]);

  const cancel = useCallback(() => {
    if (state === "idle") return;
    mediaRecorderRef.current?.stop();
    cleanup();
    setElapsedMs(0);
    setState("idle");
  }, [state, cleanup]);

  const stopAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || state !== "recording") return;

    stopTimer();
    setState("uploading");

    recorder.onstop = async () => {
      const mimeType = recorder.mimeType;
      const ext = mimeType.includes("ogg") ? "ogg" : "webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      chunksRef.current = [];

      const userId = getPersistentUserId();
      const fileName = `voice_${DateTime.now().toMillis()}.${ext}`;

      try {
        const rawBytes = new Uint8Array(await blob.arrayBuffer());
        const processed =
          isEncryptionEnabled() && roomKey
            ? await encryptFile(rawBytes, roomKey)
            : rawBytes;
        await uploadFile(processed, fileName, roomId, userId);
        onUploaded(fileName);
      } catch (err) {
        console.error("Voice upload failed:", err);
        toast.error("Failed to send voice message. Please try again.");
      } finally {
        setElapsedMs(0);
        setState("idle");
      }
    };

    recorder.stop();
  }, [state, stopTimer, roomKey, roomId, onUploaded]);

  return { state, elapsedMs, startRecording, stopAndSend, cancel };
}
