'use client';

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LiveTelemetryTicker from './LiveTelemetryTicker';

const TelemetryChart = dynamic(() => import('./TelemetryChart'), { ssr: false });
const SponsorAdModal = dynamic(() => import('./SponsorAdModal'), { ssr: false });
import { useGame, useMissionTimer } from './GameProvider';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';
import { useBattlePass } from '@/lib/battlePass';
import { useGuild } from '@/lib/guildClient';
import { getPlanetCartridge } from '@/lib/planetCartridges';
import { SPECIALTY_METAS } from '@/lib/types';
import type { SquadCadetState } from '@/lib/types';

interface TimedCrisisTimerWidgetProps {
  isTimedMode?: boolean;
  phase: string;
}

/**
 * Isolated high-frequency (100ms) countdown widget.
 * Subscribes only to MissionTimerContext so tick re-renders do not touch HUD or the main game board.
 */
const TimedCrisisTimerWidget = React.memo(function TimedCrisisTimerWidget({
  isTimedMode,
  phase,
}: TimedCrisisTimerWidgetProps) {
  const { timeRemaining } = useMissionTimer();
  const { playTimerTick } = useSound();
  const lastTickSecondRef = useRef<number>(15);

  useEffect(() => {
    if (!isTimedMode) return;
    const currentSec = Math.ceil(timeRemaining);
    if (currentSec <= 3 && currentSec > 0 && currentSec !== lastTickSecondRef.current && phase === 'action') {
      playTimerTick();
      lastTickSecondRef.current = currentSec;
    } else if (currentSec > 3) {
      lastTickSecondRef.current = currentSec;
    }
  }, [timeRemaining, isTimedMode, phase, playTimerTick]);

  if (!isTimedMode) return null;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 will-change-transform
        ${
          timeRemaining <= 3
            ? 'bg-rose-950/80 border-rose-500 text-rose-300 ring-2 ring-rose-500/50'
            : timeRemaining <= 6
            ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-amber-500/20'
            : 'bg-[#1a1f3d]/90 border-cyan-500/40 text-cyan-300 shadow-cyan-500/10'
        }
        shadow-lg
      `}
      role="timer"
      aria-label={`Sol Decision Countdown: ${timeRemaining.toFixed(1)} seconds remaining`}
    >
      <span className="text-base select-none">
        ⏱️
      </span>
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest opacity-80">
            {timeRemaining <= 3 ? 'CRITICAL TIME' : timeRemaining <= 6 ? 'DECISION TIME' : 'CRISIS CLOCK'}
          </span>
          <span className="text-xs font-mono font-extrabold tabular-nums">
            {timeRemaining.toFixed(1)}s
          </span>
        </div>
        {/* Visual Progress Bar */}
        <div className="w-20 sm:w-24 h-1.5 rounded-full bg-black/60 overflow-hidden mt-0.5 border border-white/10">
          <div
            className={`h-full transition-all duration-100 rounded-full will-change-transform ${
              timeRemaining <= 3
                ? 'bg-rose-500'
                : timeRemaining <= 6
                ? 'bg-amber-400'
                : 'bg-cyan-400'
            }`}
            style={{ width: `${Math.max(0, Math.min(100, (timeRemaining / 15) * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

interface CompactTelemetryGaugeProps {
  label: string;
  icon: string;
  value: number;
  displayOverride?: string;
  colorScheme: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'cyan';
  isPlanetary?: boolean;
  showWarning?: boolean;
  isGlitching?: boolean;
  className?: string;
}

const GAUGE_COLOR_MAP: Record<string, { bar: string; track: string }> = {
  orange: {
    bar: 'bg-amber-400',
    track: 'bg-amber-950/40 border-amber-500/20',
  },
  blue: {
    bar: 'bg-sky-400',
    track: 'bg-sky-950/40 border-sky-500/20',
  },
  green: {
    bar: 'bg-emerald-400',
    track: 'bg-emerald-950/40 border-emerald-500/20',
  },
  red: {
    bar: 'bg-rose-500',
    track: 'bg-rose-950/40 border-rose-500/20',
  },
  purple: {
    bar: 'bg-fuchsia-400',
    track: 'bg-fuchsia-950/40 border-fuchsia-500/20',
  },
  cyan: {
    bar: 'bg-cyan-400',
    track: 'bg-cyan-950/40 border-cyan-500/20',
  },
};

const CompactTelemetryGauge = React.memo(function CompactTelemetryGauge({
  label,
  icon,
  value,
  displayOverride,
  colorScheme,
  isPlanetary = false,
  showWarning = true,
  isGlitching = false,
  className = '',
}: CompactTelemetryGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const isLow = clamped < 20 && showWarning && !isGlitching;
  const colors = GAUGE_COLOR_MAP[colorScheme] || GAUGE_COLOR_MAP.blue;

  return (
    <div
      className={`
        px-2.5 py-1.5 rounded-xl flex flex-col justify-center min-w-0 transition-all duration-200
        ${
          isGlitching
            ? 'bg-fuchsia-950/40 border border-fuchsia-500/40 ring-1 ring-fuchsia-500/40 animate-pulse'
            : isLow
            ? 'bg-rose-950/50 border border-rose-500/60 ring-1 ring-rose-500/40'
            : isPlanetary
            ? 'bg-[#121832]/95 border border-dashed border-amber-400/50 border-l-[3px] border-l-amber-400 shadow-[inset_0_1px_0_rgba(251,191,36,0.1)]'
            : 'bg-[#101730]/90 border border-white/10 hover:border-white/20 shadow-sm'
        }
        ${className}
      `}
      role="meter"
      aria-label={`${label}: ${isGlitching ? 'SCRAMBLED' : displayOverride || `${clamped}%`}`}
      aria-valuenow={isGlitching ? 50 : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Header row: Label + optional micro-tag, and Value */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span className={`text-xs shrink-0 select-none ${isGlitching ? 'filter invert animate-spin' : ''}`} aria-hidden="true">
            {icon}
          </span>
          <span
            className="truncate text-[10px] tracking-wider uppercase font-semibold text-[#F8FAFC]/90"
            title={label}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isPlanetary && (
            <span
              className="text-[7.5px] font-mono font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1 py-0.2 rounded uppercase tracking-tighter shrink-0 leading-tight"
              title="Planetary Hazard"
            >
              <span className="hidden sm:inline">PLANETARY</span>
              <span className="sm:hidden">PLANET</span>
            </span>
          )}
          <span
            className={`font-mono font-bold tabular-nums text-xs shrink-0 ${
              isGlitching
                ? 'text-fuchsia-300 tracking-widest'
                : isLow
                ? 'text-rose-400 font-extrabold animate-pulse'
                : 'text-[#F8FAFC]'
            }`}
          >
            {isGlitching ? '??%' : displayOverride || `${clamped}%`}
          </span>
        </div>
      </div>

      {/* Slim high-contrast progress bar */}
      <div className={`h-1.5 w-full rounded-full overflow-hidden mt-1 border border-white/10 ${colors.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isGlitching
              ? 'bg-fuchsia-500 animate-pulse'
              : isLow
              ? 'bg-rose-500 animate-pulse'
              : colors.bar
          }`}
          style={{ width: `${isGlitching ? 60 : clamped}%` }}
        />
      </div>
    </div>
  );
});

interface HUDProps {
  onOpenMenu?: () => void;
}

export default function HUD({ onOpenMenu }: HUDProps) {
  const { state } = useGame();
  const { profile } = useProfile();
  const { state: bpState } = useBattlePass();
  const { isMuted, toggleSound, playClick, playWarning } = useSound();
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [squadCadets, setSquadCadets] = useState<SquadCadetState[]>([]);
  const prevLowRef = useRef<boolean>(false);

  const activeSpecialty = SPECIALTY_METAS.find((s) => s.id === (state.specialty || profile.specialty || 'commander'));
  const currentAvatar = state.avatar || profile.avatar || '🚀';
  const currentCallsign = state.callsign || profile.callsign || 'ASTRONAUT';
  const isFiveStarGeneral = Boolean(state.isFiveStarGeneral || bpState.isFiveStarGeneral);
  const retriesRemaining = state.retriesRemaining ?? (isFiveStarGeneral ? 3 : 0);

  const { currentGuild } = useGuild(state.cadetId || profile.cadetId);
  const activeGuild = state.guild || currentGuild;
  const guildTag = activeGuild?.tag;
  const isGuildGoldTrim = activeGuild?.buffLevel === 5;

  const isEmpJammed = Boolean(state.activeDebuffs && state.activeDebuffs.empJammedSols > 0);
  const isSolarBlinded = Boolean(state.activeDebuffs && state.activeDebuffs.solarBlindedSols > 0);

  const cartridge = getPlanetCartridge(state.planetId || 'mars');

  // Poll Squad Standings if in Squad Race with in-flight deduplication and visibility pausing
  useEffect(() => {
    if (!state.squadCode) return;

    let isMounted = true;
    let inFlight = false;

    const fetchSquad = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/squad/${state.squadCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.room?.cadets) {
          setSquadCadets(data.room.cadets);
        }
      } catch {
        // Flaky Wi-Fi / offline resilience
      } finally {
        inFlight = false;
      }
    };

    fetchSquad();
    const interval = setInterval(fetchSquad, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSquad();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.squadCode]);

  // Monitor for vital resources dropping <= 20%
  const isAnyLow = state.power <= 20 || state.oxygen <= 20 || state.shielding <= 20;

  useEffect(() => {
    if (isAnyLow && !prevLowRef.current && state.phase === 'action') {
      playWarning();
    }
    prevLowRef.current = isAnyLow;
  }, [isAnyLow, state.phase, playWarning]);

  return (
    <>
      {/* Live NASA Space Weather Telemetry Ticker */}
      <LiveTelemetryTicker />

      {/* Solar Flare Early-Warning Banner (Tardigrade Scout Perk) */}
      {state.solarFlareWarningActive && (
        <div className="w-full bg-rose-950 border-b border-rose-500/60 text-white px-4 py-2 text-xs font-mono font-black flex items-center justify-between shadow-lg animate-pulse z-40">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">🐛</span>
            <span>
              TARDIGRADE BIO-SENSOR WARNING: Incoming severe NASA DONKI solar storm / CME detected in next Sol! Reinforce radiation shielding.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-black/50 text-[10px] uppercase border border-white/20">
            Impact Imminent
          </span>
        </div>
      )}

      {/* Hostile EMP Jam Banner */}
      {isEmpJammed && (
        <div className="w-full bg-purple-950 border-b border-purple-500/60 text-white px-4 py-2 text-xs font-mono font-black flex items-center justify-between shadow-lg animate-pulse z-40">
          <div className="flex items-center gap-2">
            <span className="text-base animate-spin">⚡</span>
            <span className="text-amber-300">
              🚨 HOSTILE EMP TELEMETRY JAM ACTIVE ({state.activeDebuffs?.empJammedSols} Sols remaining): Telemetry gauges scrambled by microwave static. Command Override re-roll locked!
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-purple-300 uppercase border border-purple-400/40 font-bold">
            EW Jammed
          </span>
        </div>
      )}

      {/* Solar Array Regolith Blind Banner */}
      {isSolarBlinded && (
        <div className="w-full bg-amber-950 border-b border-amber-500/60 text-amber-200 px-4 py-1.5 text-xs font-mono font-bold flex items-center justify-between shadow-lg z-40">
          <div className="flex items-center gap-2">
            <span className="text-base">🌪️</span>
            <span>
              HOSTILE REGOLITH DUST BLIND ({state.activeDebuffs?.solarBlindedSols} Sols remaining): Solar collectors blanketed in abrasive dust. Power operation output reduced by -35%!
            </span>
          </div>
          <span className="text-[10px] bg-black/50 px-2 py-0.5 rounded text-amber-400 border border-amber-500/40 font-bold">
            -35% Power Gen
          </span>
        </div>
      )}

      {/* Atmospheric Weather Overlay */}
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none" aria-hidden="true">
        {cartridge.theme.weatherEffect === 'dust' && (
          <div className="absolute inset-0 bg-amber-600/10 mix-blend-color-dodge animate-pulse duration-1000">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />
          </div>
        )}
        {cartridge.theme.weatherEffect === 'debris' && (
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] animate-pulse" />
        )}
        {cartridge.theme.weatherEffect === 'acid' && (
          <div className="absolute inset-0 bg-yellow-500/10 mix-blend-overlay">
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/15 via-transparent to-amber-900/20 animate-pulse duration-700" />
          </div>
        )}
        {cartridge.theme.weatherEffect === 'solar_flare' && (
          <div className="absolute inset-0 bg-amber-500/10 animate-ping duration-1000 opacity-20" />
        )}
        {cartridge.theme.weatherEffect === 'lightning' && (
          <div className="absolute inset-0 bg-cyan-400/5 mix-blend-color-dodge animate-pulse duration-300" />
        )}
        {cartridge.theme.weatherEffect === 'rings' && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/5 to-transparent [transform:rotate(-15deg)] pointer-events-none" />
        )}
        {cartridge.theme.weatherEffect === 'frost' && (
          <div className="absolute inset-0 border-[8px] border-cyan-400/20 shadow-[inset_0_0_30px_rgba(56,189,248,0.25)] pointer-events-none" />
        )}
        {cartridge.theme.weatherEffect === 'supersonic' && (
          <div className="absolute inset-0 bg-blue-600/10 [background:repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(56,189,248,0.08)_40px,rgba(56,189,248,0.08)_80px)] animate-pulse" />
        )}
        {cartridge.theme.weatherEffect === 'glitch' && (
          <div className="absolute inset-0 bg-fuchsia-950/20 [background:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(217,70,239,0.1)_2px,rgba(217,70,239,0.1)_4px)] animate-pulse" />
        )}
      </div>

      <header
        className="w-full bg-[#0B1026]/95 border-b border-white/10 px-4 py-2.5 flex flex-col gap-2.5 z-30"
        role="banner"
        aria-label="Mission status"
      >
        {/* Top Control Bar: Cadet Status & Mission Systems */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          {/* Left: Sol counter & Cadet Profile Quick View */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🪐</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[10px] text-[#F8FAFC]/60 uppercase tracking-widest font-mono">
                Sol
              </span>
              <span className={`text-[10px] font-mono px-1 rounded font-extrabold uppercase border ${
                state.isGlitchedEntropy
                  ? 'text-fuchsia-300 bg-fuchsia-950/80 border-fuchsia-400/50 animate-pulse'
                  : 'text-amber-300 bg-black/40 border-white/10'
              }`}>
                {state.isGlitchedEntropy ? 'CORRUPT://X' : cartridge.name}
              </span>
            </div>
            <span className="text-2xl font-bold text-[#E87040] tabular-nums leading-none mt-0.5">
              {state.sol}
              <span className="text-sm text-[#F8FAFC]/40 font-normal">
                /{state.maxSol}
              </span>
            </span>
          </div>
        </div>

        {/* Timed Crisis Mode Countdown Widget (Isolated Context) */}
        <TimedCrisisTimerWidget isTimedMode={state.isTimedMode} phase={state.phase} />

        {/* Cadet Profile & Specialty Pill */}
        <div className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl border ${
          isFiveStarGeneral ? 'bg-[#1e1b10] border-amber-400/60 shadow-amber-500/10' : 'bg-[#1a1f3d]/80 border-white/10'
        }`}>
          <span className="text-lg">{currentAvatar}</span>
          <div className="flex flex-col">
            {isFiveStarGeneral ? (
              <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <span>★★★★★</span> FIVE-STAR GENERAL
              </span>
            ) : null}
            <span className="font-mono font-bold text-white text-xs leading-none flex items-center gap-1">
              {guildTag && (
                <span className={`text-[10px] font-extrabold px-1 py-0.2 rounded ${
                  isGuildGoldTrim
                    ? 'text-amber-300 bg-amber-400/20 border border-amber-400/70 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                    : 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40'
                }`}>
                  [{guildTag}]
                </span>
              )}
              <span>{currentCallsign.replace(/^\[[A-Z0-9]+\]\s*/, '')}</span>
            </span>
            <span className="text-[10px] text-[#E87040] font-medium flex items-center gap-0.5 mt-0.5">
              <span>{activeSpecialty?.icon || '🎖️'}</span> {activeSpecialty?.name || 'Mission Commander'}
            </span>
          </div>
        </div>

        {/* Five-Star General Emergency Life-Support Retries Pill */}
        {isFiveStarGeneral && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1e1b10] border border-amber-400/70 text-amber-300 font-mono text-xs font-bold shadow-lg"
            title="Emergency Life-Support Overrides: Auto-restores vitals to 45% upon fatal crisis or depletion."
          >
            <span className="text-sm">🔄</span>
            <div className="flex flex-col">
              <span className="text-[8px] uppercase tracking-widest text-amber-400/80">Life-Support</span>
              <span className="text-amber-300 tabular-nums">Retries: {retriesRemaining}/3</span>
            </div>
          </div>
        )}

        {/* Equipped Companion Pet Pill */}
        {state.equippedPet && (
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#141b3d]/90 border border-cyan-500/40 text-xs font-mono"
            title={`${state.equippedPet.name} - ${state.equippedPet.perkType} (+${state.equippedPet.perkValue}%)`}
          >
            <span>{state.equippedPet.avatar}</span>
            <span className="text-cyan-200 font-bold truncate max-w-[95px]">{state.equippedPet.name}</span>
            <span className="text-[9px] text-cyan-400 bg-cyan-500/20 px-1 rounded font-bold">
              Lv.{state.equippedPet.level}
            </span>
          </div>
        )}

        {/* Active Combat Stims Chips */}
        {state.activeBoostTimers &&
          Object.entries(state.activeBoostTimers)
            .filter(([, rem]) => (rem as number) > 0)
            .map(([slug, rem]) => (
              <div
                key={slug}
                className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-mono animate-pulse"
                title={`Active combat stimulant: ${slug}`}
              >
                <span>💉</span>
                <span className="truncate max-w-[70px] uppercase font-bold">{slug.split('-')[0]}</span>
                <span className="font-extrabold text-emerald-300">({rem}s)</span>
              </div>
            ))}
          </div>

          {/* Right: Morale, Score, Sound & Command Menu */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Morale */}
            <div className="flex items-center gap-1" title="Crew Morale">
              <span className="text-lg" aria-hidden="true">
                {state.morale >= 70 ? '😊' : state.morale >= 40 ? '😐' : '😟'}
              </span>
              <span className="text-sm font-semibold text-[#F8FAFC] tabular-nums">
                {state.morale}%
              </span>
            </div>

            {/* Score */}
            <div
              className="flex items-center gap-1 bg-[#6B3FA0]/20 px-3 py-1 rounded-lg"
              title="Mission Score"
            >
              <span className="text-lg" aria-hidden="true">⭐</span>
              <span className="text-sm font-bold text-[#F8FAFC] tabular-nums">
                {state.score}
              </span>
            </div>

            {/* Emergency Sponsor Ration Button (1 use per mission) */}
            <button
              onClick={() => {
                if (!state.hasUsedSponsorRation) {
                  playClick();
                  setIsSponsorModalOpen(true);
                }
              }}
              disabled={state.hasUsedSponsorRation}
              title={
                state.hasUsedSponsorRation
                  ? 'Sponsor emergency ration already consumed for this mission'
                  : 'Emergency Sponsor Broadcast: Watch BK Orbital transmission for +20% Power, O2 & Shields'
              }
              className={`
                px-2.5 py-1.5 rounded-xl border font-mono font-bold text-xs shadow-md transition-all
                flex items-center gap-1.5 min-h-[44px]
                ${
                  state.hasUsedSponsorRation
                    ? 'bg-slate-900/40 border-white/5 text-white/30 cursor-not-allowed opacity-50'
                    : 'bg-amber-950/40 border-amber-500/50 hover:border-amber-400 text-amber-300 hover:scale-105 active:scale-95 cursor-pointer animate-pulse'
                }
              `}
            >
              <span className="text-base select-none">🍔</span>
              <span className="hidden xl:inline">
                {state.hasUsedSponsorRation ? 'Ration Used' : 'Emergency Ration (+20%)'}
              </span>
            </button>

            {/* Telemetry Curves Modal Button */}
            <button
              onClick={() => {
                playClick();
                setIsTelemetryOpen(true);
              }}
              title="View Real-Time Telemetry & Survival Curves"
              aria-label="View Telemetry Curves"
              className="
                px-3 py-2 rounded-xl bg-[#1a1f3d] border border-white/10 hover:border-cyan-400
                text-cyan-300 font-mono font-bold text-xs shadow-md transition-all
                hover:scale-105 active:scale-95 cursor-pointer min-h-[44px] flex items-center gap-1.5
              "
            >
              <span>📊</span>
              <span className="hidden lg:inline">Telemetry</span>
            </button>

            {/* Audio Mute/Unmute Button */}
            <button
              onClick={toggleSound}
              title={isMuted ? 'Unmute synthesized sound effects' : 'Mute sound effects'}
              aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
              className="
                p-2 rounded-xl bg-[#1a1f3d] border border-white/10 hover:border-[#6B3FA0]
                transition-transform hover:scale-105 active:scale-95 cursor-pointer
                min-h-[44px] min-w-[44px] flex items-center justify-center text-lg
              "
            >
              {isMuted ? '🔇' : '🔊'}
            </button>

            {/* Pause/Command Menu Button */}
            {onOpenMenu && (
              <button
                onClick={() => {
                  playClick();
                  onOpenMenu();
                }}
                title="Open Outpost Command Menu (ESC)"
                aria-label="Open Outpost Command Menu"
                className="
                  px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700
                  text-slate-100 font-bold text-sm border border-slate-300/25 hover:border-slate-300/50 shadow-sm
                  hover:scale-105 active:scale-95 transition-transform cursor-pointer
                  min-h-[44px] flex items-center gap-2
                "
              >
                <span aria-hidden="true">☰</span>
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: Compact Horizontal Telemetry Grid */}
        <div className="w-full flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 flex-1 max-w-3xl mx-4 min-w-0">
            {/* Core Life-Support 1: Power */}
            <CompactTelemetryGauge
              label="Power"
              icon="⚡"
              value={state.power}
              colorScheme="orange"
              showWarning
              isGlitching={isEmpJammed || state.isGlitchedEntropy}
            />

            {/* Core Life-Support 2: Oxygen */}
            <CompactTelemetryGauge
              label="Oxygen"
              icon="🫁"
              value={state.oxygen}
              colorScheme="blue"
              showWarning
              isGlitching={isEmpJammed || state.isGlitchedEntropy}
            />

            {/* Core Life-Support 3: Shielding */}
            <CompactTelemetryGauge
              label="Shielding"
              icon="🛡️"
              value={state.shielding}
              colorScheme="green"
              showWarning
              isGlitching={isEmpJammed || state.isGlitchedEntropy}
            />

            {/* Planetary Hazard Metric 1 */}
            {cartridge.customMetrics[0] && (
              <CompactTelemetryGauge
                label={cartridge.customMetrics[0].name}
                icon={cartridge.customMetrics[0].icon}
                value={
                  cartridge.customMetrics[0].max === 100
                    ? (state.planetMetrics?.[cartridge.customMetrics[0].key] ?? cartridge.customMetrics[0].defaultValue)
                    : Math.max(0, Math.min(100, (((state.planetMetrics?.[cartridge.customMetrics[0].key] ?? cartridge.customMetrics[0].defaultValue) - cartridge.customMetrics[0].min) / (cartridge.customMetrics[0].max - cartridge.customMetrics[0].min)) * 100))
                }
                displayOverride={`${Math.round(state.planetMetrics?.[cartridge.customMetrics[0].key] ?? cartridge.customMetrics[0].defaultValue)}${cartridge.customMetrics[0].unit}`}
                colorScheme={
                  cartridge.customMetrics[0].color.includes('purple') || cartridge.customMetrics[0].color.includes('fuchsia')
                    ? 'purple'
                    : cartridge.customMetrics[0].color.includes('rose') || cartridge.customMetrics[0].color.includes('red')
                    ? 'red'
                    : cartridge.customMetrics[0].color.includes('amber') || cartridge.customMetrics[0].color.includes('orange') || cartridge.customMetrics[0].color.includes('yellow')
                    ? 'orange'
                    : cartridge.customMetrics[0].color.includes('emerald') || cartridge.customMetrics[0].color.includes('green')
                    ? 'green'
                    : cartridge.customMetrics[0].color.includes('cyan')
                    ? 'cyan'
                    : 'blue'
                }
                isPlanetary
                showWarning={false}
                isGlitching={state.isGlitchedEntropy}
              />
            )}

            {/* Planetary Hazard Metric 2 */}
            {cartridge.customMetrics[1] && (
              <CompactTelemetryGauge
                label={cartridge.customMetrics[1].name}
                icon={cartridge.customMetrics[1].icon}
                value={
                  cartridge.customMetrics[1].max === 100
                    ? (state.planetMetrics?.[cartridge.customMetrics[1].key] ?? cartridge.customMetrics[1].defaultValue)
                    : Math.max(0, Math.min(100, (((state.planetMetrics?.[cartridge.customMetrics[1].key] ?? cartridge.customMetrics[1].defaultValue) - cartridge.customMetrics[1].min) / (cartridge.customMetrics[1].max - cartridge.customMetrics[1].min)) * 100))
                }
                displayOverride={`${Math.round(state.planetMetrics?.[cartridge.customMetrics[1].key] ?? cartridge.customMetrics[1].defaultValue)}${cartridge.customMetrics[1].unit}`}
                colorScheme={
                  cartridge.customMetrics[1].color.includes('purple') || cartridge.customMetrics[1].color.includes('fuchsia')
                    ? 'purple'
                    : cartridge.customMetrics[1].color.includes('rose') || cartridge.customMetrics[1].color.includes('red')
                    ? 'red'
                    : cartridge.customMetrics[1].color.includes('amber') || cartridge.customMetrics[1].color.includes('orange') || cartridge.customMetrics[1].color.includes('yellow')
                    ? 'orange'
                    : cartridge.customMetrics[1].color.includes('emerald') || cartridge.customMetrics[1].color.includes('green')
                    ? 'green'
                    : cartridge.customMetrics[1].color.includes('cyan')
                    ? 'cyan'
                    : 'blue'
                }
                isPlanetary
                showWarning={false}
                isGlitching={state.isGlitchedEntropy}
                className="col-span-2 sm:col-span-1"
              />
            )}
          </div>
        </div>
    </header>

    {/* Live Squad Standings Bar (Active during Squad Race) */}
    {state.squadCode && (
      <aside
        aria-label="Live squad telemetry mesh"
        className="w-full bg-[#131838]/98 border-b border-cyan-500/30 px-3 py-1.5 z-20 shadow-lg shadow-black/40"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Squad indicator tag */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono font-extrabold text-cyan-300 tracking-wider text-[11px] flex items-center gap-1">
              <span>🏁 SQUAD RACE • ROOM</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-white font-mono">
                {state.squadCode}
              </span>
            </span>
          </div>

          {/* Cadets standings leaderboard chips */}
          <div className="flex flex-wrap items-center gap-2">
            {squadCadets.length === 0 ? (
              <span className="text-[11px] font-mono text-white/50">
                Connecting to squad telemetry mesh...
              </span>
            ) : (
              squadCadets.map((cadet, idx) => {
                const isLocal =
                  cadet.cadetId === (state.cadetId || profile.cadetId) ||
                  cadet.callsign === currentCallsign;
                const avgVitals = Math.round(
                  (cadet.power + cadet.oxygen + cadet.shielding) / 3
                );

                let statusText = 'ACTIVE';
                let statusBg = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                if (!cadet.alive || cadet.power <= 0 || cadet.oxygen <= 0 || cadet.shielding <= 0) {
                  statusText = 'FLATLINED';
                  statusBg = 'bg-red-500/20 text-red-300 border-red-500/30';
                } else if (cadet.power <= 20 || cadet.oxygen <= 20 || cadet.shielding <= 20) {
                  statusText = 'CRITICAL';
                  statusBg = 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse';
                } else if (cadet.sol >= 30) {
                  statusText = 'SOL 30';
                  statusBg = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
                }

                const rankColors = ['text-amber-300', 'text-slate-300', 'text-amber-600', 'text-white/60'];

                return (
                  <div
                    key={cadet.cadetId}
                    className={`
                      flex items-center gap-2 px-2.5 py-1 rounded-xl border text-[11px] font-mono transition-all
                      ${isLocal
                        ? 'bg-[#E87040]/20 border-[#E87040] shadow-sm shadow-[#E87040]/30'
                        : 'bg-[#0B1026]/80 border-white/10'
                      }
                    `}
                  >
                    <span className={`font-bold ${rankColors[idx] || 'text-white/60'}`}>
                      #{idx + 1}
                    </span>
                    <span>{cadet.avatar || '🚀'}</span>
                    <span className="font-bold text-white truncate max-w-[90px]">
                      {cadet.callsign}
                      {isLocal && <span className="text-[#E87040] ml-1 text-[9px]">(YOU)</span>}
                    </span>
                    <span className="text-white/60 font-mono text-[10px]">
                      Sol {Math.min(cadet.sol, 30)}
                    </span>

                    {/* Average Vitals Mini Bar */}
                    <div className="w-10 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10 hidden sm:block" title={`Vitals Average: ${avgVitals}%`}>
                      <div
                        className={`h-full transition-all ${
                          avgVitals <= 20 ? 'bg-red-500' : avgVitals <= 50 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, avgVitals))}%` }}
                      />
                    </div>

                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusBg}`}>
                      {statusText}
                    </span>
                    <span className="text-amber-300 font-bold text-[10px]">
                      {cadet.score}pt
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>
    )}

    {/* Mid-Mission Telemetry Analytics Modal */}
    <Modal
      isOpen={isTelemetryOpen}
      onClose={() => setIsTelemetryOpen(false)}
      title="📊 Mission Telemetry Console & Diagnostics"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        <TelemetryChart history={state.telemetryHistory ?? []} maxSol={state.maxSol} />
        <div className="flex justify-end pt-2 border-t border-white/10">
          <Button variant="secondary" onClick={() => setIsTelemetryOpen(false)}>
            Close Telemetry
          </Button>
        </div>
      </div>
    </Modal>

    {/* Emergency Sponsor Ration Commercial Modal */}
    <SponsorAdModal
      isOpen={isSponsorModalOpen}
      onClose={() => setIsSponsorModalOpen(false)}
      rewardMode="vitals"
      cadetId={state.cadetId || profile.cadetId}
    />
  </>
);
}
