'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface Diamond {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotSpeed: number;
  value: number;
}

interface SidewaysLightning {
  id: number;
  y: number;
  startX: number;
  endX: number;
  alpha: number;
  active: boolean;
  duration: number;
}

interface StaticBurst {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
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

export default function UranusDiamondHarvester() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';
  const hasChronoStabilizer = state.equippedTacticalItem === 'chrono-stabilizer';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'briefing' | 'playing'>('briefing');
  const [hull, setHull] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [score, setScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => (isTimed ? 30 : 40) + (hasChronoStabilizer ? 10 : 0));
  const [diamondsHarvested, setDiamondsHarvested] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);

  const hullRef = useRef<number>(hasAegisHullMatrix ? 135 : 100);
  const scoreRef = useRef<number>(0);
  const diamondsRef = useRef<number>(0);
  const comboRef = useRef<number>(1);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isGameOverRef = useRef<boolean>(false);

  // Scoop position
  const scoopPosRef = useRef<{ x: number; targetX: number }>({ x: 320, targetX: 320 });

  const diamondsListRef = useRef<Diamond[]>([]);
  const lightningRef = useRef<SidewaysLightning[]>([]);
  const staticBurstsRef = useRef<StaticBurst[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextEntityIdRef = useRef<number>(1);

  // Sound synthesis
  const playDiamondDing = useCallback(() => {
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
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1318.5, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }, []);

  const playLightningZap = useCallback(() => {
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
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }, []);

  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalHull = hullRef.current;
    const baseScore = victory
      ? scoreRef.current + diamondsRef.current * 25 + Math.round(finalHull * 2) + 350
      : scoreRef.current;
    const finalScore = isTimed && victory ? Math.min(1350, Math.round(baseScore * 1.3)) : Math.min(1150, baseScore);

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(150, finalScore),
        solsCompleted: 30,
        summaryLog: victory
          ? `Uranus Mantle Descent successful! Harvested ${diamondsRef.current} crystalline methane diamonds with ${finalHull}% tungsten scoop integrity${isTimed ? ' (Blitz Multiplier Applied)' : ''}. Earned ${finalScore} PTS.`
          : `Tungsten scoop crushed by 98-degree magnetosphere lightning discharge in Uranus's lower mantle.`,
      });
    }, 600);
  }, [dispatch, isTimed]);

  // Mouse / Touch Steering
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    scoopPosRef.current.targetX = Math.max(40, Math.min(canvas.width - 40, x));
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.touches[0].clientX - rect.left) / rect.width) * canvas.width;
    scoopPosRef.current.targetX = Math.max(40, Math.min(canvas.width - 40, x));
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        scoopPosRef.current.targetX = Math.max(40, scoopPosRef.current.targetX - 40);
      } else if (e.key === 'ArrowRight' || e.key === 'd') {
        scoopPosRef.current.targetX = Math.min(600, scoopPosRef.current.targetX + 40);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;
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
  }, [finishGame, playSuccess, gameState]);

  // Main 60fps Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnTimer = 0;
    let lightningTimer = 0;

    const gameLoop = () => {
      const W = canvas.width;
      const H = canvas.height;

      // ── 1. Uranus Aquamarine-Cyan Methane Mantle Background ──
      const mantleGrad = ctx.createLinearGradient(0, 0, 0, H);
      mantleGrad.addColorStop(0, '#042f2e'); // dark cyan
      mantleGrad.addColorStop(0.5, '#0e7490'); // aquamarine methane fog
      mantleGrad.addColorStop(1, '#083344'); // high pressure mantle
      ctx.fillStyle = mantleGrad;
      ctx.fillRect(0, 0, W, H);

      // Faint vertical ring sliver (98-degree extreme axial tilt)
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.2)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(W * 0.45, 0);
      ctx.lineTo(W * 0.45, H);
      ctx.stroke();

      // ── 2. Scoop Movement ──
      const scoop = scoopPosRef.current;
      scoop.x += (scoop.targetX - scoop.x) * 0.2;
      const scoopY = H - 45;
      const scoopW = 60;
      const scoopH = 18;

      // ── 3. Spawn Falling Diamonds ──
      spawnTimer++;
      if (spawnTimer >= 22 && !isGameOverRef.current) {
        spawnTimer = 0;
        diamondsListRef.current.push({
          id: nextEntityIdRef.current++,
          x: Math.random() * (W - 80) + 40,
          y: -20,
          radius: Math.random() * 5 + 10,
          speed: Math.random() * 2 + 4.2,
          rotation: 0,
          rotSpeed: (Math.random() - 0.5) * 0.08,
          value: 30,
        });

        // Static corkscrew bursts
        if (Math.random() < 0.35) {
          staticBurstsRef.current.push({
            id: nextEntityIdRef.current++,
            x: Math.random() * (W - 80) + 40,
            y: -20,
            radius: 14,
            speed: 5.2,
          });
        }
      }

      // ── 4. Spawn 98-Degree Sideways Lightning (Tilted Magnetosphere) ──
      lightningTimer++;
      if (lightningTimer >= 65 && !isGameOverRef.current) {
        lightningTimer = 0;
        playLightningZap();
        lightningRef.current.push({
          id: nextEntityIdRef.current++,
          y: Math.random() * (H - 120) + 40,
          startX: 0,
          endX: W,
          alpha: 1,
          active: true,
          duration: 18,
        });
      }

      // ── 5. Update & Draw Sideways Lightning ──
      for (let i = lightningRef.current.length - 1; i >= 0; i--) {
        const bolt = lightningRef.current[i];
        bolt.duration--;
        bolt.alpha = bolt.duration / 18;

        ctx.strokeStyle = `rgba(103, 232, 249, ${bolt.alpha})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        let currX = bolt.startX;
        ctx.moveTo(currX, bolt.y);
        while (currX < bolt.endX) {
          currX += Math.random() * 30 + 15;
          const jitterY = bolt.y + (Math.random() - 0.5) * 16;
          ctx.lineTo(currX, jitterY);
        }
        ctx.stroke();

        // Collision with scoop
        if (bolt.active && Math.abs(scoopY - bolt.y) < 22) {
          bolt.active = false;
          hullRef.current = Math.max(0, hullRef.current - 18);
          setHull(Math.round(hullRef.current));
          playAlert(2);

          comboRef.current = 1;
          setCombo(1);

          for (let p = 0; p < 12; p++) {
            particlesRef.current.push({
              x: scoop.x,
              y: scoopY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              alpha: 1,
              color: '#67e8f9',
              size: 2.5,
            });
          }

          if (hullRef.current <= 0) finishGame(false);
        }

        if (bolt.duration <= 0) {
          lightningRef.current.splice(i, 1);
        }
      }

      // ── 6. Update & Draw Static Bursts ──
      for (let i = staticBurstsRef.current.length - 1; i >= 0; i--) {
        const sb = staticBurstsRef.current[i];
        sb.y += sb.speed;

        ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
        ctx.beginPath();
        ctx.arc(sb.x, sb.y, sb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (Math.hypot(sb.x - scoop.x, sb.y - scoopY) < sb.radius + scoopW * 0.4) {
          staticBurstsRef.current.splice(i, 1);
          hullRef.current = Math.max(0, hullRef.current - 14);
          setHull(Math.round(hullRef.current));
          playAlert(2);
          comboRef.current = 1;
          setCombo(1);
          if (hullRef.current <= 0) finishGame(false);
          continue;
        }

        if (sb.y > H + 30) {
          staticBurstsRef.current.splice(i, 1);
        }
      }

      // ── 7. Update & Draw Diamonds ──
      for (let i = diamondsListRef.current.length - 1; i >= 0; i--) {
        const d = diamondsListRef.current[i];
        d.y += d.speed;
        d.rotation += d.rotSpeed;

        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.rotation);

        // Brilliant Octahedral Diamond Silhouette
        ctx.fillStyle = '#cffafe';
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -d.radius);
        ctx.lineTo(d.radius * 0.7, 0);
        ctx.lineTo(0, d.radius);
        ctx.lineTo(-d.radius * 0.7, 0);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();

        // Check catch by Tungsten Scoop
        if (
          d.y >= scoopY - 14 &&
          d.y <= scoopY + scoopH &&
          Math.abs(d.x - scoop.x) <= scoopW / 2 + d.radius * 0.6
        ) {
          diamondsListRef.current.splice(i, 1);
          diamondsRef.current += 1;
          setDiamondsHarvested(diamondsRef.current);

          const pts = d.value * comboRef.current;
          scoreRef.current += pts;
          setScore(scoreRef.current);
          playDiamondDing();

          // Increment combo streak
          comboRef.current = Math.min(5, comboRef.current + 1);
          setCombo(comboRef.current);
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = setTimeout(() => {
            comboRef.current = 1;
            setCombo(1);
          }, 3500);

          for (let p = 0; p < 8; p++) {
            particlesRef.current.push({
              x: d.x,
              y: d.y,
              vx: (Math.random() - 0.5) * 5,
              vy: -Math.random() * 4 - 2,
              alpha: 1,
              color: '#cffafe',
              size: 2.5,
            });
          }

          // Check target quota (e.g. 20 diamonds for instant victory)
          if (diamondsRef.current >= 20) {
            playSuccess();
            finishGame(true);
          }
          continue;
        }

        if (d.y > H + 30) {
          diamondsListRef.current.splice(i, 1);
        }
      }

      // ── 8. Draw Reinforced Tungsten Atmospheric Scoop ──
      ctx.save();
      ctx.translate(scoop.x, scoopY);

      // Curved Tungsten Scoop Basin
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-scoopW / 2, 0, scoopW, scoopH, [4, 4, 12, 12]);
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Scoop Aperture Sensor Grid
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(-scoopW / 2 + 4, 2, scoopW - 8, 4);

      // Heat-shield thrusters
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-scoopW / 2 + 6, scoopH, 6, 5);
      ctx.fillRect(scoopW / 2 - 12, scoopH, 6, 5);

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
  }, [finishGame, playAlert, playDiamondDing, playLightningZap, playSuccess, gameState, timeRemaining]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#031c22]/95 border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.25)] text-white font-mono animate-slide-up select-none overflow-hidden">
      {/* ── PRE-GAME BRIEFING OVERLAY ── */}
      {gameState === 'briefing' && (
        <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#04242c] border-2 border-cyan-400/70 rounded-3xl p-6 shadow-[0_0_40px_rgba(34,211,238,0.4)] space-y-4 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="text-3xl">💎</span>
              <div>
                <h3 className="font-heading font-black text-lg text-cyan-300">
                  Uranus: Diamond Harvester
                </h3>
                <p className="text-xs text-starlight/70 font-mono">
                  Mantle Atmospheric Catch &amp; Dodge
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-amber-400 block">🎯 OBJECTIVE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Catch falling crystalline methane diamonds with the tungsten scoop (collect 12+ or survive 40 seconds) while avoiding sideways lightning arcs.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-cyan-400 block">🕹️ CONTROLS:</span>
                <span className="text-starlight/90 leading-snug block">
                  Move mouse, touch &amp; drag left/right, or use Left/Right Arrow keys or A/D to position the collection basket under falling diamonds.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-rose-400 block">⚠️ HOW YOU LOSE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Tungsten scoop hull drops to 0% from 98-degree sideways magnetosphere lightning discharges or static corkscrews.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 text-slate-950 font-heading font-black text-base shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              START OPERATION 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-400/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-2xl shadow-inner">
            <span>💎</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Uranus Mantle Harvester
              </span>
              <span className="text-[10px] text-starlight/60">CRYSTALLINE METHANE DIAMOND RAIN</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Diamond Mantle Harvester
            </h2>
          </div>
        </div>

        {/* Harvest Gauges */}
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
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
              <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Descent Clock</span>
              <span className={`text-xl font-black tabular-nums ${timeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                {timeRemaining}s
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Diamonds Caught</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {diamondsHarvested} <span className="text-xs text-white/40">/ 20</span>
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

      {/* ── TUNGSTEN SCOOP INTEGRITY BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#06242c] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Tungsten Scoop Hull:</span>
          <span className={`text-xs font-black font-mono ${hull <= 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {hull}%
          </span>
        </div>

        <div className="flex-1 max-w-md h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              hull <= 25 ? 'bg-rose-500 animate-pulse' : hull <= 50 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${hull}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-starlight/60 uppercase">Combo:</span>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded font-mono ${combo > 1 ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/50 animate-bounce-subtle' : 'bg-white/5 text-white/50 border border-white/10'}`}>
            x{combo}
          </span>
        </div>
      </div>

      {/* ── 60FPS CANVAS FLIGHT VIEWPORT ── */}
      <div
        className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-cyan-400/40 shadow-inner bg-black cursor-ew-resize"
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full block" />

        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/60 font-mono flex items-center gap-3">
          <span>💎 CATCH FALLING DIAMONDS (+150 PTS & STREAK)</span>
          <span>•</span>
          <span className="text-cyan-300 font-bold">⚡ DODGE 98° SIDEWAYS LIGHTNING & STATIC BURSTS</span>
        </div>
      </div>

      {/* ── FOOTER CONTROLS ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-3">
          <span>🕹️ <strong>MOVE MOUSE / TOUCH DRAG / ARROW KEYS</strong> to Steer Scoop Left & Right</span>
        </div>
        <div className="text-[11px] text-cyan-300/80">
          Catch 20 diamonds or survive 40s to win!
        </div>
      </div>
    </div>
  );
}
