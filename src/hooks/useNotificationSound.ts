import { useCallback, useRef } from "react";

const BEEP_FREQUENCY = 660;
const BEEP_DURATION = 0.15;
const BEEP_VOLUME = 0.3;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function isTabHidden(): boolean {
  return document.hidden;
}

export function useNotificationSound() {
  const lastPlayedRef = useRef(0);

  const playBeep = useCallback(() => {
    if (!isTabHidden()) return;

    // Throttle: don't beep more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    lastPlayedRef.current = now;

    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(BEEP_FREQUENCY, ctx.currentTime);

    gain.gain.setValueAtTime(BEEP_VOLUME, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + BEEP_DURATION,
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + BEEP_DURATION);
  }, []);

  return playBeep;
}
