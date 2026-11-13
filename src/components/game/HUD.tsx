'use client';

import React from 'react';
import ProgressBar from '@/components/ui/ProgressBar';
import { useGame } from './GameProvider';

export default function HUD() {
  const { state } = useGame();

  return (
    <header
      className="w-full bg-[#0B1026]/90 backdrop-blur-md border-b border-white/10
                 px-4 py-3 flex flex-wrap items-center justify-between gap-3 z-30"
      role="banner"
      aria-label="Mission status"
    >
      {/* Sol counter */}
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

      {/* Resource bars */}
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

      {/* Morale & Score */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" title="Crew Morale">
          <span className="text-lg" aria-hidden="true">
            {state.morale >= 70 ? '😊' : state.morale >= 40 ? '😐' : '😟'}
          </span>
          <span className="text-sm font-semibold text-[#F8FAFC] tabular-nums">
            {state.morale}%
          </span>
        </div>
        <div
          className="flex items-center gap-1 bg-[#6B3FA0]/20 px-3 py-1 rounded-lg"
          title="Mission Score"
        >
          <span className="text-lg" aria-hidden="true">⭐</span>
          <span className="text-sm font-bold text-[#F8FAFC] tabular-nums">
            {state.score}
          </span>
        </div>
      </div>
    </header>
  );
}
