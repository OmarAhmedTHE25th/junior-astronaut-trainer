'use client';

import React, { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';
import type { EventChoice } from '@/lib/types';
import { playAlert, playSuccess } from '@/lib/sound';

const severityBorder: Record<number, string> = {
  1: 'border-[#3B82F6]',
  2: 'border-[#E87040]',
  3: 'border-[#EF4444]',
};

const severityGlow: Record<number, string> = {
  1: 'shadow-[#3B82F6]/20',
  2: 'shadow-[#E87040]/20',
  3: 'shadow-[#EF4444]/30',
};

export default function EventCard() {
  const { state, dispatch } = useGame();
  const event = state.activeEvent;

  useEffect(() => {
    if (event) {
      playAlert(event.severity);
    }
  }, [event]);

  if (!event || state.phase !== 'event') return null;

  const handleChoice = (choice: EventChoice) => {
    playSuccess();
    dispatch({ type: 'RESOLVE_EVENT', payload: choice });
  };

  const severityStars = '⭐'.repeat(event.severity);

  return (
    <div
      className={`
        w-full max-w-md mx-auto
        bg-gradient-to-b from-[#1a1f3d] to-[#0f1329]
        rounded-2xl border-2 ${severityBorder[event.severity] || severityBorder[1]}
        shadow-2xl ${severityGlow[event.severity] || severityGlow[1]}
        animate-[slide-up_0.4s_ease-out]
        overflow-hidden
      `}
      role="alertdialog"
      aria-label={`Event: ${event.title}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl" aria-hidden="true">
              {event.severity >= 3 ? '🚨' : event.severity >= 2 ? '⚠️' : 'ℹ️'}
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#F8FAFC]">{event.title}</h3>
              <div className="text-sm text-[#E87040]" aria-label={`Severity: ${event.severity} out of 3`}>
                {severityStars}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <p className="text-[#F8FAFC]/90 leading-relaxed">{event.description}</p>

        {/* NASA Source */}
        {event.nasaSource && (
          <p className="text-xs text-[#6B3FA0] italic flex items-center gap-1">
            <span aria-hidden="true">🔭</span>
            Source: {event.nasaSource}
          </p>
        )}

        {/* Choices */}
        <div className="space-y-2">
          {event.choices.map((choice) => {
            const effectStr = Object.entries(choice.effects)
              .map(([key, val]) => {
                const num = val as number;
                const emoji =
                  key === 'power' ? '⚡' : key === 'oxygen' ? '🫁' : key === 'shielding' ? '🛡️' : '💪';
                return `${emoji}${num > 0 ? '+' : ''}${num}`;
              })
              .join(' ');

            return (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice)}
                className="w-full p-3 rounded-xl text-left
                           bg-[#0B1026]/60 border border-[#6B3FA0]/30
                           hover:border-[#6B3FA0] hover:bg-[#1a1f3d]
                           transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-[#6B3FA0]
                           cursor-pointer min-h-[44px]"
                aria-label={`${choice.text}. Effects: ${effectStr}`}
              >
                <span className="font-semibold text-[#F8FAFC] text-sm block">
                  {choice.text}
                </span>
                <span className="text-xs text-[#E87040] font-mono mt-1 block">
                  {effectStr}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
