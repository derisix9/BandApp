/**
 * Web Audio API synthesizer for instant quiz sound effects (Correct, Incorrect, Timeout, Tick).
 * Completely zero-dependency and works seamlessly across mobile and desktop browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn("Web Audio API not supported or blocked:", e);
    return null;
  }
}

/**
 * Plays a cheerful, crystal-clear ascending major chime for correct answers.
 */
export function playCorrectSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Notes: G5 (783.99 Hz), C6 (1046.50 Hz), E6 (1318.51 Hz)
  const notes = [
    { freq: 783.99, start: 0, duration: 0.12 },
    { freq: 1046.5, start: 0.08, duration: 0.14 },
    { freq: 1318.51, start: 0.16, duration: 0.28 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    // Smooth ADSR envelope
    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });
}

/**
 * Plays a soft, distinct low downward tone for incorrect answers.
 */
export function playIncorrectSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Two descending soft tones
  const notes = [
    { freq: 330, start: 0, duration: 0.15 },
    { freq: 220, start: 0.12, duration: 0.25 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + start);

    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });
}

/**
 * Plays a brief double-tick alert when a question's individual timer expires.
 */
export function playTimeoutAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  [0, 0.1].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, now + delay);

    gain.gain.setValueAtTime(0.001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.15, now + delay + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.07);
  });
}

/**
 * Plays a distinct warning buzzer when an anti-fraud security infraction occurs.
 */
export function playSecurityAlarmSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  [0, 0.18].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, now + delay);
    osc.frequency.exponentialRampToValueAtTime(120, now + delay + 0.14);

    gain.gain.setValueAtTime(0.001, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.14);
  });
}

