'use client';

import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';
import { calculateScore } from '@/lib/gameEngine';

function ConfettiPiece({ index }: { index: number }) {
  const colors = ['#E87040', '#3B82F6', '#22C55E', '#6B3FA0', '#EF4444', '#F8FAFC'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 3;
  const duration = 2 + Math.random() * 3;
  const size = 6 + Math.random() * 8;

  return (
    <div
      className="absolute top-0 animate-[confetti-fall_linear_forwards] pointer-events-none"
      style={{
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
      aria-hidden="true"
    />
  );
}

export default function EndScreen() {
  const { state, dispatch } = useGame();
  const [showConfetti, setShowConfetti] = useState(false);

  const isVictory = state.phase === 'victory';
  const finalScore = calculateScore(state);

  // Star rating: 1-5 based on score
  const stars = Math.min(5, Math.max(1, Math.ceil(finalScore / 200)));
  const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

  useEffect(() => {
    if (isVictory) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [isVictory]);

  const handlePlayAgain = () => {
    dispatch({ type: 'RESTART' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fade-in_0.5s_ease-out]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0B1026]/90 backdrop-blur-md" aria-hidden="true" />

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => (
            <ConfettiPiece key={i} index={i} />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className={`
          relative z-10 w-full max-w-md text-center
          bg-gradient-to-b from-[#1a1f3d] to-[#0B1026]
          rounded-2xl border-2
          ${isVictory ? 'border-[#22C55E]/50 shadow-[#22C55E]/20' : 'border-[#EF4444]/50 shadow-[#EF4444]/20'}
          shadow-2xl p-8
          animate-[slide-up_0.4s_ease-out]
        `}
        role="dialog"
        aria-label={isVictory ? 'Mission Complete' : 'Mission Failed'}
      >
        {/* Icon */}
        <div className="text-6xl mb-4" aria-hidden="true">
          {isVictory ? '🎉' : '💔'}
        </div>

        {/* Title */}
        <h2
          className={`text-3xl font-bold mb-2 ${
            isVictory ? 'text-[#22C55E]' : 'text-[#EF4444]'
          }`}
        >
          {isVictory ? 'Mission Complete!' : 'Mission Failed'}
        </h2>

        <p className="text-[#F8FAFC]/70 mb-6">
          {isVictory
            ? `Incredible! You survived ${state.maxSol} sols on Mars! 🚀`
            : `Your crew lasted ${state.sol} sols on Mars. Try again!`}
        </p>

        {/* Stars */}
        <div className="text-3xl mb-4" aria-label={`Rating: ${stars} out of 5 stars`}>
          {starDisplay}
        </div>

        {/* Score */}
        <div className="text-4xl font-bold text-[#E87040] mb-6 tabular-nums">
          {finalScore}
          <span className="text-lg text-[#F8FAFC]/40 ml-2">pts</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8 text-sm">
          <div className="bg-[#0B1026]/60 rounded-xl p-3">
            <div className="text-[#F8FAFC]/50">Sols Survived</div>
            <div className="text-xl font-bold text-[#F8FAFC] tabular-nums">
              {isVictory ? state.maxSol : state.sol}
            </div>
          </div>
          <div className="bg-[#0B1026]/60 rounded-xl p-3">
            <div className="text-[#F8FAFC]/50">Final Power</div>
            <div className="text-xl font-bold text-[#E87040] tabular-nums">
              {state.power}%
            </div>
          </div>
          <div className="bg-[#0B1026]/60 rounded-xl p-3">
            <div className="text-[#F8FAFC]/50">Final Oxygen</div>
            <div className="text-xl font-bold text-[#3B82F6] tabular-nums">
              {state.oxygen}%
            </div>
          </div>
          <div className="bg-[#0B1026]/60 rounded-xl p-3">
            <div className="text-[#F8FAFC]/50">Crew Morale</div>
            <div className="text-xl font-bold text-[#22C55E] tabular-nums">
              {state.morale}%
            </div>
          </div>
        </div>

        {/* Play Again */}
        <Button variant="primary" size="lg" onClick={handlePlayAgain} className="w-full">
          🚀 Play Again
        </Button>
      </div>
    </div>
  );
}
