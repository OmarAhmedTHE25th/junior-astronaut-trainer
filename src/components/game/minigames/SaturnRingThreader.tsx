'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface RingBoulder {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotSpeed: number;
  type: 'ice' | 'rock';
}

interface CryoPlume {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
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

export default function SaturnRingThreader() {
  const { dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shield, setShield] = useState<number>(100);
  const [score, setScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [geysersSkimmed, setGeysersSkimmed] = useState<number>(0);

  const shieldRef = useRef<number>(100);
  const scoreRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);

  // Probe horizontal position & target
  const probePosRef = useRef<{ x: number; targetX: number }>({ x: 320, targetX: 320 });

  const ringBouldersRef = useRef<RingBoulder[]>([]);
  const plumesRef = useRef<CryoPlume[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextEntityIdRef = useRef<number>(1);

  // Sound synthesis
  const playIceImpactSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }, []);

  const playGeyserBoostSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(987.77, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }, []);

  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalShield = shieldRef.current;
    const finalScore = victory
      ? scoreRef.current + finalShield * 35 + 2800
      : scoreRef.current;

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(300, finalScore),
        solsCompleted: 30,
        summaryLog: victory
          ? `Cassini Division transit successful! Threaded Saturn's ring-plane at 70,000 km/h with ${finalShield}% shield intact. Earned ${finalScore} PTS.`
          : `Probe pulverized by dense water-ice ring-plane debris during Cassini Division crossing.`,
      });
    }, 600);
  }, [dispatch]);

  // Mouse / Touch Steering
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    probePosRef.current.targetX = Math.max(30, Math.min(canvas.width - 30, x));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
    probePosRef.current.targetX = Math.max(30, Math.min(canvas.width - 30, x));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        probePosRef.current.targetX = Math.max(30, probePosRef.current.targetX - 35);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        probePosRef.current.targetX = Math.min(610, probePosRef.current.targetX + 35);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    let scoreTimer = 0;

    const gameLoop = () => {
      const W = canvas.width;
      const H = canvas.height;

      // ── 1. Cosmic Ring Plane Background ──
      ctx.fillStyle = '#03050c';
      ctx.fillRect(0, 0, W, H);

      // Distant Saturn Golden Cloud Deck Arc in upper backdrop
      const satGrad = ctx.createLinearGradient(0, 0, W, 80);
      satGrad.addColorStop(0, 'rgba(217, 119, 6, 0.15)');
      satGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.25)');
      satGrad.addColorStop(1, 'rgba(161, 98, 7, 0.15)');
      ctx.fillStyle = satGrad;
      ctx.fillRect(0, 0, W, 60);

      // Ring Plane Division Guidelines (Cassini Gap)
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([12, 12]);
      ctx.beginPath();
      ctx.moveTo(W * 0.25, 0);
      ctx.lineTo(W * 0.25, H);
      ctx.moveTo(W * 0.75, 0);
      ctx.lineTo(W * 0.75, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── 2. Probe Horizontal Smooth Interpolation ──
      const probe = probePosRef.current;
      probe.x += (probe.targetX - probe.x) * 0.18;
      const probeY = H - 55;

      // Passive score accrual
      scoreTimer++;
      if (scoreTimer >= 8 && !isGameOverRef.current) {
        scoreTimer = 0;
        scoreRef.current += 15;
        setScore(scoreRef.current);
      }

      // ── 3. Spawn Ring Boulders & Enceladus Plumes ──
      spawnTimer++;
      if (spawnTimer >= 18 && !isGameOverRef.current) {
        spawnTimer = 0;

        // Ice/rock boulders in ring-plane
        const gapSafeCenter = Math.random() * (W - 140) + 70;
        // Spawn 2-3 boulders leaving a moving gap
        for (let b = 0; b < 2; b++) {
          const bx = b === 0 ? gapSafeCenter - Math.random() * 90 - 45 : gapSafeCenter + Math.random() * 90 + 45;
          if (bx > 20 && bx < W - 20) {
            ringBouldersRef.current.push({
              id: nextEntityIdRef.current++,
              x: bx,
              y: -25,
              radius: Math.random() * 12 + 14,
              speed: Math.random() * 2 + 5.5,
              rotation: Math.random() * Math.PI,
              rotSpeed: (Math.random() - 0.5) * 0.05,
              type: Math.random() > 0.3 ? 'ice' : 'rock',
            });
          }
        }

        // Enceladus Geyser Cryovolcanic Plume
        if (Math.random() < 0.25) {
          plumesRef.current.push({
            id: nextEntityIdRef.current++,
            x: Math.random() * (W - 100) + 50,
            y: -60,
            width: 36,
            height: 60,
            speed: 6.2,
            active: true,
          });
        }
      }

      // ── 4. Update & Draw Enceladus Plumes ──
      for (let i = plumesRef.current.length - 1; i >= 0; i--) {
        const pl = plumesRef.current[i];
        pl.y += pl.speed;

        // Draw glowing cyan vapor plume
        ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.beginPath();
        ctx.ellipse(pl.x, pl.y, pl.width / 2, pl.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#bae6fd';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ENCELADUS VAPOR', pl.x, pl.y);

        // Skim check
        if (pl.active && Math.hypot(pl.x - probe.x, pl.y - probeY) < pl.width + 12) {
          pl.active = false;
          shieldRef.current = Math.min(100, shieldRef.current + 12);
          setShield(Math.round(shieldRef.current));
          scoreRef.current += 300;
          setScore(scoreRef.current);
          setGeysersSkimmed((prev) => prev + 1);
          playGeyserBoostSound();

          for (let p = 0; p < 12; p++) {
            particlesRef.current.push({
              x: pl.x,
              y: pl.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              alpha: 1,
              color: '#38bdf8',
              size: 2.5,
            });
          }
        }

        if (pl.y > H + 50) {
          plumesRef.current.splice(i, 1);
        }
      }

      // ── 5. Update & Draw Boulders ──
      for (let i = ringBouldersRef.current.length - 1; i >= 0; i--) {
        const b = ringBouldersRef.current[i];
        b.y += b.speed;
        b.rotation += b.rotSpeed;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rotation);

        if (b.type === 'ice') {
          // Water-Ice crystalline boulder
          ctx.fillStyle = '#93c5fd';
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#e0f2fe';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Ice facets
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-b.radius * 0.4, -b.radius * 0.4, b.radius * 0.8, b.radius * 0.3);
        } else {
          // Silicate rock fragment
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#44403c';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        ctx.restore();

        // Collision with Probe
        const dist = Math.hypot(b.x - probe.x, b.y - probeY);
        if (dist < b.radius + 15) {
          ringBouldersRef.current.splice(i, 1);
          shieldRef.current = Math.max(0, shieldRef.current - 18);
          setShield(Math.round(shieldRef.current));
          playIceImpactSound();
          playAlert(2);

          for (let p = 0; p < 14; p++) {
            particlesRef.current.push({
              x: probe.x,
              y: probeY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              alpha: 1,
              color: b.type === 'ice' ? '#93c5fd' : '#a8a29e',
              size: Math.random() * 3 + 1,
            });
          }

          if (shieldRef.current <= 0) finishGame(false);
          continue;
        }

        if (b.y > H + 40) {
          ringBouldersRef.current.splice(i, 1);
        }
      }

      // ── 6. Draw Cassini Probe ──
      ctx.save();
      ctx.translate(probe.x, probeY);

      // High-gain white antenna dish (front)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, -12, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      // Probe Gold Foil Body
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-10, -6, 20, 22);

      // Thruster nozzles & ion trail
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-6, 16, 4, 8);
      ctx.fillRect(2, 16, 4, 8);

      // Ion exhaust glow
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.moveTo(-6, 24);
      ctx.lineTo(0, 36);
      ctx.lineTo(6, 24);
      ctx.fill();

      ctx.restore();

      // ── 7. Draw Particles ──
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
  }, [finishGame, playAlert, playGeyserBoostSound, playIceImpactSound]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#080b18]/95 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-white font-mono animate-slide-up select-none">
      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-2xl shadow-inner">
            <span>✨</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Saturn Ring-Plane Transit
              </span>
              <span className="text-[10px] text-starlight/60">70,000 KM/H CASSINI DIVISION</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Ring-Plane Reflex Threader
            </h2>
          </div>
        </div>

        {/* Transit Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Transit Clock</span>
            <span className={`text-xl font-black tabular-nums ${timeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
              {timeRemaining}s
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Geysers Skimmed</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {geysersSkimmed}
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

      {/* ── DEFLECTOR SHIELD STATUS BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#0f172a] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Deflector Shield:</span>
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

        <div className="text-[10px] text-cyan-300 font-bold">
          70,000 KM/H
        </div>
      </div>

      {/* ── 60FPS CANVAS FLIGHT VIEWPORT ── */}
      <div
        className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-cyan-500/40 shadow-inner bg-black cursor-ew-resize"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full block" />

        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/60 font-mono flex items-center gap-3">
          <span>🧊 WEAVE THROUGH WATER-ICE BOULDERS</span>
          <span>•</span>
          <span className="text-cyan-400 font-bold">💧 SKIM ENCELADUS VAPOR PLUMES (+12% SHIELD)</span>
        </div>
      </div>

      {/* ── FOOTER CONTROLS ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-3">
          <span>🕹️ <strong>MOVE MOUSE / TOUCH DRAG / ARROW KEYS</strong> to Steer Left & Right</span>
        </div>
        <div className="text-[11px] text-cyan-300/80">
          Thread the ring plane for 45s to win!
        </div>
      </div>
    </div>
  );
}
