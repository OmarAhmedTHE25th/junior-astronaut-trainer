'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface ScienceRing {
  id: number;
  angle: number;
  radius: number;
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

export default function JupiterGravitySlingshot() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'briefing' | 'playing'>('briefing');
  const [shield, setShield] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [score, setScore] = useState<number>(0);
  const [passCount, setPassCount] = useState<number>(1);
  const [perijoveDist, setPerijoveDist] = useState<number>(4200); // km above clouds
  const [scienceCollected, setScienceCollected] = useState<number>(0);

  const shieldRef = useRef<number>(hasAegisHullMatrix ? 135 : 100);
  const scoreRef = useRef<number>(0);
  const passCountRef = useRef<number>(1);
  const isGameOverRef = useRef<boolean>(false);

  // Probe orbital parameters
  const probeRef = useRef<{
    angle: number;
    radius: number;
    baseRadius: number;
    angularVelocity: number;
    eccentricity: number;
  }>({
    angle: 0,
    radius: 120,
    baseRadius: 120,
    angularVelocity: isTimed ? 0.046 : 0.032,
    eccentricity: 0.25,
  });

  // Io Moon parameters
  const ioRef = useRef<{
    angle: number;
    radius: number;
    angularVelocity: number;
  }>({
    angle: Math.PI / 2,
    radius: 155,
    angularVelocity: 0.018,
  });

  const scienceRingsRef = useRef<ScienceRing[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextEntityIdRef = useRef<number>(1);

  // Web Audio synth
  const playThrusterSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }, []);

  const playChimeSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.setValueAtTime(1046.5, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }, []);

  const playRadiationSound = useCallback(() => {
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
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(360, now + 0.05);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }, []);

  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalShield = shieldRef.current;
    const baseScore = victory
      ? scoreRef.current + Math.round(finalShield * 2.5) + 350
      : scoreRef.current;
    const finalScore = isTimed && victory ? Math.min(1300, Math.round(baseScore * 1.3)) : Math.min(1100, baseScore);

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(150, finalScore),
        solsCompleted: 30,
        summaryLog: victory
          ? `Juno-style gravity assist complete! 5 perijove passes survived with ${finalShield}% radiation shielding intact${isTimed ? ' (Blitz Multiplier Applied)' : ''}. Earned ${finalScore} PTS.`
          : `Probe titanium radiation vault breached during Jovian magnetosphere perijove pass. Telemetry lost.`,
      });
    }, 600);
  }, [dispatch, isTimed]);

  // Click / Space perijove burn: toggles between high altitude & tight low perijove skim
  const handleThrusterBurn = useCallback(() => {
    if (gameState !== 'playing' || isGameOverRef.current) return;
    playThrusterSound();

    const p = probeRef.current;
    if (p.baseRadius > 95) {
      // Pull inward for high science perijove dive
      p.baseRadius = 82;
      p.angularVelocity = 0.045;
    } else {
      // Burn outward away from radiation
      p.baseRadius = 125;
      p.angularVelocity = 0.030;
    }

    // Burn particles
    const cx = 320;
    const cy = 180;
    const r = p.radius;
    const px = cx + Math.cos(p.angle) * r;
    const py = cy + Math.sin(p.angle) * r;

    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x: px,
        y: py,
        vx: -Math.cos(p.angle) * 3 + (Math.random() - 0.5) * 2,
        vy: -Math.sin(p.angle) * 3 + (Math.random() - 0.5) * 2,
        alpha: 1,
        color: '#38bdf8',
        size: Math.random() * 3 + 1,
      });
    }
  }, [playThrusterSound]);

  // Populate science data nodes on orbit track
  useEffect(() => {
    const nodes: ScienceRing[] = [];
    for (let i = 0; i < 12; i++) {
      nodes.push({
        id: nextEntityIdRef.current++,
        angle: (i / 12) * Math.PI * 2,
        radius: 86 + (i % 2 === 0 ? -4 : 6),
        collected: false,
      });
    }
    scienceRingsRef.current = nodes;
  }, []);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastLapAngle = 0;

    const gameLoop = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      // ── 1. Deep Space Void & Distant Starfield ──
      ctx.fillStyle = '#050711';
      ctx.fillRect(0, 0, W, H);

      // Starfield dots
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 30; s++) {
        const sx = ((s * 97 + 13) % W);
        const sy = ((s * 53 + 29) % H);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // ── 2. Io Volcanic Plasma Torus (Dangerous Radiation Ring) ──
      const ioTorusRadius = 155;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, ioTorusRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── 3. Central Giant Jupiter Body & Atmospheric Bands ──
      const jupRadius = 55;
      const jupGrad = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, jupRadius);
      jupGrad.addColorStop(0, '#fef3c7');
      jupGrad.addColorStop(0.3, '#d97706');
      jupGrad.addColorStop(0.7, '#78350f');
      jupGrad.addColorStop(1, '#451a03');

      ctx.fillStyle = jupGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, jupRadius, 0, Math.PI * 2);
      ctx.fill();

      // Great Red Spot (GRS) storm
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.ellipse(cx + 18, cy + 12, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Auroral Polar Oval Glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy - jupRadius + 3, 22, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      // ── 4. Science Data Ring Collectibles ──
      for (const node of scienceRingsRef.current) {
        if (!node.collected) {
          const nx = cx + Math.cos(node.angle) * node.radius;
          const ny = cy + Math.sin(node.angle) * node.radius;

          ctx.fillStyle = '#facc15';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(nx, ny, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // ── 5. Moon Io Orbit ──
      const io = ioRef.current;
      io.angle += io.angularVelocity;
      const iox = cx + Math.cos(io.angle) * io.radius;
      const ioy = cy + Math.sin(io.angle) * io.radius;

      // Io sulfur moon body
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(iox, ioy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Plume aura
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.beginPath();
      ctx.arc(iox, ioy, 10, 0, Math.PI * 2);
      ctx.fill();

      // ── 6. Probe Orbit Physics & Motion ──
      const p = probeRef.current;
      const prevAngle = p.angle;
      if (gameState === 'playing' && !isGameOverRef.current) {
        p.angle += p.angularVelocity;
      }

      // Elliptical perijove radius variation
      p.radius = p.baseRadius * (1 - p.eccentricity * Math.cos(p.angle));

      const px = cx + Math.cos(p.angle) * p.radius;
      const py = cy + Math.sin(p.angle) * p.radius;

      // Update perijove telemetry display
      const currentAltitude = Math.round((p.radius - jupRadius) * 65);
      setPerijoveDist(currentAltitude);

      // Check Lap (Pass) Completion (when crossing 2*PI boundary)
      if (gameState === 'playing' && prevAngle < Math.PI * 2 && p.angle >= Math.PI * 2) {
        p.angle %= (Math.PI * 2);
        const nextPass = passCountRef.current + 1;
        if (nextPass > 5) {
          // Completed all 5 passes
          playSuccess();
          finishGame(true);
        } else {
          passCountRef.current = nextPass;
          setPassCount(nextPass);
          scoreRef.current += 100;
          setScore(scoreRef.current);
          playChimeSound();

          // Respawn collected science rings for next pass
          for (const node of scienceRingsRef.current) {
            node.collected = false;
          }
        }
      }

      // ── 7. Radiation Collision Checks ──
      if (gameState === 'playing' && !isGameOverRef.current) {
        // Check Io Torus proximity
        const distFromCenter = p.radius;
        if (Math.abs(distFromCenter - ioTorusRadius) < 14) {
          // In Io radiation torus!
          shieldRef.current = Math.max(0, shieldRef.current - 0.35);
          setShield(Math.round(shieldRef.current));
          if (Math.random() < 0.15) playRadiationSound();
          if (shieldRef.current <= 0) finishGame(false);
        }

        // Check proximity to Io moon itself
        const distToIo = Math.hypot(px - iox, py - ioy);
        if (distToIo < 16) {
          shieldRef.current = Math.max(0, shieldRef.current - 1.2);
          setShield(Math.round(shieldRef.current));
          playAlert(2);
          if (shieldRef.current <= 0) finishGame(false);
        }

        // Check Science Data Node Collection
        for (const node of scienceRingsRef.current) {
          if (!node.collected) {
            const nx = cx + Math.cos(node.angle) * node.radius;
            const ny = cy + Math.sin(node.angle) * node.radius;
            if (Math.hypot(px - nx, py - ny) < 14) {
              node.collected = true;
              scoreRef.current += 30;
              setScore(scoreRef.current);
              setScienceCollected((prev) => prev + 1);
              playChimeSound();

            for (let i = 0; i < 6; i++) {
              particlesRef.current.push({
                x: nx,
                y: ny,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                alpha: 1,
                color: '#facc15',
                size: 2,
              });
            }
          }
        }
      }
    }

      // ── 8. Draw Juno Probe ──
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.angle + Math.PI / 2);

      // Central hexagonal bus
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // 3 Tri-radial Solar Arrays (Iconic Juno design)
      for (let a = 0; a < 3; a++) {
        const wingAngle = (a / 3) * Math.PI * 2;
        ctx.fillStyle = '#1e3a5f';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.save();
        ctx.rotate(wingAngle);
        ctx.fillRect(-2, 4, 4, 15);
        ctx.strokeRect(-2, 4, 4, 15);
        ctx.restore();
      }

      // Magnetometer boom
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -14);
      ctx.stroke();

      ctx.restore();

      // ── 9. Draw Particles ──
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
  }, [finishGame, playAlert, playChimeSound, playRadiationSound, playSuccess, gameState]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#0a0705]/95 border-2 border-amber-600/50 shadow-[0_0_40px_rgba(217,119,6,0.25)] text-white font-mono animate-slide-up select-none overflow-hidden">
      {/* ── PRE-GAME BRIEFING OVERLAY ── */}
      {gameState === 'briefing' && (
        <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#170a04] border-2 border-amber-500/70 rounded-3xl p-6 shadow-[0_0_40px_rgba(217,119,6,0.4)] space-y-4 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="text-3xl">🛰️</span>
              <div>
                <h3 className="font-heading font-black text-lg text-amber-300">
                  Jupiter: Gravity Slingshot
                </h3>
                <p className="text-xs text-starlight/70 font-mono">
                  Jovian Perijove Orbital Science
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-amber-400 block">🎯 OBJECTIVE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Complete 5 high-speed orbital perijove passes around Jupiter while collecting scientific data nodes from the outer radiation torus.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-cyan-400 block">🕹️ CONTROLS:</span>
                <span className="text-starlight/90 leading-snug block">
                  Click, tap, or press Spacebar to fire thrusters, toggling between high-altitude safe orbits and tight, high-science perijove cloud skims.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-rose-400 block">⚠️ HOW YOU LOSE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Radiation shield drops to 0% from lingering inside Io&apos;s volcanic radiation torus or colliding with moon Io.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-heading font-black text-base shadow-[0_0_20px_rgba(217,119,6,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              START OPERATION 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-600/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-2xl shadow-inner">
            <span>🪐</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Jovian Orbital Science
              </span>
              <span className="text-[10px] text-starlight/60">JUNO PERIJOVE SLINGSHOT</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Jupiter Gravity Slingshot
            </h2>
          </div>
        </div>

        {/* Orbit Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Mode</span>
              <span className="text-sm font-black text-rose-400">
                1.4x SPEED
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Perijove Pass</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {passCount} <span className="text-xs text-white/40">/ 5</span>
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Altitude</span>
            <span className="text-xl font-black text-cyan-400 tabular-nums">
              {perijoveDist} <span className="text-xs text-white/40">km</span>
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

      {/* ── RADIATION SHIELD STATUS BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#140b04] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Titanium Vault Shield:</span>
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
          <span className="text-[10px] text-starlight/60 uppercase">Data Skimmed:</span>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded font-mono bg-amber-400/20 text-amber-300 border border-amber-400/40">
            {scienceCollected}
          </span>
        </div>
      </div>

      {/* ── 60FPS ORBIT CANVAS ── */}
      <div
        className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-amber-500/40 shadow-inner bg-black cursor-pointer"
        onClick={handleThrusterBurn}
      >
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full block" />

        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/60 font-mono flex items-center gap-3">
          <span>🟡 GOLDEN RING: SKIM SCIENCE DATA</span>
          <span>•</span>
          <span className="text-rose-400 font-bold">🔴 RED RING: IO RADIATION TORUS (DANGER)</span>
        </div>
      </div>

      {/* ── FOOTER CONTROLS ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-3">
          <span>🕹️ <strong>CLICK OR TAP ANYWHERE</strong> to Fire Perijove Thrusters (Toggle Dive / Climb)</span>
        </div>
        <div className="text-[11px] text-amber-300/80">
          Complete 5 orbital passes with shield &gt; 0% to win!
        </div>
      </div>
    </div>
  );
}
