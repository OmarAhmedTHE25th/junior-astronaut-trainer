'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface DarkSpotVortex {
  id: number;
  lane: number;
  x: number;
  radius: number;
  speed: number;
}

interface TailwindSlipstream {
  id: number;
  lane: number;
  x: number;
  speed: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

const LANE_COUNT = 4;
const LANE_NAMES = ['Sub-Troposphere (100km)', 'Methane Jet (250km)', 'Mid Stratosphere (400km)', 'Triton Auroral Fringe (550km)'];

export default function NeptuneJetstreamRunner() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';
  const hasChronoStabilizer = state.equippedTacticalItem === 'chrono-stabilizer';
  const hasQuantumScanner = state.equippedTacticalItem === 'quantum-scanner';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shield, setShield] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [score, setScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => (isTimed ? 30 : 45) + (hasChronoStabilizer ? 10 : 0));
  const [activeLane, setActiveLane] = useState<number>(1);
  const [slipstreamStreak, setSlipstreamStreak] = useState<number>(0);

  const shieldRef = useRef<number>(hasAegisHullMatrix ? 135 : 100);
  const scoreRef = useRef<number>(0);
  const activeLaneRef = useRef<number>(1);
  const isGameOverRef = useRef<boolean>(false);

  const obstaclesRef = useRef<DarkSpotVortex[]>([]);
  const slipstreamsRef = useRef<TailwindSlipstream[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextEntityIdRef = useRef<number>(1);

  // Sound synthesis
  const playVortexHitSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }, []);

  const playSlipstreamWhoosh = useCallback(() => {
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
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }, []);

  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalShield = shieldRef.current;
    const baseScore = victory
      ? scoreRef.current + finalShield * 40 + 3500
      : scoreRef.current;
    const finalScore = isTimed && victory ? Math.round(baseScore * 1.5) : baseScore;

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(400, finalScore),
        solsCompleted: 30,
        summaryLog: victory
          ? `Neptune Supersonic Jetstream run complete! Surfed 2,100 km/h winds with ${finalShield}% shield intact${isTimed ? ' (Blitz 1.5x Multiplier Applied)' : ''}. Unlocked Planet Nine clearance! Earned ${finalScore} PTS.`
          : `Probe torn apart in Great Dark Spot supersonic shear vortex. Telemetry lost.`,
      });
    }, 600);
  }, [dispatch, isTimed]);

  // Lane switching
  const setLane = useCallback((targetLane: number) => {
    const clamped = Math.max(0, Math.min(LANE_COUNT - 1, targetLane));
    activeLaneRef.current = clamped;
    setActiveLane(clamped);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        setLane(activeLaneRef.current - 1);
      } else if (e.key === 'ArrowDown' || e.key === 's') {
        e.preventDefault();
        setLane(activeLaneRef.current + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setLane]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (isGameOverRef.current) return;

      setTimeRemaining((prev) => {
        if (prev <= 1) {
          playSuccess();
          finishGame(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishGame, playSuccess]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnTimer = 0;
    let speedBonusTimer = 0;

    const gameLoop = () => {
      const W = canvas.width;
      const H = canvas.height;
      const laneHeight = H / LANE_COUNT;

      // ── 1. Neptune Deep Cobalt Atmosphere ──
      const nepGrad = ctx.createLinearGradient(0, 0, 0, H);
      nepGrad.addColorStop(0, '#020617'); // upper dark cobalt
      nepGrad.addColorStop(0.5, '#1e3a8a'); // rich ultramarine jetstream
      nepGrad.addColorStop(1, '#0c1e4a'); // deep mantle
      ctx.fillStyle = nepGrad;
      ctx.fillRect(0, 0, W, H);

      // Lane divider lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 10]);
      for (let l = 1; l < LANE_COUNT; l++) {
        ctx.beginPath();
        ctx.moveTo(0, l * laneHeight);
        ctx.lineTo(W, l * laneHeight);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Supersonic wind streaks rushing past from right to left (2,100 km/h)
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.2)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 8; s++) {
        const sy = ((s * 47 + (Date.now() * 0.3)) % H);
        const sx = W - ((Date.now() * 1.5 + s * 130) % (W + 200));
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - 90, sy);
        ctx.stroke();
      }

      // Passive points
      speedBonusTimer++;
      if (speedBonusTimer >= 8 && !isGameOverRef.current) {
        speedBonusTimer = 0;
        scoreRef.current += 20;
        setScore(scoreRef.current);
      }

      // ── 2. Spawn Vortexes & Slipstreams ──
      spawnTimer++;
      if (spawnTimer >= 26 && !isGameOverRef.current) {
        spawnTimer = 0;

        // Choose 1-2 random lanes for vortexes
        const chosenLane = Math.floor(Math.random() * LANE_COUNT);
        obstaclesRef.current.push({
          id: nextEntityIdRef.current++,
          lane: chosenLane,
          x: W + 50,
          radius: 26,
          speed: 6.8,
        });

        // Spawn slipstream in another lane
        const slipLane = (chosenLane + (Math.random() > 0.5 ? 1 : 2)) % LANE_COUNT;
        slipstreamsRef.current.push({
          id: nextEntityIdRef.current++,
          lane: slipLane,
          x: W + 70,
          speed: 7.2,
          collected: false,
        });
      }

      // ── 3. Update & Draw Slipstreams ──
      for (let i = slipstreamsRef.current.length - 1; i >= 0; i--) {
        const sl = slipstreamsRef.current[i];
        sl.x -= sl.speed;
        const sy = sl.lane * laneHeight + laneHeight / 2;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(sl.x, sy, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 2,100 KM/H', sl.x, sy + 3);

        // Check collection
        const probeX = 90;
        const probeY = activeLaneRef.current * laneHeight + laneHeight / 2;
        if (!sl.collected && sl.lane === activeLaneRef.current && Math.abs(sl.x - probeX) < 32) {
          sl.collected = true;
          scoreRef.current += 300;
          setScore(scoreRef.current);
          setSlipstreamStreak((prev) => prev + 1);
          playSlipstreamWhoosh();

          for (let p = 0; p < 10; p++) {
            particlesRef.current.push({
              x: sl.x,
              y: sy,
              vx: -Math.random() * 5 - 2,
              vy: (Math.random() - 0.5) * 4,
              alpha: 1,
              color: '#38bdf8',
              size: 2.5,
            });
          }
        }

        if (sl.x < -60) {
          slipstreamsRef.current.splice(i, 1);
        }
      }

      // ── 4. Update & Draw Great Dark Spot Vortexes ──
      for (let i = obstaclesRef.current.length - 1; i >= 0; i--) {
        const obs = obstaclesRef.current[i];
        obs.x -= obs.speed;
        const oy = obs.lane * laneHeight + laneHeight / 2;

        // Dark Spot Anticyclone Vortex (Deep black with companion cloud)
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.ellipse(obs.x, oy, obs.radius * 1.3, obs.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // White methane cirrus companion smudge (Scooter)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(obs.x + 12, oy - 8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Quantum Radar Hazard Warning Ring
        if (hasQuantumScanner) {
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.ellipse(obs.x, oy, obs.radius + 8, obs.radius * 0.6 + 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DARK SPOT', obs.x, oy + 3);

        // Check collision
        const probeX = 90;
        if (obs.lane === activeLaneRef.current && Math.abs(obs.x - probeX) < obs.radius + 14) {
          obstaclesRef.current.splice(i, 1);
          shieldRef.current = Math.max(0, shieldRef.current - 20);
          setShield(Math.round(shieldRef.current));
          setSlipstreamStreak(0);
          playVortexHitSound();
          playAlert(2);

          for (let p = 0; p < 14; p++) {
            particlesRef.current.push({
              x: probeX,
              y: oy,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              alpha: 1,
              color: '#3b82f6',
              size: 3,
            });
          }

          if (shieldRef.current <= 0) finishGame(false);
          continue;
        }

        if (obs.x < -60) {
          obstaclesRef.current.splice(i, 1);
        }
      }

      // ── 5. Draw Supersonic Surfer Probe ──
      const curY = activeLaneRef.current * laneHeight + laneHeight / 2;
      const px = 90;

      ctx.save();
      ctx.translate(px, curY);

      // Aerodynamic Needle Fuselage (Titanium / Methane resistant)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, -10);
      ctx.lineTo(-8, 0);
      ctx.lineTo(-14, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cockpit Glow
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(6, 0, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Supersonic Twin Shockwave Cones
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-24, -22);
      ctx.moveTo(22, 0);
      ctx.lineTo(-24, 22);
      ctx.stroke();

      ctx.restore();

      // ── 6. Draw Particles ──
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.04;
        if (pt.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.fillStyle = pt.color;
          ctx.globalAlpha = pt.alpha;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [finishGame, playAlert, playSlipstreamWhoosh, playVortexHitSound]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#04081c]/95 border-2 border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.25)] text-white font-mono animate-slide-up select-none">
      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-950/80 border border-blue-400/60 flex items-center justify-center text-2xl shadow-inner">
            <span>🌊</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Neptune Supersonic Runner
              </span>
              <span className="text-[10px] text-starlight/60">2,100 KM/H METHANE JETSTREAM</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Supersonic Jetstream Surfer
            </h2>
          </div>
        </div>

        {/* Flight Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Clock</span>
              <span className="text-xl font-black text-rose-400 tabular-nums">
                {timeRemaining}s
              </span>
            </div>
          )}

          {!isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-blue-500/30 text-center">
              <span className="text-[9px] uppercase tracking-wider text-blue-300 block">Surfing Clock</span>
              <span className={`text-xl font-black tabular-nums ${timeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`}>
                {timeRemaining}s
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Current Lane</span>
            <span className="text-sm font-black text-amber-300 truncate max-w-[140px] block mt-1">
              Lane {activeLane + 1}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block">Score</span>
            <span className="text-xl font-black text-emerald-400 tabular-nums">
              {score.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── JETSTREAM SHIELD BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#09153a] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Kinetic Shield:</span>
          <span className={`text-xs font-black font-mono ${shield <= 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {shield}%
          </span>
        </div>

        <div className="flex-1 max-w-md h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              shield <= 25 ? 'bg-rose-500 animate-pulse' : shield <= 50 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${shield}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-starlight/60 uppercase">Slipstream Streak:</span>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
            {slipstreamStreak}
          </span>
        </div>
      </div>

      {/* ── 60FPS 4-LANE CANVAS RUNNER ── */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-blue-500/40 shadow-inner bg-black">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onClick={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
            const clickedLane = Math.floor(y / (canvas.height / LANE_COUNT));
            setLane(clickedLane);
          }}
          className="w-full h-full block cursor-pointer"
        />

        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/60 font-mono flex items-center gap-3">
          <span>🌀 DODGE GREAT DARK SPOT VORTEX CELLS</span>
          <span>•</span>
          <span className="text-cyan-300 font-bold">⚡ RIDE 2,100 KM/H SLIPSTREAMS (+300 PTS)</span>
        </div>
      </div>

      {/* ── 4-LANE CLICKABLE CONTROLLERS ── */}
      <div className="w-full grid grid-cols-4 gap-2">
        {LANE_NAMES.map((name, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setLane(index)}
            className={`p-2 rounded-xl text-left border transition-all text-xs cursor-pointer ${
              activeLane === index
                ? 'bg-blue-600/40 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-102 font-bold'
                : 'bg-black/40 border-white/10 text-white/60 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span>Lane {index + 1}</span>
              {activeLane === index && <span className="text-cyan-300 animate-pulse">● ACTIVE</span>}
            </div>
            <div className="truncate text-[10px] opacity-80 mt-0.5">{name}</div>
          </button>
        ))}
      </div>

      {/* ── FOOTER CONTROLS ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-3">
          <span>🕹️ <strong>UP / DOWN ARROW KEYS OR W/S</strong> or click lanes to switch altitudes</span>
        </div>
        <div className="text-[11px] text-cyan-300/80">
          Survive 45 seconds to unlock Planet Nine!
        </div>
      </div>
    </div>
  );
}
