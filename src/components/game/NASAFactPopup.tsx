'use client';

import React from 'react';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';

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

  if (!currentFact) return null;

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
                   bg-gradient-to-br from-[#1a1f3d] to-[#0f1329]
                   rounded-2xl border-2 border-[#6B3FA0]/40
                   shadow-2xl shadow-[#6B3FA0]/20
                   animate-[slide-up_0.4s_ease-out]
                   overflow-hidden"
        role="dialog"
        aria-label={`NASA Fact: ${currentFact.title}`}
      >
        {/* Decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-[#3B82F6] via-[#6B3FA0] to-[#E87040]" />

        <div className="p-5 space-y-4">
          {/* Category & icon */}
          <div className="flex items-center gap-2">
            <span className="text-3xl" aria-hidden="true">{icon}</span>
            <div>
              <span className="text-xs text-[#6B3FA0] font-semibold uppercase tracking-widest">
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
            onClick={onDismiss}
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
