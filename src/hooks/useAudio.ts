import { useState, useCallback } from "react";

export function useAudio() {
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtx) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioCtx(ctx);
      } catch {}
    }
  }, [audioCtx]);

  const beep = useCallback(
    (freq = 880, ms = 120) => {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.value = 0.06;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => o.stop(), ms);
    },
    [audioCtx]
  );

  return { initAudio, beep };
}
