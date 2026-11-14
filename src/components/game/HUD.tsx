'use client';

import React, { useEffect, useRef, useState } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import LiveTelemetryTicker from './LiveTelemetryTicker';
import TelemetryChart from './TelemetryChart';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';
import type { SquadCadetState } from '@/lib/types';

interface HUDProps {
  onOpenMenu?: () => void;
}

export default function HUD({ onOpenMenu }: HUDProps) {
  const { state } = useGame();
  const { profile } = useProfile();
  const { isMuted, toggleSound, playClick, playWarning } = useSound();
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [squadCadets, setSquadCadets] = useState<SquadCadetState[]>([]);
  const prevLowRef = useRef<boolean>(false);

  const activeSpecialty = SPECIALTY_METAS.find((s) => s.id === (state.specialty || profile.specialty || 'commander'));
  const currentAvatar = state.avatar || (profile.cadetId !== 'cadet-nova-01' ? profile.avatar : '🚀');
  const currentCallsign = state.callsign || (profile.cadetId !== 'cadet-nova-01' ? profile.callsign : 'ASTRONAUT');

  // Poll Squad Standings if in Squad Race
  useEffect(() => {
    if (!state.squadCode) return;

    let isMounted = true;
    const fetchSquad = async () => {
      try {
        const res = await fetch(`/api/squad/${state.squadCode}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.room?.cadets) {
          setSquadCadets(data.room.cadets);
        }
      } catch {
        // Flaky Wi-Fi / offline resilience
      }
    };

    fetchSquad();
    const interval = setInterval(fetchSquad, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
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

      <header
        className="w-full bg-[#0B1026]/90 backdrop-blur-md border-b border-white/10
                   px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-30"
        role="banner"
        aria-label="Mission status"
      >
      {/* Left: Sol counter & Cadet Profile Quick View */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🪐</span>
          <div className="flex flex-col">
            <span className="text-xs text-[#F8FAFC]/60 uppercase tracking-widest">
              Sol
            </span>
            <span className="text-2xl font-bold text-[#E87040] tabular-nums leading-none">
              {state.sol}
              <span className="text-sm text-[#F8FAFC]/40 font-normal">
                /{state.maxSol}
              </span>
            </span>
          </div>
        </div>

        {/* Cadet Profile & Specialty Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#1a1f3d]/80 border border-white/10">
          <span className="text-lg">{currentAvatar}</span>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-white text-xs leading-none">
              {currentCallsign}
            </span>
            <span className="text-[10px] text-[#E87040] font-medium flex items-center gap-0.5 mt-0.5">
              <span>{activeSpecialty?.icon || '🎖️'}</span> {activeSpecialty?.name || 'Mission Commander'}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Resource bars */}
      <div className="flex flex-wrap items-center gap-4 flex-1 justify-center min-w-0">
        <ProgressBar
          value={state.power}
          label="Power"
          icon="⚡"
          color="orange"
          showWarning
        />
        <ProgressBar
          value={state.oxygen}
          label="Oxygen"
          icon="🫁"
          color="blue"
          showWarning
        />
        <ProgressBar
          value={state.shielding}
          label="Shielding"
          icon="🛡️"
          color="green"
          showWarning
        />
      </div>

      {/* Right: Morale, Score, Sound & Command Menu */}
      <div className="flex items-center gap-3">
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
              px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E87040] to-[#6B3FA0]
              text-white font-bold text-sm shadow-md shadow-[#E87040]/20
              hover:scale-105 active:scale-95 transition-transform cursor-pointer
              min-h-[44px] flex items-center gap-2
            "
          >
            <span aria-hidden="true">☰</span>
            <span className="hidden sm:inline">Menu</span>
          </button>
        )}
      </div>
    </header>

    {/* Live Squad Standings Bar (Active during Squad Race) */}
    {state.squadCode && (
      <aside
        aria-label="Live squad telemetry mesh"
        className="w-full bg-[#131838]/95 border-b border-cyan-500/30 px-3 py-1.5 backdrop-blur-md z-20 shadow-lg shadow-black/40"
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
  </>
);
}
