'use client';

import React, { useEffect, useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import LeaderboardModal from './LeaderboardModal';
import { useGame } from './GameProvider';
import { calculateScore } from '@/lib/gameEngine';
import { playVictory, playGameOver, playClick, playSuccess } from '@/lib/sound';
import { useProfile, evaluateBadges, CADET_BADGES } from '@/lib/profile';
import type { BadgeId } from '@/lib/types';

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
  const { profile } = useProfile();
  const [showConfetti, setShowConfetti] = useState(false);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeId[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const submittedRef = useRef(false);

  const isVictory = state.phase === 'victory';
  const finalScore = calculateScore(state);

  // Star rating: 1-5 based on score
  const stars = Math.min(5, Math.max(1, Math.ceil(finalScore / 200)));
  const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

  useEffect(() => {
    if (isVictory) {
      playVictory();
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(timer);
    } else {
      playGameOver();
    }
  }, [isVictory]);

  // Evaluate badges & auto-submit to anti-cheat server leaderboard
  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // 1. Evaluate achievement badges
    const { updatedProfile, newBadges } = evaluateBadges(state, profile);
    if (newBadges.length > 0) {
      setNewlyUnlockedBadges(newBadges);
      setTimeout(() => playSuccess(), 800);
    }

    // 2. Submit to server-verified leaderboard API
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cadetId: profile.cadetId,
        callsign: profile.callsign,
        avatar: profile.avatar,
        finalState: state,
        badgesCount: updatedProfile.badges.length,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && typeof data.rank === 'number') {
          setLeaderboardRank(data.rank);
        }
      })
      .catch(() => {});
  }, [state, profile]);

  const handlePlayAgain = () => {
    playClick();
    dispatch({ type: 'RESTART' });
  };

  return (
    <>
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
            relative z-10 w-full max-w-lg text-center
            bg-gradient-to-b from-[#1a1f3d] to-[#0B1026]
            rounded-3xl border-2
            ${isVictory ? 'border-[#22C55E]/60 shadow-[#22C55E]/20' : 'border-[#EF4444]/60 shadow-[#EF4444]/20'}
            shadow-2xl p-6 sm:p-8
            animate-[slide-up_0.4s_ease-out] max-h-[90vh] overflow-y-auto
          `}
          role="dialog"
          aria-label={isVictory ? 'Mission Complete' : 'Mission Failed'}
        >
          {/* Icon */}
          <div className="text-5xl sm:text-6xl mb-3" aria-hidden="true">
            {isVictory ? '🎉' : '💔'}
          </div>

          {/* Title */}
          <h2
            className={`text-2xl sm:text-3xl font-extrabold mb-1 ${
              isVictory ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {isVictory ? 'Mission Complete!' : 'Mission Failed'}
          </h2>

          <p className="text-sm text-[#F8FAFC]/70 mb-4">
            {isVictory
              ? `Commander ${profile.callsign}, you survived all ${state.maxSol} sols on Mars!`
              : `Your outpost sustained operations for ${state.sol} sols on Mars.`}
          </p>

          {/* Stars & Score */}
          <div className="flex flex-col items-center gap-1 mb-5">
            <div className="text-2xl sm:text-3xl" aria-label={`Rating: ${stars} out of 5 stars`}>
              {starDisplay}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#E87040] tabular-nums mt-1">
              {finalScore.toLocaleString()}
              <span className="text-base font-normal text-[#F8FAFC]/40 ml-1.5">pts</span>
            </div>

            {/* Leaderboard Rank Tag */}
            {leaderboardRank !== null && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E87040]/20 border border-[#E87040]/50 text-xs font-mono font-bold text-[#E87040]">
                <span>🏆 Verified Global Rank: #{leaderboardRank}</span>
              </div>
            )}
          </div>

          {/* Newly Unlocked Badges Alert */}
          {newlyUnlockedBadges.length > 0 && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/50 text-left space-y-2 animate-bounce-subtle">
              <span className="text-[11px] font-mono font-extrabold uppercase text-[#22C55E] tracking-wider block">
                ✨ Career Honor Unlocked!
              </span>
              <div className="flex flex-wrap gap-2">
                {newlyUnlockedBadges.map((badgeId) => {
                  const meta = CADET_BADGES.find((b) => b.id === badgeId);
                  return (
                    <div
                      key={badgeId}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#22C55E]/20 border border-[#22C55E]/40 text-xs font-bold text-white"
                    >
                      <span>{meta?.icon}</span>
                      <span>{meta?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outpost Telemetry Stats */}
          <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs sm:text-sm">
            <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5">
              <div className="text-[#F8FAFC]/50 text-[11px]">Sols Survived</div>
              <div className="text-lg font-extrabold text-[#F8FAFC] tabular-nums">
                {isVictory ? state.maxSol : state.sol} / {state.maxSol}
              </div>
            </div>
            <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5">
              <div className="text-[#F8FAFC]/50 text-[11px]">Final Power</div>
              <div className="text-lg font-extrabold text-[#E87040] tabular-nums">
                {state.power}%
              </div>
            </div>
            <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5">
              <div className="text-[#F8FAFC]/50 text-[11px]">Final Oxygen</div>
              <div className="text-lg font-extrabold text-[#3B82F6] tabular-nums">
                {state.oxygen}%
              </div>
            </div>
            <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5">
              <div className="text-[#F8FAFC]/50 text-[11px]">Shielding</div>
              <div className="text-lg font-extrabold text-[#22C55E] tabular-nums">
                {state.shielding}%
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <Button variant="primary" size="lg" onClick={handlePlayAgain} className="w-full justify-center">
              🚀 Play Another Sol
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                playClick();
                setIsLeaderboardOpen(true);
              }}
              className="w-full justify-center text-xs"
            >
              🏆 View Global Leaderboard
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        highlightScore={finalScore}
      />
    </>
  );
}
