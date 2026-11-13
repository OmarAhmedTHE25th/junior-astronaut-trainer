'use client';

import React, { useEffect, useRef } from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';

interface HUDProps {
  onOpenMenu?: () => void;
}

export default function HUD({ onOpenMenu }: HUDProps) {
  const { state } = useGame();
  const { profile } = useProfile();
  const { isMuted, toggleSound, playClick, playWarning } = useSound();
  const prevLowRef = useRef<boolean>(false);

  const activeSpecialty = SPECIALTY_METAS.find((s) => s.id === (state.specialty || profile.specialty || 'commander'));

  // Monitor for vital resources dropping <= 20%
  const isAnyLow = state.power <= 20 || state.oxygen <= 20 || state.shielding <= 20;

  useEffect(() => {
    if (isAnyLow && !prevLowRef.current && state.phase === 'action') {
      playWarning();
    }
    prevLowRef.current = isAnyLow;
  }, [isAnyLow, state.phase, playWarning]);

  return (
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
          <span className="text-lg">{profile.avatar}</span>
          <div className="flex flex-col">
            <span className="font-mono font-bold text-white text-xs leading-none">
              {profile.callsign}
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
  );
}
