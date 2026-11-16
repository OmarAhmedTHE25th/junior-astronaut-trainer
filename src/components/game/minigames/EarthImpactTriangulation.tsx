'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGame } from '../GameProvider';
import { useSound } from '@/lib/sound';

interface ImpactSite {
  id: 'core' | 'frag_alpha' | 'frag_beta';
  name: string;
  row: number;
  col: number;
  found: boolean;
  icon: string;
  badge: string;
}

type CellStatus = {
  scanned: boolean;
  beacon: boolean;
  isImpact: boolean;
  impactSite?: ImpactSite;
  heat: 'DIRECT' | 'HOT' | 'WARM' | 'COLD' | null;
  distance: number;
};

const GRID_SIZE = 8;
const INITIAL_SCANS = 8;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Play synthetic Web Audio tones for rich radar feedback
function playSyntheticRadarTone(type: 'ping' | 'lock' | 'beacon' | 'error' | 'win') {
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
    if (type === 'ping') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'lock') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'beacon') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'win') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.12);
      osc.frequency.setValueAtTime(659.25, now + 0.24);
      osc.frequency.setValueAtTime(880, now + 0.36);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch {}
}

export default function EarthImpactTriangulation() {
  const { state, dispatch } = useGame();
  const { playSuccess, playAlert } = useSound();
  const isTimed = Boolean(state.isTimedMode);
  const hasQuantumScanner = state.equippedTacticalItem === 'quantum-scanner';
  const hasChronoStabilizer = state.equippedTacticalItem === 'chrono-stabilizer';

  const [gameState, setGameState] = useState<'briefing' | 'playing'>('briefing');
  const [scansRemaining, setScansRemaining] = useState(INITIAL_SCANS + (hasQuantumScanner ? 3 : 0));
  const [mode, setMode] = useState<'scan' | 'beacon'>('scan');
  const [beaconBonus, setBeaconBonus] = useState(0);
  const [blitzSeconds, setBlitzSeconds] = useState<number>(35 + (hasChronoStabilizer ? 10 : 0));
  const isGameOverRef = React.useRef(false);
  const [lastTelemetry, setLastTelemetry] = useState<string>(
    'TDRS-12 Satellite constellation active. 3 bolide impact fragments entered low atmosphere. Triangulate all impact coordinates.'
  );

  // Blitz Countdown Timer
  useEffect(() => {
    if (!isTimed || gameState !== 'playing') return;
    const interval = setInterval(() => {
      if (isGameOverRef.current) return;
      setBlitzSeconds((prev) => {
        if (prev <= 1) {
          isGameOverRef.current = true;
          playSyntheticRadarTone('error');
          setTimeout(() => {
            dispatch({
              type: 'COMPLETE_MINIGAME',
              victory: false,
              score: 300,
              solsCompleted: 10,
              summaryLog: 'Blitz speed-run timer expired! Orbital window closed before all impact bolides were triangulated.',
            });
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimed, gameState, dispatch]);

  // Generate 3 unique impact sites on mount
  const [sites, setSites] = useState<ImpactSite[]>(() => {
    const coords: { r: number; c: number }[] = [];
    while (coords.length < 3) {
      const r = Math.floor(Math.random() * GRID_SIZE);
      const c = Math.floor(Math.random() * GRID_SIZE);
      if (!coords.some((pt) => pt.r === r && pt.c === c)) {
        coords.push({ r, c });
      }
    }
    return [
      {
        id: 'core',
        name: 'Primary Asteroid Core',
        row: coords[0].r,
        col: coords[0].c,
        found: false,
        icon: '☄️',
        badge: 'Core (High Density)',
      },
      {
        id: 'frag_alpha',
        name: 'Fragment Alpha',
        row: coords[1].r,
        col: coords[1].c,
        found: false,
        icon: '💥',
        badge: 'Secondary Fragment',
      },
      {
        id: 'frag_beta',
        name: 'Fragment Beta',
        row: coords[2].r,
        col: coords[2].c,
        found: false,
        icon: '🛰️',
        badge: 'Ionized Debris',
      },
    ];
  });

  // 8x8 Grid state initialized empty
  const [grid, setGrid] = useState<CellStatus[][]>(() => {
    return Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => ({
        scanned: false,
        beacon: false,
        isImpact: false,
        heat: null,
        distance: 99,
      }))
    );
  });

  const foundCount = useMemo(() => sites.filter((s) => s.found).length, [sites]);

  // Minimum Chebyshev distance to any unfound impact site
  const getMinDistanceToUnfound = useCallback(
    (r: number, c: number, currentSites: ImpactSite[]) => {
      const unfound = currentSites.filter((s) => !s.found);
      if (unfound.length === 0) return 0;
      let minD = 99;
      for (const s of unfound) {
        const d = Math.max(Math.abs(r - s.row), Math.abs(c - s.col));
        if (d < minD) minD = d;
      }
      return minD;
    },
    []
  );

  // Handle cell click in Scan or Beacon mode
  const handleCellClick = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    const cell = grid[r][c];
    if (cell.scanned || cell.isImpact) return; // Already revealed

    const coordStr = `${COLS[c]}${r + 1}`;

    if (mode === 'beacon') {
      // Evacuation Beacon Mode
      playSyntheticRadarTone('beacon');
      const hitSite = sites.find((s) => s.row === r && s.col === c && !s.found);

      if (hitSite) {
        // Direct Beacon Target Lock!
        playSyntheticRadarTone('lock');
        playSuccess();
        const updatedSites = sites.map((s) => (s.id === hitSite.id ? { ...s, found: true } : s));
        setSites(updatedSites);
        setBeaconBonus((prev) => prev + 300);

        const newGrid = grid.map((rowArr, ri) =>
          rowArr.map((colCell, ci) => {
            if (ri === r && ci === c) {
              return {
                ...colCell,
                scanned: true,
                beacon: true,
                isImpact: true,
                impactSite: hitSite,
                heat: 'DIRECT' as const,
                distance: 0,
              };
            }
            return colCell;
          })
        );
        setGrid(newGrid);
        setLastTelemetry(`🎯 BEACON LOCK AT ${coordStr}! Evacuation corridor established over ${hitSite.name} (+300 Precision Pts)!`);

        checkGameOutcome(updatedSites, scansRemaining, beaconBonus + 300);
      } else {
        // Beacon placed on non-impact site
        const newGrid = grid.map((rowArr, ri) =>
          rowArr.map((colCell, ci) => {
            if (ri === r && ci === c) {
              return { ...colCell, beacon: !colCell.beacon };
            }
            return colCell;
          })
        );
        setGrid(newGrid);
        setLastTelemetry(`🚨 Evacuation Beacon placed at ${coordStr}. No direct seismic anomaly registered.`);
      }
      return;
    }

    // Scan Mode: Consumes 1 scan
    if (scansRemaining <= 0) return;
    const nextScans = scansRemaining - 1;
    setScansRemaining(nextScans);
    playSyntheticRadarTone('ping');

    // Check if directly hit an impact site
    const hitSite = sites.find((s) => s.row === r && s.col === c);

    if (hitSite) {
      // DIRECT IMPACT LOCK!
      playSyntheticRadarTone('lock');
      playSuccess();
      const updatedSites = sites.map((s) => (s.id === hitSite.id ? { ...s, found: true } : s));
      setSites(updatedSites);

      const newGrid = grid.map((rowArr, ri) =>
        rowArr.map((colCell, ci) => {
          if (ri === r && ci === c) {
            return {
              ...colCell,
              scanned: true,
              isImpact: true,
              impactSite: hitSite,
              heat: 'DIRECT' as const,
              distance: 0,
            };
          }
          return colCell;
        })
      );
      setGrid(newGrid);
      setLastTelemetry(`🎯 DIRECT SATELLITE LOCK AT ${coordStr}! Located ${hitSite.name}!`);

      checkGameOutcome(updatedSites, nextScans, beaconBonus);
    } else {
      // Miss: Calculate distance-based heat signature
      const dist = getMinDistanceToUnfound(r, c, sites);
      let heat: 'HOT' | 'WARM' | 'COLD' = 'COLD';
      if (dist === 1) heat = 'HOT';
      else if (dist <= 3) heat = 'WARM';

      if (heat === 'HOT') playAlert(1);

      const newGrid = grid.map((rowArr, ri) =>
        rowArr.map((colCell, ci) => {
          if (ri === r && ci === c) {
            return {
              ...colCell,
              scanned: true,
              heat,
              distance: dist,
            };
          }
          return colCell;
        })
      );
      setGrid(newGrid);

      const heatText =
        heat === 'HOT'
          ? '🔥 HOT — Strong thermal signature detected 1 tile away!'
          : heat === 'WARM'
          ? '⚡ WARM — Weak seismic refraction detected 2–3 tiles away.'
          : '❄️ COLD — No significant kinetic signatures in this sector (4+ tiles).';

      setLastTelemetry(`[${coordStr}] Radar Ping complete: ${heatText}`);

      checkGameOutcome(sites, nextScans, beaconBonus);
    }
  };

  // Evaluate victory / defeat
  const checkGameOutcome = (currentSites: ImpactSite[], currentScans: number, currentBonus: number) => {
    if (isGameOverRef.current) return;
    const foundAll = currentSites.every((s) => s.found);

    if (foundAll) {
      isGameOverRef.current = true;
      playSyntheticRadarTone('win');
      const baseScore = 550 + currentScans * 50 + Math.min(200, currentBonus);
      const earnedScore = isTimed ? Math.min(1100, Math.round(baseScore * 1.3)) : Math.min(950, baseScore);
      setTimeout(() => {
        dispatch({
          type: 'COMPLETE_MINIGAME',
          victory: true,
          score: earnedScore,
          solsCompleted: 30,
          summaryLog: `TDRS Orbital Triangulation success! All 3 kinetic impact fragments located. Evacuation routes cleared with ${currentScans} scans remaining${isTimed ? ' (Blitz Multiplier Applied)' : ''}. Earned ${earnedScore} PTS.`,
        });
      }, 700);
      return;
    }

    if (currentScans <= 0) {
      // Scans exhausted
      isGameOverRef.current = true;
      playSyntheticRadarTone('error');
      const unfoundCount = currentSites.filter((s) => !s.found).length;
      const partialScore = currentSites.filter((s) => s.found).length * 100;
      setTimeout(() => {
        dispatch({
          type: 'COMPLETE_MINIGAME',
          victory: false,
          score: partialScore,
          solsCompleted: 15,
          summaryLog: `Orbital satellite scan budget depleted. ${unfoundCount} impact fragment(s) remained uncontained. Evacuation window expired.`,
        });
      }, 700);
    }
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-[#091124]/95 border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-white font-mono animate-slide-up overflow-hidden">
      {/* ── PRE-GAME BRIEFING OVERLAY ── */}
      {gameState === 'briefing' && (
        <div className="absolute inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d1527] border-2 border-cyan-400/70 rounded-3xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.4)] space-y-4 text-white">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <span className="text-3xl">🌍</span>
              <div>
                <h3 className="font-heading font-black text-lg text-cyan-300">
                  Earth: Impact Triangulation
                </h3>
                <p className="text-xs text-starlight/70 font-mono">
                  Orbital Reconnaissance Protocol
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-sans">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-cyan-400 block">🎯 OBJECTIVE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Triangulate and locate all 3 kinetic bolide impact fragments on the 8×8 orbital grid before your scan budget runs out.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-amber-400 block">🕹️ CONTROLS:</span>
                <span className="text-starlight/90 leading-snug block">
                  Click/tap grid coordinates to ping radar pulse. Read HOT/WARM/COLD thermal distance indicators to zero in on targets. Switch to Beacon mode to lock direct evacuation coordinates.
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <span className="font-mono font-bold text-rose-400 block">⚠️ HOW YOU LOSE:</span>
                <span className="text-starlight/90 leading-snug block">
                  Exhaust all 8 radar scans without finding all 3 fragments, or run out of time in Timed Blitz mode.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setGameState('playing');
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-heading font-black text-base shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              START OPERATION 🚀
            </button>
          </div>
        </div>
      )}

      {/* ── TOP HEADER / MISSION BANNER ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center text-2xl shadow-inner animate-pulse">
            <span>🛰️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Earth Orbital Defense
              </span>
              <span className="text-[10px] text-starlight/60">TDRS-12 SATELLITE ARRAY</span>
            </div>
            <h2 className="text-lg sm:text-xl font-heading font-black text-white">
              Asteroid Impact Triangulation
            </h2>
          </div>
        </div>

        {/* Scan, Blitz & Site Gauges */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isTimed && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-center animate-pulse">
              <span className="text-[9px] uppercase tracking-wider text-rose-300 block">Blitz Clock</span>
              <span className="text-xl font-black text-rose-400 tabular-nums">
                {blitzSeconds}s
              </span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-cyan-300 block">Radar Scans</span>
            <span className={`text-xl font-black tabular-nums ${scansRemaining <= 3 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
              {scansRemaining} <span className="text-xs text-white/40">/ {INITIAL_SCANS}</span>
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/60 border border-amber-500/30 text-center">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 block">Sites Locked</span>
            <span className="text-xl font-black text-amber-400 tabular-nums">
              {foundCount} <span className="text-xs text-white/40">/ 3</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── MODE SELECTOR & INSTRUCTIONS ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-[#0f172a]/80 border border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-starlight/70 text-[11px]">Tool Mode:</span>
          <button
            type="button"
            onClick={() => setMode('scan')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'scan'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>📡</span> Radar Ping (Burns 1 Scan)
          </button>
          <button
            type="button"
            onClick={() => setMode('beacon')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'beacon'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-105'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>🚨</span> Evacuation Beacon (+300 pts if hit)
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-starlight/70">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/80 inline-block" /> HOT (1 tile)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/80 inline-block" /> WARM (2-3 tiles)</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500/80 inline-block" /> COLD (4+ tiles)</span>
        </div>
      </div>

      {/* ── 8x8 RADAR GRID VIEWPORT ── */}
      <div className="relative w-full max-w-[520px] sm:max-w-[580px] mx-auto p-3 sm:p-4 rounded-3xl bg-[#030712] border border-cyan-500/40 shadow-inner flex flex-col items-center">
        {/* Column Coordinates Header (A - H) */}
        <div className="grid grid-cols-8 gap-2 mb-2 w-full text-center text-[10px] sm:text-xs font-bold text-cyan-400/80">
          {COLS.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-8 gap-2 w-full">
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const coordStr = `${COLS[c]}${r + 1}`;

              // Determine cell styling
              let cellBg = 'bg-[#0f172a] hover:bg-[#1e293b] border-cyan-900/40 hover:border-cyan-400/60';
              let content = <span className="opacity-20 text-[9px] font-mono">{coordStr}</span>;

              if (cell.isImpact) {
                cellBg = 'bg-rose-950/90 border-rose-500 text-rose-200 ring-2 ring-rose-500 animate-pulse';
                content = (
                  <div className="flex flex-col items-center">
                    <span className="text-base sm:text-lg">{cell.impactSite?.icon || '💥'}</span>
                    <span className="text-[7.5px] font-black uppercase text-rose-300">LOCK</span>
                  </div>
                );
              } else if (cell.beacon) {
                cellBg = 'bg-amber-950/80 border-amber-400 text-amber-200 ring-1 ring-amber-400';
                content = (
                  <div className="flex flex-col items-center animate-bounce-subtle">
                    <span className="text-sm">🚨</span>
                    <span className="text-[7px] font-bold uppercase text-amber-300">BEACON</span>
                  </div>
                );
              } else if (cell.scanned) {
                if (cell.heat === 'HOT') {
                  cellBg = 'bg-rose-900/60 border-rose-500/70 text-rose-300';
                  content = (
                    <div className="flex flex-col items-center">
                      <span className="text-xs">🔥</span>
                      <span className="text-[7.5px] font-extrabold uppercase">HOT</span>
                    </div>
                  );
                } else if (cell.heat === 'WARM') {
                  cellBg = 'bg-amber-900/40 border-amber-500/60 text-amber-300';
                  content = (
                    <div className="flex flex-col items-center">
                      <span className="text-xs">⚡</span>
                      <span className="text-[7.5px] font-bold uppercase">WARM</span>
                    </div>
                  );
                } else {
                  cellBg = 'bg-sky-950/40 border-sky-600/40 text-sky-400';
                  content = (
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] opacity-70">❄️</span>
                      <span className="text-[7px] opacity-70 uppercase">COLD</span>
                    </div>
                  );
                }
              }

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  disabled={cell.isImpact || cell.scanned}
                  className={`
                    aspect-square w-full min-w-[44px] sm:min-w-[56px] flex flex-col items-center justify-center rounded-xl border transition-all duration-150 p-1 relative cursor-pointer
                    ${cellBg}
                    ${cell.isImpact || cell.scanned ? 'cursor-default' : 'active:scale-95'}
                  `}
                  title={`Coordinate ${coordStr}`}
                >
                  {content}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── IMPACT TARGETS STATUS ROW ── */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
        {sites.map((site) => (
          <div
            key={site.id}
            className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all ${
              site.found
                ? 'bg-rose-950/60 border-rose-500/80 text-rose-200'
                : 'bg-black/40 border-white/10 text-white/60'
            }`}
          >
            <span className="text-xl">{site.icon}</span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-white">{site.name}</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                {site.found ? (
                  <span className="text-[#22C55E]">✓ LOCATED ({COLS[site.col]}{site.row + 1})</span>
                ) : (
                  <span className="text-amber-400/80">⚡ SEARCHING SECTOR...</span>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── LIVE TELEMETRY FEED ── */}
      <div className="w-full p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-xs flex items-center gap-2">
        <span className="text-cyan-400 font-bold shrink-0">📡 TELEMETRY:</span>
        <span className="text-starlight/90 truncate font-mono">{lastTelemetry}</span>
      </div>
    </div>
  );
}
