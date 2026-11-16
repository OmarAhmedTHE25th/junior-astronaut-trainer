'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface BossIntent {
  title: string;
  damage: number;
  description: string;
  icon: string;
  type: 'crush' | 'comets' | 'shear' | 'glitch';
}

const BOSS_INTENTS: BossIntent[] = [
  {
    title: 'Gravitational Lensing Crush',
    damage: 38,
    description: 'Compressing spacetime metric around the vessel. Massive tidal stress incoming.',
    icon: '🌀',
    type: 'crush',
  },
  {
    title: 'Inner Oort Comet Shower',
    damage: 48,
    description: 'Hurling a localized cluster of cryo-frozen cometary fragments at 120 km/s.',
    icon: '☄️',
    type: 'comets',
  },
  {
    title: 'Tidal Spacetime Shear',
    damage: 34,
    description: 'Micro-singularity resonance disrupting structural hull harmonics.',
    icon: '⚡',
    type: 'shear',
  },
  {
    title: 'Oort Void Graviton Pulse',
    damage: 42,
    description: 'Super-Earth core gravitational pulse radiating through dark matter filaments.',
    icon: '🌌',
    type: 'glitch',
  },
];

export default function PlanetXAnomalyBoss() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';

  const [gameState, setGameState] = useState<'briefing' | 'playing'>('briefing');
  // Core Combat Stats
  const [hull, setHull] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [driveCharge, setDriveCharge] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(3);
  const [turn, setTurn] = useState<number>(1);
  const [score, setScore] = useState<number>(0);

  // Turn Action Allocations
  const [driveAllocations, setDriveAllocations] = useState<number>(0); // 2 energy each
  const [shieldAllocations, setShieldAllocations] = useState<number>(0); // 1 energy each
  const [counterWaveAllocations, setCounterWaveAllocations] = useState<number>(0); // 1 energy each

  // Active Boss Status
  const [currentIntentIndex, setCurrentIntentIndex] = useState<number>(0);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [combatLog, setCombatLog] = useState<string>(
    'Sensors locked on Planet Nine at 600 AU. Extreme gravitational anomaly detected. Charge Alcubierre Drive to 100% to escape!'
  );

  const activeIntent = BOSS_INTENTS[currentIntentIndex % BOSS_INTENTS.length];

  // Current Phase
  const bossPhase = driveCharge >= 70 ? 3 : driveCharge >= 35 ? 2 : 1;

  // Sound synthesis
  const playWarpTone = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {}
  }, []);

  const playShieldHum = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }, []);

  const playBossStrikeSound = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.35);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }, []);

  // Energy Calculation
  const energyUsed = driveAllocations * 2 + shieldAllocations * 1 + counterWaveAllocations * 1;
  const energyAvailable = energy - energyUsed;

  // Execute Turn Sequence
  const handleExecuteTurn = () => {
    if (gameState !== 'playing' || isResolving || energyAvailable < 0) return;
    setIsResolving(true);

    // 1. Calculate Drive Gain
    const driveGain = driveAllocations * (bossPhase === 1 ? 24 : bossPhase === 2 ? 20 : 18);
    const newDrive = Math.min(100, driveCharge + driveGain);

    // 2. Calculate Shield & Counter-Wave Defense
    const shieldAbsorb = shieldAllocations * 35;
    const counterWaveStagger = counterWaveAllocations > 0;
    const baseDamage = activeIntent.damage + (bossPhase === 3 ? 12 : bossPhase === 2 ? 6 : 0);
    const mitigatedDamage = counterWaveStagger ? Math.round(baseDamage * 0.5) : baseDamage;
    const netDamage = Math.max(0, mitigatedDamage - shieldAbsorb);

    const newHull = Math.max(0, hull - netDamage);

    // Score earned (rebalanced: 75/60/50 pts per turn)
    const turnPoints = (driveAllocations * 75) + (counterWaveAllocations * 60) + (netDamage === 0 ? 50 : 20);
    const newScore = score + turnPoints;

    setScore(newScore);
    setDriveCharge(newDrive);
    setHull(newHull);

    if (driveAllocations > 0) playWarpTone();
    if (shieldAllocations > 0) playShieldHum();
    if (netDamage > 0) {
      playBossStrikeSound();
      playAlert(2);
    }

    // Log update
    let logMsg = `[Turn ${turn}] `;
    if (driveGain > 0) logMsg += `⚡ Alcubierre Drive +${driveGain}% (${newDrive}%). `;
    if (counterWaveStagger) logMsg += `🌌 Graviton Pulse staggered Anomaly! `;
    if (netDamage === 0) logMsg += `🛡️ Gravity Shield completely absorbed incoming strike!`;
    else logMsg += `⚠️ Vessel suffered ${netDamage} tidal damage (Hull at ${newHull}%).`;

    setCombatLog(logMsg);

    // Check Victory / Defeat
    setTimeout(() => {
      setIsResolving(false);

      if (newDrive >= 100) {
        // VICTORY! Alcubierre Warp Jump Initiated
        playSuccess();
        const baseScore = newScore + Math.round(newHull * 3) + 500;
        const finalScore = isTimed ? Math.min(1600, Math.round(baseScore * 1.3)) : Math.min(1400, baseScore);
        dispatch({
          type: 'COMPLETE_MINIGAME',
          victory: true,
          score: finalScore,
          solsCompleted: 30,
          summaryLog: `ALCUBIERRE WARP SUCCESSFUL! Escaped Planet Nine's gravitational well at 600 AU with ${newHull}% hull intact${isTimed ? ' (Blitz Multiplier Applied)' : ''}. Earned ${finalScore} PTS!`,
        });
        return;
      }

      if (newHull <= 0) {
        // DEFEAT
        dispatch({
          type: 'COMPLETE_MINIGAME',
          victory: false,
          score: newScore,
          solsCompleted: turn * 3,
          summaryLog: `Vessel crushed under Planet Nine's singularity field during Phase ${bossPhase}. Warp drive offline.`,
        });
        return;
      }

      if (isTimed && turn >= 4) {
        // Blitz turn limit reached
        dispatch({
          type: 'COMPLETE_MINIGAME',
          victory: false,
          score: newScore,
          solsCompleted: 20,
          summaryLog: `Emergency reactor overload! 4-turn operational blitz limit reached before Alcubierre drive reached 100%.`,
        });
        return;
      }

      // Reset allocations for next turn
      setDriveAllocations(0);
      setShieldAllocations(0);
      setCounterWaveAllocations(0);
      setEnergy(3);
      setTurn((prev) => prev + 1);
      setCurrentIntentIndex((prev) => prev + 1);
    }, 1200);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#090514]/95 border-2 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.3)] text-white font-mono animate-slide-up select-none overflow-hidden">
      {/* ── PRE-GAME BRIEFING OVERLAY ── */}
      {gameState === 'briefing' && (
        <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#110524] border-2 border-purple-400/70 rounded-3xl p-6 shadow-[0_0_40px_rgba(168,85,247,0.4)] space-y-4 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="text-3xl">🕳️</span>
              <div>
                <h3 className="font-heading font-black text-lg text-purple-300">
                  Planet X: Singularity Anomaly
                </h3>
                <p className="text-xs text-starlight/70 font-mono">
                  Trans-Neptunian Boss Encounter // 600 AU
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-amber-400 block">🎯 OBJECTIVE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Survive the primordial singularity&apos;s tidal strikes while allocating reactor energy across consoles to charge your Alcubierre Warp Drive to 100%.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-cyan-400 block">🕹️ CONTROLS:</span>
                <span className="text-starlight/90 leading-snug block">
                  Allocate your 3 Reactor Energy units each turn between Warp Drive (+charge), Gravity Shield (absorb damage), and Graviton Pulse (stagger anomaly). Then click &quot;EXECUTE TURN SEQUENCE&quot;.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-rose-400 block">⚠️ HOW YOU LOSE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Ship hull integrity drops to 0% from unshielded gravitational tidal strikes, or turn limit expires in Blitz mode.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white font-heading font-black text-base shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              START OPERATION 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-950/80 border border-purple-400/60 flex items-center justify-center text-2xl shadow-inner animate-pulse">
            <span>🪐</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Deep Space Boss // 600 AU
              </span>
              <span className="text-[10px] text-fuchsia-400/80">PHASE {bossPhase} OF 3</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Planet Nine Gravitational Anomaly
            </h2>
          </div>
        </div>

        {/* Combat Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Limit</span>
              <span className="text-xl font-black text-rose-400 tabular-nums">
                Turn {turn}/4
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-purple-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-purple-300 block">Warp Charge</span>
            <span className="text-xl font-black text-purple-400 tabular-nums">
              {driveCharge}%
            </span>
          </div>

          {!isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
              <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Turn</span>
              <span className="text-xl font-black text-amber-400 tabular-nums">
                {turn}
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Score</span>
            <span className="text-xl font-black text-emerald-400 tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── ALCUBIERRE WARP DRIVE CHARGE BAR ── */}
      <div className="w-full flex flex-col gap-1.5 p-3 rounded-2xl bg-[#140b2a] border border-purple-500/40">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-purple-300">
            <span>⚡</span> ALCUBIERRE ESCAPE DRIVE WARP COILS:
          </span>
          <span className="text-purple-200 font-mono text-sm">{driveCharge} / 100%</span>
        </div>
        <div className="w-full h-3.5 rounded-full bg-black/70 overflow-hidden border border-purple-500/30 relative">
          <div
            className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-400 transition-all duration-500 rounded-full shadow-[0_0_15px_rgba(192,132,252,0.8)]"
            style={{ width: `${driveCharge}%` }}
          />
        </div>
      </div>

      {/* ── BOSS INTENT TELEGRAPH CARD ── */}
      <div className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-rose-950/80 border-2 border-rose-500/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-black/60 border border-rose-500/50 flex items-center justify-center text-3xl shrink-0 animate-bounce-subtle">
            <span>{activeIntent.icon}</span>
          </div>
          <div>
            <div className="text-[10px] font-mono font-black uppercase text-rose-400 tracking-wider">
              INCOMING ANOMALY INTENT (NEXT TURN)
            </div>
            <div className="text-base sm:text-lg font-heading font-black text-white flex items-center gap-2">
              <span>{activeIntent.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                {activeIntent.damage + (bossPhase === 3 ? 12 : bossPhase === 2 ? 6 : 0)} DMG
              </span>
            </div>
            <p className="text-xs text-starlight/70 leading-snug">{activeIntent.description}</p>
          </div>
        </div>

        {/* Boss Phase Badge */}
        <div className="text-right shrink-0">
          <span className="text-[10px] text-fuchsia-300 font-bold block">Singularity Threat:</span>
          <span className="text-sm font-black text-white uppercase tracking-wider">
            {bossPhase === 3 ? '🔴 CRITICAL CORE' : bossPhase === 2 ? '🟠 HORIZON SURGE' : '🟡 VOID FIELD'}
          </span>
        </div>
      </div>

      {/* ── PLAYER VESSEL STATUS & REACTOR ENERGY ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#140b2a] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Hull Integrity:</span>
          <span className={`text-xs font-black font-mono ${hull <= 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {hull}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-300 font-bold">Reactor Energy:</span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-black transition-all ${
                  i < energyAvailable
                    ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                    : 'bg-black/60 border-white/10 text-white/20'
                }`}
              >
                ⚡
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 TACTICAL CONSOLES (ENERGY SPENDING) ── */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Console 1: Alcubierre Drive */}
        <div className="p-3 rounded-2xl bg-[#0e0720] border border-purple-500/40 flex flex-col justify-between gap-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                <span>⚡</span> Charge Warp Drive
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                2 Energy
              </span>
            </div>
            <p className="text-[11px] text-starlight/70 mt-1 leading-snug">
              Channel reactor plasma into warp coils (+20% drive charge).
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-purple-500/20">
            <span className="text-xs font-bold text-white">Active: {driveAllocations}x</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDriveAllocations(Math.max(0, driveAllocations - 1))}
                disabled={driveAllocations === 0 || isResolving}
                className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setDriveAllocations(driveAllocations + 1)}
                disabled={energyAvailable < 2 || isResolving}
                className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Console 2: Gravity Shield */}
        <div className="p-3 rounded-2xl bg-[#0e0720] border border-cyan-500/40 flex flex-col justify-between gap-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                <span>🛡️</span> Phase Gravity Shield
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                1 Energy
              </span>
            </div>
            <p className="text-[11px] text-starlight/70 mt-1 leading-snug">
              Invert deflector polarity to absorb 35 incoming damage.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-cyan-500/20">
            <span className="text-xs font-bold text-white">Active: {shieldAllocations}x</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShieldAllocations(Math.max(0, shieldAllocations - 1))}
                disabled={shieldAllocations === 0 || isResolving}
                className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setShieldAllocations(shieldAllocations + 1)}
                disabled={energyAvailable < 1 || isResolving}
                className="w-7 h-7 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Console 3: Pulse Graviton Counter-Wave */}
        <div className="p-3 rounded-2xl bg-[#0e0720] border border-amber-500/40 flex flex-col justify-between gap-2.5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <span>🌌</span> Graviton Counter-Pulse
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                1 Energy
              </span>
            </div>
            <p className="text-[11px] text-starlight/70 mt-1 leading-snug">
              Disrupt anomaly singularity: reduces intent damage by 50%.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
            <span className="text-xs font-bold text-white">Active: {counterWaveAllocations}x</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCounterWaveAllocations(Math.max(0, counterWaveAllocations - 1))}
                disabled={counterWaveAllocations === 0 || isResolving}
                className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setCounterWaveAllocations(counterWaveAllocations + 1)}
                disabled={energyAvailable < 1 || counterWaveAllocations >= 1 || isResolving}
                className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── EXECUTE TURN BUTTON ── */}
      <div className="w-full flex items-center justify-center pt-2">
        <button
          type="button"
          onClick={handleExecuteTurn}
          disabled={isResolving}
          className="
            w-full py-4 rounded-2xl
            bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500
            border-2 border-purple-300 text-white font-heading font-black text-lg tracking-wider
            shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-101 active:scale-99 transition-all cursor-pointer
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {isResolving ? '⚡ RESOLVING TACTICAL SEQUENCE...' : '⚡ EXECUTE TACTICAL SEQUENCE (END TURN)'}
        </button>
      </div>

      {/* ── LIVE COMBAT TELEMETRY LOG ── */}
      <div className="w-full p-2.5 rounded-xl bg-black/60 border border-purple-500/30 text-xs flex items-center gap-2">
        <span className="text-purple-400 font-bold shrink-0">📡 TELEMETRY:</span>
        <span className="text-starlight/90 truncate font-mono">{combatLog}</span>
      </div>
    </div>
  );
}
