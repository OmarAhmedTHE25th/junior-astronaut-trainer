'use client';

import React, { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';
import { playSuccess, playClick } from '@/lib/sound';

const categoryIcons: Record<string, string> = {
  mars: '🔴',
  radiation: '☢️',
  life_support: '🌬️',
  food: '🥕',
  power: '⚡',
  exploration: '🔭',
};

interface NASAFactPopupProps {
  onDismiss: () => void;
}

export default function NASAFactPopup({ onDismiss }: NASAFactPopupProps) {
  const { currentFact } = useGame();

  useEffect(() => {
    if (currentFact) {
      playSuccess();
    }
  }, [currentFact]);

  if (!currentFact) return null;

  const handleDismiss = () => {
    playClick();
    onDismiss();
  };

  const icon = categoryIcons[currentFact.category] || '🌟';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-[fade-in_0.3s_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0B1026]/70 backdrop-blur-sm"
        onClick={onDismiss}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm
                   bg-[#111827]
                   rounded-2xl border border-cyan-400/50
                   shadow-2xl
                   animate-[slide-up_0.4s_ease-out]
                   overflow-hidden"
        role="dialog"
        aria-label={`NASA Fact: ${currentFact.title}`}
      >
        {/* Decorative top bar */}
        <div className="h-1 bg-cyan-400" />

        <div className="p-5 space-y-4">
          {/* Category & icon */}
          <div className="flex items-center gap-2">
            <span className="text-3xl" aria-hidden="true">{icon}</span>
            <div>
              <span className="text-xs text-cyan-400 font-semibold uppercase tracking-widest">
                NASA Fact
              </span>
              <h3 className="text-lg font-bold text-[#F8FAFC] leading-snug">
                {currentFact.title}
              </h3>
            </div>
          </div>

          {/* Fact text */}
          <p className="text-[#F8FAFC]/85 leading-relaxed text-sm">
            {currentFact.fact}
          </p>

          {/* Source */}
          <p className="text-xs text-[#F8FAFC]/40 italic flex items-center gap-1">
            <span aria-hidden="true">📡</span>
            {currentFact.nasaSource}
          </p>

          {/* Fun rating */}
          <div className="text-sm text-[#E87040]" aria-label={`Fun rating: ${currentFact.funRating} out of 5`}>
            {'🚀'.repeat(currentFact.funRating)}
          </div>

          {/* Dismiss */}
          <Button
            variant="primary"
            size="md"
            onClick={handleDismiss}
            className="w-full"
            ariaLabel="Continue to next sol"
          >
            Got it! 👍
          </Button>
        </div>
      </div>
    </div>
  );
}
