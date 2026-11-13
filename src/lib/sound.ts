// ─── Junior Astronaut Mission Trainer – Procedural Web Audio System ───
// Zero external files, zero copyright. 100% synthesized via Web Audio API.

import { useState, useEffect, useCallback } from 'react';

let audioCtx: AudioContext | null = null;
let ambientGainNode: GainNode | null = null;
let ambientOsc1: OscillatorNode | null = null;
let ambientOsc2: OscillatorNode | null = null;
let isAmbientPlaying = false;

const STORAGE_KEY = 'junior_astronaut_muted';
const listeners = new Set<(muted: boolean) => void>();

/** Check if muted from localStorage (safely handles SSR) */
export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Set mute state and update localStorage & ambient hum */
export function setSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
  } catch {}

  // Update ambient volume if playing
  if (ambientGainNode && audioCtx) {
    ambientGainNode.gain.setTargetAtTime(muted ? 0 : 0.03, audioCtx.currentTime, 0.05);
  }

  listeners.forEach((fn) => fn(muted));
}

/** Toggle mute state */
export function toggleSound(): boolean {
  const newMuted = !isSoundMuted();
  setSoundMuted(newMuted);
  return newMuted;
}

/** Subscribe to mute state changes */
export function subscribeMuteChange(listener: (muted: boolean) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Lazily get or create AudioContext upon user gesture */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// ── Sound Synthesizers ───────────────────────────────────────

/** Crisp high-tech UI blip for buttons & clicks */
export function playClick(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/** Confirming power-up chime when selecting an outpost action */
export function playAction(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25]; // C5 -> E5

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  } catch {}
}

/** Urgent two-tone space klaxon for crisis events */
export function playAlert(severity: 1 | 2 | 3 = 2): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const baseFreq = severity === 3 ? 700 : severity === 2 ? 520 : 400;
    const highFreq = baseFreq * 1.5;

    // Two rapid warble pulses
    for (let i = 0; i < 2; i++) {
      const pulseStart = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq, pulseStart);
      osc.frequency.linearRampToValueAtTime(highFreq, pulseStart + 0.06);
      osc.frequency.linearRampToValueAtTime(baseFreq, pulseStart + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, pulseStart);

      gain.gain.setValueAtTime(0.18, pulseStart);
      gain.gain.exponentialRampToValueAtTime(0.01, pulseStart + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(pulseStart);
      osc.stop(pulseStart + 0.13);
    }
  } catch {}
}

/** Positive ascending chord for resolving events or viewing NASA facts */
export function playSuccess(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    chord.forEach((freq, idx) => {
      const noteStart = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.12, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.3);
    });
  } catch {}
}

/** Subtle low pulse when a vital resource <= 20% */
export function playWarning(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  } catch {}
}

/** Celebratory fanfare for mission victory */
export function playVictory(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.1, t: 0.0 },
      { f: 659.25, d: 0.1, t: 0.1 },
      { f: 783.99, d: 0.1, t: 0.2 },
      { f: 1046.5, d: 0.35, t: 0.3 },
      { f: 880.0, d: 0.15, t: 0.65 },
      { f: 1046.5, d: 0.5, t: 0.8 },
    ];

    melody.forEach(({ f, d, t }) => {
      const noteStart = now + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, noteStart);

      gain.gain.setValueAtTime(0.18, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + d + 0.02);
    });
  } catch {}
}

/** Descending dramatic synth tone on mission failure */
export function playGameOver(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [
      { f: 392.0, t: 0.0, d: 0.25 }, // G4
      { f: 349.23, t: 0.22, d: 0.25 }, // F4
      { f: 311.13, t: 0.44, d: 0.3 }, // Eb4
      { f: 261.63, t: 0.7, d: 0.5 }, // C4
    ];

    notes.forEach(({ f, t, d }) => {
      const noteStart = now + t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, noteStart);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, noteStart);
      filter.frequency.exponentialRampToValueAtTime(150, noteStart + d);

      gain.gain.setValueAtTime(0.16, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + d);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + d + 0.02);
    });
  } catch {}
}

// ── Ambient Space Drone ──────────────────────────────────────

/** Start subtle, low-volume background cosmic hum in /game */
export function startAmbientHum(): void {
  if (isAmbientPlaying) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Two detuned low oscillators through lowpass filter
    ambientOsc1 = ctx.createOscillator();
    ambientOsc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    ambientGainNode = ctx.createGain();

    ambientOsc1.type = 'sine';
    ambientOsc1.frequency.setValueAtTime(55, now); // A1

    ambientOsc2.type = 'triangle';
    ambientOsc2.frequency.setValueAtTime(56.2, now); // Slight beat frequency

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);

    const targetVolume = isSoundMuted() ? 0 : 0.03;
    ambientGainNode.gain.setValueAtTime(0.001, now);
    ambientGainNode.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVolume), now + 1.5);

    ambientOsc1.connect(filter);
    ambientOsc2.connect(filter);
    filter.connect(ambientGainNode);
    ambientGainNode.connect(ctx.destination);

    ambientOsc1.start(now);
    ambientOsc2.start(now);
    isAmbientPlaying = true;
  } catch {}
}

/** Stop ambient space drone */
export function stopAmbientHum(): void {
  if (!isAmbientPlaying) return;
  const ctx = audioCtx;

  try {
    if (ctx && ambientGainNode) {
      ambientGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    }
    setTimeout(() => {
      try {
        ambientOsc1?.stop();
        ambientOsc2?.stop();
        ambientOsc1?.disconnect();
        ambientOsc2?.disconnect();
      } catch {}
      ambientOsc1 = null;
      ambientOsc2 = null;
      ambientGainNode = null;
      isAmbientPlaying = false;
    }, 300);
  } catch {
    isAmbientPlaying = false;
  }
}

// ── React Hook ───────────────────────────────────────────────

export function useSound() {
  const [muted, setMutedState] = useState<boolean>(() => isSoundMuted());

  useEffect(() => {
    setMutedState(isSoundMuted());
    const unsubscribe = subscribeMuteChange((newMuted) => {
      setMutedState(newMuted);
    });
    return unsubscribe;
  }, []);

  const toggle = useCallback(() => {
    const next = toggleSound();
    setMutedState(next);
    if (!next) {
      playClick();
    }
  }, []);

  return {
    isMuted: muted,
    toggleSound: toggle,
    playClick,
    playAction,
    playAlert,
    playSuccess,
    playWarning,
    playVictory,
    playGameOver,
    startAmbientHum,
    stopAmbientHum,
  };
}
