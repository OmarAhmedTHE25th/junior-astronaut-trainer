'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  color: string;
  tailLength: number;
  trail: { x: number; y: number }[];
}

interface Interceptor {
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number; // 0 to 1
  exploded: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  kills: number;
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

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  alpha: number;
  color: string;
  scale: number;
}

export default function MercuryMeteorDefense() {
  const { state, dispatch } = useGame();
  const { playAlert, playSuccess } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasKineticOvercharger = state.equippedTacticalItem === 'kinetic-overcharger';
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';
  const hasChronoStabilizer = state.equippedTacticalItem === 'chrono-stabilizer';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game status states for HUD
  const [shield, setShield] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [waveTimeRemaining, setWaveTimeRemaining] = useState<number>(() => ((isTimed ? 10 : 15) + (hasChronoStabilizer ? 10 : 0)));
  const [combo, setCombo] = useState<number>(1);
  const [interceptorsFired, setInterceptorsFired] = useState<number>(0);
  const [meteorsDestroyed, setMeteorsDestroyed] = useState<number>(0);

  // Internal mutable refs for 60fps canvas loop
  const shieldRef = useRef<number>(hasAegisHullMatrix ? 135 : 100);
  const scoreRef = useRef<number>(0);
  const waveRef = useRef<number>(1);
  const comboRef = useRef<number>(1);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isGameOverRef = useRef<boolean>(false);

  // Entities
  const meteorsRef = useRef<Meteor[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const nextEntityIdRef = useRef<number>(1);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 300, y: 150 });

  // Web Audio synth
  const playLaserSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }, []);

  const playExplosionSound = useCallback((multi = 1) => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Low rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(multi > 1 ? 90 : 130, now);
      osc.frequency.linearRampToValueAtTime(30, now + 0.25);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }, []);

  const playShieldDamageSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.setValueAtTime(100, now + 0.1);
      osc.frequency.setValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }, []);

  // End game cleanly
  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalShield = shieldRef.current;
    const baseScore = victory
      ? scoreRef.current + finalShield * 15 + 1200
      : scoreRef.current;
    const finalScore = isTimed && victory ? Math.round(baseScore * 1.5) : baseScore;

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(250, finalScore),
        solsCompleted: victory ? 30 : waveRef.current * 8,
        summaryLog: victory
          ? `Mercury Polar Outpost defended against 3 sungrazing meteor waves! Shield held at ${finalShield}%${isTimed ? ' (Blitz 1.5x Multiplier Applied)' : ''}. Earned ${finalScore} PTS.`
          : `Mercury Outpost shield collapsed under sustained meteor impacts during Wave ${waveRef.current}.`,
      });
    }, 600);
  }, [dispatch, isTimed]);

  // Click to fire interceptor
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isGameOverRef.current || shieldRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Turret at bottom center
    const startX = canvas.width / 2;
    const startY = canvas.height - 25;

    playLaserSound();
    setInterceptorsFired((prev) => prev + 1);

    interceptorsRef.current.push({
      startX,
      startY,
      x: startX,
      y: startY,
      targetX: clickX,
      targetY: clickY,
      speed: 0.15, // fast travel
      progress: 0,
      exploded: false,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mousePosRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  // Wave advancement timer (3 waves * 15s = 45s total)
  useEffect(() => {
    const waveTimer = setInterval(() => {
      if (isGameOverRef.current) return;

      setWaveTimeRemaining((prev) => {
        if (prev <= 1) {
          // Wave finished
          const currentW = waveRef.current;
          if (currentW >= 3) {
            // Victory! Surviving 3 waves
            playSuccess();
            finishGame(true);
            return 0;
          } else {
            // Advance to next wave
            const nextW = currentW + 1;
            waveRef.current = nextW;
            setWave(nextW);
            scoreRef.current += 500; // Wave clear bonus
            setScore(scoreRef.current);

            // Floating banner
            floatingTextsRef.current.push({
              id: nextEntityIdRef.current++,
              text: `WAVE ${nextW} INITIATED!`,
              x: 300,
              y: 120,
              alpha: 1,
              color: '#38bdf8',
              scale: 1.5,
            });

            return isTimed ? 10 : 15;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(waveTimer);
  }, [finishGame, playSuccess, isTimed]);

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let meteorSpawnTimer = 0;

    const gameLoop = () => {
      // Clear canvas with deep space black & solar glare
      ctx.fillStyle = '#03050c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Blazing Giant Sun Horizon on Left
      const sunGrad = ctx.createRadialGradient(80, 80, 5, 80, 80, 160);
      sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      sunGrad.addColorStop(0.2, 'rgba(251, 191, 36, 0.6)');
      sunGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.2)');
      sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(80, 80, 160, 0, Math.PI * 2);
      ctx.fill();

      // Mercury Crater Surface Ground
      const groundY = canvas.height - 35;
      ctx.fillStyle = '#1e2530';
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(120, groundY - 6);
      ctx.lineTo(240, groundY + 2);
      ctx.lineTo(360, groundY - 4);
      ctx.lineTo(480, groundY + 4);
      ctx.lineTo(600, groundY - 2);
      ctx.lineTo(600, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.fill();

      // Outpost Dome & Turret Base
      const turretX = canvas.width / 2;
      const turretY = groundY + 5;

      // Base Dome
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(turretX, turretY, 26, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Turret Barrel pointing at mouse cursor
      const angle = Math.atan2(mousePosRef.current.y - turretY, mousePosRef.current.x - turretX);
      const barrelLen = 22;
      ctx.save();
      ctx.translate(turretX, turretY - 5);
      ctx.rotate(angle);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, -3.5, barrelLen, 7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(barrelLen - 4, -4.5, 4, 9);
      ctx.restore();

      // Spawn Meteors based on current wave intensity
      meteorSpawnTimer++;
      const spawnInterval = waveRef.current === 1 ? 55 : waveRef.current === 2 ? 38 : 24;
      if (meteorSpawnTimer >= spawnInterval && !isGameOverRef.current) {
        meteorSpawnTimer = 0;
        const w = waveRef.current;
        const speed = w === 1 ? 1.6 : w === 2 ? 2.4 : 3.2;
        const r = Math.random() * 6 + 9; // radius 9 to 15
        const startX = Math.random() * (canvas.width - 80) + 40;
        const targetX = Math.random() * (canvas.width - 60) + 30;
        const dx = targetX - startX;
        const dy = groundY;
        const dist = Math.hypot(dx, dy);

        meteorsRef.current.push({
          id: nextEntityIdRef.current++,
          x: startX,
          y: -10,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: r,
          hp: r > 12 ? 2 : 1,
          maxHp: r > 12 ? 2 : 1,
          color: r > 12 ? '#f97316' : '#facc15',
          tailLength: 12,
          trail: [],
        });
      }

      // ── Update & Draw Meteors ──
      for (let i = meteorsRef.current.length - 1; i >= 0; i--) {
        const m = meteorsRef.current[i];
        m.x += m.vx;
        m.y += m.vy;
        m.trail.push({ x: m.x, y: m.y });
        if (m.trail.length > m.tailLength) m.trail.shift();

        // Draw meteor burning tail
        if (m.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(m.trail[0].x, m.trail[0].y);
          for (let ti = 1; ti < m.trail.length; ti++) {
            ctx.lineTo(m.trail[ti].x, m.trail[ti].y);
          }
          ctx.strokeStyle = m.color;
          ctx.lineWidth = m.radius * 0.7;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw Meteor Body
        ctx.fillStyle = m.color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();

        // White core hot center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Check if meteor hit ground / outpost
        if (m.y >= groundY - 5) {
          // Explode on ground
          meteorsRef.current.splice(i, 1);
          playShieldDamageSound();
          playAlert(2);

          // Outpost shield damage (-20%)
          shieldRef.current = Math.max(0, shieldRef.current - 20);
          setShield(shieldRef.current);

          // Reset combo
          comboRef.current = 1;
          setCombo(1);

          // Floating damage text
          floatingTextsRef.current.push({
            id: nextEntityIdRef.current++,
            text: 'SHIELD -20%!',
            x: m.x,
            y: groundY - 15,
            alpha: 1,
            color: '#f43f5e',
            scale: 1.2,
          });

          // Ground crater sparks
          for (let p = 0; p < 15; p++) {
            particlesRef.current.push({
              x: m.x,
              y: groundY,
              vx: (Math.random() - 0.5) * 6,
              vy: -Math.random() * 5,
              alpha: 1,
              color: '#f97316',
              size: Math.random() * 3 + 1,
            });
          }

          if (shieldRef.current <= 0) {
            finishGame(false);
          }
        }
      }

      // ── Update & Draw Interceptors ──
      for (let i = interceptorsRef.current.length - 1; i >= 0; i--) {
        const p = interceptorsRef.current[i];
        p.progress += p.speed;

        p.x = p.startX + (p.targetX - p.startX) * p.progress;
        p.y = p.startY + (p.targetY - p.startY) * p.progress;

        // Draw kinetic interceptor laser tracer line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(p.startX + (p.targetX - p.startX) * Math.max(0, p.progress - 0.15), p.startY + (p.targetY - p.startY) * Math.max(0, p.progress - 0.15));
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Target arrival: trigger shockwave explosion
        if (p.progress >= 1) {
          interceptorsRef.current.splice(i, 1);
          shockwavesRef.current.push({
            x: p.targetX,
            y: p.targetY,
            radius: 2,
            maxRadius: hasKineticOvercharger ? 88 : 44, // double blast radius with Kinetic Railgun Overcharger
            alpha: 1,
            kills: 0,
          });
        }
      }

      // ── Update & Draw Shockwaves & Collisions ──
      for (let sIdx = shockwavesRef.current.length - 1; sIdx >= 0; sIdx--) {
        const sw = shockwavesRef.current[sIdx];
        sw.radius += 2.5;
        sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

        // Draw shockwave sphere
        ctx.fillStyle = `rgba(56, 189, 248, ${sw.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(125, 211, 252, ${sw.alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Check collision against all active meteors
        for (let mIdx = meteorsRef.current.length - 1; mIdx >= 0; mIdx--) {
          const m = meteorsRef.current[mIdx];
          const dist = Math.hypot(m.x - sw.x, m.y - sw.y);

          if (dist <= sw.radius + m.radius) {
            m.hp -= 1;
            if (m.hp <= 0) {
              // Meteor destroyed!
              meteorsRef.current.splice(mIdx, 1);
              sw.kills += 1;
              setMeteorsDestroyed((prev) => prev + 1);

              // Update combo multiplier
              const currentCombo = comboRef.current;
              const pointsEarned = 100 * currentCombo;
              scoreRef.current += pointsEarned;
              setScore(scoreRef.current);

              // Sound
              playExplosionSound(sw.kills);

              // Particle sparks
              for (let p = 0; p < 18; p++) {
                particlesRef.current.push({
                  x: m.x,
                  y: m.y,
                  vx: (Math.random() - 0.5) * 7,
                  vy: (Math.random() - 0.5) * 7,
                  alpha: 1,
                  color: m.color,
                  size: Math.random() * 3 + 1,
                });
              }

              // Floating score
              floatingTextsRef.current.push({
                id: nextEntityIdRef.current++,
                text: `+${pointsEarned}${currentCombo > 1 ? ` (x${currentCombo})` : ''}`,
                x: m.x,
                y: m.y - 10,
                alpha: 1,
                color: '#38bdf8',
                scale: 1,
              });

              // Increase combo on multi-kills
              if (sw.kills >= 2) {
                comboRef.current = Math.min(5, comboRef.current + 1);
                setCombo(comboRef.current);

                if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
                comboTimeoutRef.current = setTimeout(() => {
                  comboRef.current = 1;
                  setCombo(1);
                }, 3500);

                floatingTextsRef.current.push({
                  id: nextEntityIdRef.current++,
                  text: `COMBO x${comboRef.current}!`,
                  x: sw.x,
                  y: sw.y - 30,
                  alpha: 1,
                  color: '#facc15',
                  scale: 1.3,
                });
              }
            }
          }
        }

        if (sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(sIdx, 1);
        }
      }

      // ── Update & Draw Particles ──
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.035;
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

      // ── Update & Draw Floating Texts ──
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 0.9;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.fillStyle = ft.color;
          ctx.font = `bold ${Math.round(12 * ft.scale)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [finishGame, playAlert, playExplosionSound, playShieldDamageSound]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#090b14]/95 border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)] text-white font-mono animate-slide-up">
      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner">
            <span>☄️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Mercury Defense Grid
              </span>
              <span className="text-[10px] text-starlight/60">POLAR ICE OUTPOST TURRET</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Sungrazing Meteor Intercept
            </h2>
          </div>
        </div>

        {/* Wave & Timer Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Clock</span>
              <span className="text-xl font-black text-rose-400 tabular-nums">
                {waveTimeRemaining}s
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Defense Wave</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {wave} <span className="text-xs text-white/40">/ 3</span>
            </span>
          </div>

          {!isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
              <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Wave Clock</span>
              <span className={`text-xl font-black tabular-nums ${waveTimeRemaining <= 3 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                {waveTimeRemaining}s
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

      {/* ── OUTPOST SHIELD INTEGRITY BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#0f1422] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Outpost Shield:</span>
          <span className={`text-xs font-black font-mono ${shield <= 40 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {shield}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex-1 max-w-md h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              shield <= 20 ? 'bg-rose-500 animate-pulse' : shield <= 40 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${shield}%` }}
          />
        </div>

        {/* Combo Multiplier Pill */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-starlight/60 uppercase">Combo:</span>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded font-mono ${combo > 1 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 animate-bounce-subtle' : 'bg-white/5 text-white/50 border border-white/10'}`}>
            x{combo}
          </span>
        </div>
      </div>

      {/* ── 60FPS INTERACTIVE CANVAS VIEWPORT ── */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-amber-500/40 shadow-inner bg-black cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          className="w-full h-full block"
        />

        {/* In-Canvas Instruction Overlay */}
        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/50 font-mono">
          <span>🎯 TAP / CLICK SKY TO FIRE KINETIC INTERCEPTORS</span>
        </div>
      </div>

      {/* ── BOTTOM STATS ROW ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-4">
          <span>🚀 Interceptors Fired: <strong className="text-white">{interceptorsFired}</strong></span>
          <span>💥 Meteors Destroyed: <strong className="text-cyan-300">{meteorsDestroyed}</strong></span>
        </div>
        <div className="text-[11px] text-amber-300/80">
          Protect Polar Outpost for 3 full waves to win!
        </div>
      </div>
    </div>
  );
}
