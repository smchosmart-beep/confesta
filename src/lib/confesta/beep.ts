// Short success beep using WebAudio. Safe on SSR and unsupported browsers.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  } catch {
    return null;
  }
}

export function playBeep(): void {
  try {
    const ac = getCtx();
    if (!ac) return;
    if (ac.state === "suspended") {
      void ac.resume().catch(() => {});
    }
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    const now = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  } catch {
    // ignore
  }
}
