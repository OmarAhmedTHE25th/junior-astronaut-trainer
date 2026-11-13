'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';
import { AVAILABLE_ACTIONS } from '@/lib/constants';
import type { PlayerAction } from '@/lib/types';
import { playAction } from '@/lib/sound';

export default function ActionPanel() {
  const { state, dispatch } = useGame();
  const isDisabled = state.phase !== 'action';

  const handleAction = (action: PlayerAction) => {
    playAction();
    dispatch({ type: 'PERFORM_ACTION', payload: action });
  };

  return (
    <section aria-label="Available actions" className="w-full">
      <h2 className="text-lg font-bold text-[#F8FAFC] mb-3 flex items-center gap-2">
        <span aria-hidden="true">🎯</span> Choose Your Action
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {AVAILABLE_ACTIONS.map((action: PlayerAction) => {
          // Determine effect indicators
          const effects = Object.entries(action.effects)
            .map(([key, val]) => {
              const num = val as number;
              const emoji =
                key === 'power'
                  ? '⚡'
                  : key === 'oxygen'
                  ? '🫁'
                  : key === 'shielding'
                  ? '🛡️'
                  : '💪';
              return `${emoji}${num > 0 ? '+' : ''}${num}`;
            })
            .join('  ');

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={isDisabled}
              aria-label={`${action.name}: ${action.description}`}
              className={`
                flex flex-col items-start gap-2 p-4 rounded-xl
                bg-[#1a1f3d]/80 border-2 border-[#6B3FA0]/30
                hover:border-[#6B3FA0] hover:bg-[#1a1f3d]
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-[#6B3FA0] focus:ring-offset-2 focus:ring-offset-[#0B1026]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:border-[#6B3FA0]/30
                text-left cursor-pointer min-h-[44px]
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="font-bold text-[#F8FAFC] text-sm leading-tight">
                  {action.name}
                </span>
              </div>
              <p className="text-xs text-[#F8FAFC]/60 leading-snug">
                {action.description}
              </p>
              <div className="text-xs font-mono text-[#E87040] mt-auto">
                {effects}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
