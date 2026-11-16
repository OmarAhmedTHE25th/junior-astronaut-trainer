'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface AcidCloud {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
}

interface TelemetryOrb {
  id: number;
  x: number;
  y: number;
  radius: number;
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

export default function VenusAerostatSurf() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasAegisHullMatrix = state.equippedTacticalItem === 'aegis-hull-matrix';
  const hasChronoStabilizer = state.equippedTacticalItem === 'chrono-stabilizer';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'briefing' | 'playing'>('briefing');
  const [hull, setHull] = useState<number>(() => (hasAegisHullMatrix ? 135 : 100));
  const [score, setScore] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => (isTimed ? 30 : 45) + (hasChronoStabilizer ? 10 : 0));
  const [altitudeKm, setAltitudeKm] = useState<number>(55.0);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [orbsCollected, setOrbsCollected] = useState<number>(0);

  const hullRef = useRef<number>(hasAegisHullMatrix ? 135 : 100);
  const scoreRef = useRef<number>(0);
  const isPressingRef = useRef<boolean>(false);
  const isGameOverRef = useRef<boolean>(false);

  // Aerostat Physics
  const aerostatRef = useRef<{
    x: number;
    y: number;
    vy: number;
    rotation: number;
    width: number;
    height: number;
  }>({
    x: 100,
    y: 170,
    vy: 0,
    rotation: 0,
    width: 44,
    height: 22,
  });

  const acidCloudsRef = useRef<AcidCloud[]>([]);
  const telemetryOrbsRef = useRef<TelemetryOrb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const nextEntityIdRef = useRef<number>(1);

  // Sound synthesis
  const playSizzleSound = useCallback(() => {
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
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
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
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }, []);

  const finishGame = useCallback((victory: boolean) => {
    if (isGameOverRef.current) return;
    isGameOverRef.current = true;

    const finalHull = hullRef.current;
    const baseScore = victory
      ? scoreRef.current + Math.round(finalHull * 2.5) + 350
      : scoreRef.current;
    const finalScore = isTimed && victory ? Math.min(1250, Math.round(baseScore * 1.3)) : Math.min(1050, baseScore);

    setTimeout(() => {
      dispatch({
        type: 'COMPLETE_MINIGAME',
        victory,
        score: Math.max(150, finalScore),
        solsCompleted: 30,
        summaryLog: victory
          ? `HAVOC Aerostat successfully rode Venus's 400 km/h super-rotation wave! Hull maintained at ${finalHull}%${isTimed ? ' (Blitz Multiplier Applied)' : ''}. Earned ${finalScore} PTS.`
          : `HAVOC Aerostat hull ruptured in supercritical sulfuric acid shear zone. Pressure hull failed.`,
      });
    }, 600);
  }, [dispatch, isTimed]);

  // Input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        isPressingRef.current = true;
        setIsPressing(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        isPressingRef.current = false;
        setIsPressing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let spawnTimer = 0;
    let scoreTickTimer = 0;

    const gameLoop = () => {
      const W = canvas.width;
      const H = canvas.height;

      // ── 1. Render Sky & Atmospheric Depth ──
      const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
      skyGrad.addColorStop(0, '#1c1102'); // upper stratosphere dark amber
      skyGrad.addColorStop(0.3, '#5c3305');
      skyGrad.addColorStop(0.7, '#854d0e'); // temperate cloud deck
      skyGrad.addColorStop(1, '#3b1702'); // lower supercritical furnace
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Safe Pressure Corridor (50km - 60km band) ──
      const safeTop = 65;
      const safeBottom = 265;

      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.fillRect(0, safeTop, W, safeBottom - safeTop);

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, safeTop);
      ctx.lineTo(W, safeTop);
      ctx.moveTo(0, safeBottom);
      ctx.lineTo(W, safeBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // ── 3. Aerostat Physics & Heaters ──
      const aero = aerostatRef.current;
      if (isPressingRef.current) {
        // Fire thermal buoyancy heaters
        aero.vy -= 0.38;
        aero.rotation = Math.max(-0.25, aero.rotation - 0.02);

        // Burner exhaust particles
        particlesRef.current.push({
          x: aero.x - 12,
          y: aero.y + 10,
          vx: -Math.random() * 3 - 2,
          vy: Math.random() * 2 + 1,
          alpha: 1,
          color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
          size: Math.random() * 3 + 2,
        });
      } else {
        // Gravity descent & venting ballast
        aero.vy += 0.26;
        aero.rotation = Math.min(0.25, aero.rotation + 0.02);
      }

      aero.vy *= 0.94; // atmospheric drag
      aero.y += aero.vy;

      // Bound within canvas
      if (aero.y < 20) {
        aero.y = 20;
        aero.vy = 0;
      }
      if (aero.y > H - 25) {
        aero.y = H - 25;
        aero.vy = 0;
      }

      // Calculate simulated altitude (50km to 65km)
      const currentAlt = 65 - ((aero.y - 20) / (H - 45)) * 20;
      setAltitudeKm(Number(currentAlt.toFixed(1)));

      // Out of safe corridor penalty
      if (aero.y < safeTop || aero.y > safeBottom) {
        hullRef.current = Math.max(0, hullRef.current - 0.12);
        setHull(Math.round(hullRef.current));
        if (Math.random() < 0.05) playAlert(1);
        if (hullRef.current <= 0) finishGame(false);
      }

      // Passive score for smooth flying
      scoreTickTimer++;
      if (scoreTickTimer >= 15 && !isGameOverRef.current && gameState === 'playing') {
        scoreTickTimer = 0;
        scoreRef.current += 3;
        setScore(scoreRef.current);
      }

      // ── 4. Spawn Obstacles & Telemetry Orbs ──
      const isFinalStretch = timeRemaining <= 15;
      spawnTimer += isFinalStretch ? 2 : 1;
      if (spawnTimer >= 36 && !isGameOverRef.current && gameState === 'playing') {
        spawnTimer = 0;

        // Acid Cloud
        const cloudY = Math.random() * (H - 60) + 30;
        acidCloudsRef.current.push({
          id: nextEntityIdRef.current++,
          x: W + 40,
          y: cloudY,
          radius: Math.random() * 12 + 18,
          speed: (Math.random() * 1.5 + 4.2) * (isFinalStretch ? 1.35 : 1.0),
          alpha: 0.85,
        });

        // Telemetry Orb
        if (Math.random() < 0.75) {
          telemetryOrbsRef.current.push({
            id: nextEntityIdRef.current++,
            x: W + 70,
            y: Math.random() * (safeBottom - safeTop - 40) + safeTop + 20,
            radius: 8,
            speed: 4.8 * (isFinalStretch ? 1.25 : 1.0),
            collected: false,
          });
        }
      }

      // ── 5. Update & Draw Acid Clouds (H₂SO₄) ──
      for (let i = acidCloudsRef.current.length - 1; i >= 0; i--) {
        const c = acidCloudsRef.current[i];
        c.x -= c.speed;

        // Draw cloud with noxious yellow vapor glow
        ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(202, 138, 4, 0.7)';
        ctx.beginPath();
        ctx.arc(c.x + 4, c.y - 3, c.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Formula label
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('H₂SO₄', c.x, c.y + 3);

        // Collision with Aerostat
        const dist = Math.hypot(c.x - aero.x, c.y - aero.y);
        if (dist < c.radius + aero.height * 0.7) {
          acidCloudsRef.current.splice(i, 1);
          hullRef.current = Math.max(0, hullRef.current - 15);
          setHull(Math.round(hullRef.current));
          playSizzleSound();
          playAlert(2);

          // Acid sparks
          for (let p = 0; p < 12; p++) {
            particlesRef.current.push({
              x: aero.x,
              y: aero.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              alpha: 1,
              color: '#facc15',
              size: Math.random() * 3 + 1,
            });
          }

          if (hullRef.current <= 0) finishGame(false);
          continue;
        }

        if (c.x < -c.radius * 2) {
          acidCloudsRef.current.splice(i, 1);
        }
      }

      // ── 6. Update & Draw Telemetry Orbs ──
      for (let i = telemetryOrbsRef.current.length - 1; i >= 0; i--) {
        const orb = telemetryOrbsRef.current[i];
        orb.x -= orb.speed;

        // Glowing telemetry beacon
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Collision
        const dist = Math.hypot(orb.x - aero.x, orb.y - aero.y);
        if (dist < orb.radius + aero.height) {
          telemetryOrbsRef.current.splice(i, 1);
          scoreRef.current += 50;
          setScore(scoreRef.current);
          setOrbsCollected((prev) => prev + 1);
          playChimeSound();

          for (let p = 0; p < 8; p++) {
            particlesRef.current.push({
              x: orb.x,
              y: orb.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              alpha: 1,
              color: '#38bdf8',
              size: 2,
            });
          }
          continue;
        }

        if (orb.x < -20) {
          telemetryOrbsRef.current.splice(i, 1);
        }
      }

      // ── 7. Draw NASA HAVOC Aerostat ──
      ctx.save();
      ctx.translate(aero.x, aero.y);
      ctx.rotate(aero.rotation);

      // Main Airship Hull (White PTFE-coated envelope)
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.ellipse(0, 0, aero.width / 2, aero.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Golden Solar Array Strip along top
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, -aero.height / 4, aero.width * 0.35, aero.height * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower Science Gondola / Habitat
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-12, aero.height / 2 - 2, 24, 7);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(-12, aero.height / 2 - 2, 24, 7);

      // Tail Fins
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-aero.width / 2, -6);
      ctx.lineTo(-aero.width / 2 - 8, -12);
      ctx.lineTo(-aero.width / 2 + 2, -2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-aero.width / 2, 6);
      ctx.lineTo(-aero.width / 2 - 8, 12);
      ctx.lineTo(-aero.width / 2 + 2, 2);
      ctx.fill();

      ctx.restore();

      // ── 8. Draw Particles ──
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
  }, [finishGame, playAlert, playChimeSound, playSizzleSound, gameState, timeRemaining]);

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#140e04]/95 border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.25)] text-white font-mono animate-slide-up select-none overflow-hidden">
      {/* ── PRE-GAME BRIEFING OVERLAY ── */}
      {gameState === 'briefing' && (
        <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#1c1204] border-2 border-amber-400/70 rounded-3xl p-6 shadow-[0_0_40px_rgba(245,158,11,0.4)] space-y-4 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="text-3xl">🎈</span>
              <div>
                <h3 className="font-heading font-black text-lg text-amber-300">
                  Venus: Aerostat Surf
                </h3>
                <p className="text-xs text-starlight/70 font-mono">
                  HAVOC Cloud-Deck Altitude Flight
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-amber-400 block">🎯 OBJECTIVE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Pilot the NASA HAVOC cloud platform inside the temperate 50–60 km altitude corridor for 45 seconds while avoiding toxic sulfuric acid clouds.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-cyan-400 block">🕹️ CONTROLS:</span>
                <span className="text-starlight/90 leading-snug block">
                  Hold Spacebar, Up Arrow, Click, or Touch &amp; Hold to fire buoyancy thermal heaters (ascend). Release to vent ballast and glide down.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-rose-400 block">⚠️ HOW YOU LOSE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Hull drops to 0% from corrosive H₂SO₄ acid cloud impacts or leaving the safe green atmospheric corridor.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-heading font-black text-base shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              START OPERATION 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER / HUD ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner">
            <span>🎈</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Venus HAVOC Aerostat
              </span>
              <span className="text-[10px] text-starlight/60">400 KM/H SUPER-ROTATION WAVE</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Cloud-Deck Altitude Surf
            </h2>
          </div>
        </div>

        {/* Flight Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Clock</span>
              <span className="text-xl font-black text-rose-400 tabular-nums">
                {timeRemaining}s
              </span>
            </div>
          )}

          {!isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
              <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Flight Clock</span>
              <span className={`text-xl font-black tabular-nums ${timeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                {timeRemaining}s
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Altitude</span>
            <span className="text-xl font-black text-cyan-400 tabular-nums">
              {altitudeKm} <span className="text-xs text-white/40">km</span>
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

      {/* ── HULL INTEGRITY & STATUS BAR ── */}
      <div className="w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#1c1204] border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">PTFE Hull Integrity:</span>
          <span className={`text-xs font-black font-mono ${hull <= 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            {hull}%
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div className="flex-1 max-w-md h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              hull <= 25 ? 'bg-rose-500 animate-pulse' : hull <= 50 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${hull}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-starlight/60 uppercase">Telemetry Orbs:</span>
          <span className="text-xs font-extrabold px-2 py-0.5 rounded font-mono bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
            {orbsCollected}
          </span>
        </div>
      </div>

      {/* ── 60FPS CANVAS FLIGHT VIEWPORT ── */}
      <div
        className="relative w-full aspect-[16/9] max-h-[460px] rounded-2xl overflow-hidden border border-amber-500/40 shadow-inner bg-black cursor-pointer"
        onMouseDown={() => {
          isPressingRef.current = true;
          setIsPressing(true);
        }}
        onMouseUp={() => {
          isPressingRef.current = false;
          setIsPressing(false);
        }}
        onTouchStart={() => {
          isPressingRef.current = true;
          setIsPressing(true);
        }}
        onTouchEnd={() => {
          isPressingRef.current = false;
          setIsPressing(false);
        }}
      >
        <canvas ref={canvasRef} width={640} height={360} className="w-full h-full block" />

        {/* Live Safe Corridor Overlay Guide */}
        <div className="absolute top-2 left-3 pointer-events-none text-[10px] text-white/60 font-mono flex items-center gap-3">
          <span>🟢 SAFE BAND: 50–60 KM (DODGE H₂SO₄ CLOUDS)</span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isPressing ? 'bg-amber-500 text-slate-950 animate-pulse' : 'bg-white/10 text-white/50'}`}>
            {isPressing ? '🔥 HEATERS ACTIVE (ASCENDING)' : 'VENTING BALLAST (DESCENDING)'}
          </span>
        </div>
      </div>

      {/* ── FOOTER CONTROLS HELPER ── */}
      <div className="w-full flex items-center justify-between text-xs text-starlight/70 px-2">
        <div className="flex items-center gap-3">
          <span>🕹️ <strong>HOLD SPACE / CLICK / TAP</strong> to Fire Heaters (Ascend)</span>
          <span>•</span>
          <span><strong>RELEASE</strong> to Vent Ballast (Descend)</span>
        </div>
        <div className="text-[11px] text-amber-300/80">
          Survive 45 seconds to secure orbital clearance!
        </div>
      </div>
    </div>
  );
}
