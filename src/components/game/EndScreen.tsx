'use client';

import React, { useEffect, useState, useRef } from 'react';
import Button from '@/components/ui/Button';
import LeaderboardModal from './LeaderboardModal';
import { useGame } from './GameProvider';
import { calculateScore } from '@/lib/gameEngine';
import { playVictory, playGameOver, playClick, playSuccess } from '@/lib/sound';
import { useProfile, evaluateBadges, CADET_BADGES } from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';
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
  const [showCertificateView, setShowCertificateView] = useState(false);
  const submittedRef = useRef(false);

  const isVictory = state.phase === 'victory';
  const finalScore = calculateScore(state);

  const activeSpecialty = SPECIALTY_METAS.find(
    (s) => s.id === (state.specialty || profile.specialty || 'commander')
  );

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

  const handlePrint = () => {
    playClick();
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #mars-certificate,
          #mars-certificate * {
            visibility: visible !important;
          }
          #mars-certificate {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 40px !important;
            background: white !important;
            color: #0f172a !important;
            border: 8px double #1e293b !important;
            box-shadow: none !important;
            z-index: 999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fade-in_0.5s_ease-out]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-[#0B1026]/90 backdrop-blur-md no-print" aria-hidden="true" />

        {/* Confetti */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none no-print" aria-hidden="true">
            {Array.from({ length: 60 }, (_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
          </div>
        )}

        {/* Main End Card */}
        <div
          className={`
            relative z-10 w-full max-w-xl text-center
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
            {isVictory ? 'Mars Outpost Mission Complete!' : 'Mission Depletion: Abort'}
          </h2>

          <p className="text-sm text-[#F8FAFC]/70 mb-4">
            {isVictory
              ? `Commander ${profile.callsign}, you successfully survived all ${state.maxSol} sols on Mars!`
              : `Your outpost sustained operations for ${state.sol} sols before mission abort.`}
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

          {/* Official Mars Outpost Completion Certificate Preview on Victory */}
          {isVictory && (
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-extrabold text-[#22C55E] uppercase tracking-wider flex items-center gap-1">
                  <span>📜</span> Official Mars Outpost Certificate
                </span>
                <button
                  type="button"
                  onClick={() => setShowCertificateView(!showCertificateView)}
                  className="text-xs text-[#3B82F6] hover:underline font-mono"
                >
                  {showCertificateView ? 'Hide Certificate' : 'Preview Certificate'}
                </button>
              </div>

              {/* Certificate Box */}
              <div
                id="mars-certificate"
                className={`
                  p-6 rounded-2xl border-2 border-amber-400/40 bg-gradient-to-b from-[#1a1f3d] to-[#0d1226]
                  text-white shadow-xl relative overflow-hidden
                  ${showCertificateView ? 'block' : 'hidden sm:block'}
                `}
              >
                {/* NASA Space Apps Header */}
                <div className="flex items-center justify-between border-b border-amber-400/30 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🪐</span>
                    <div>
                      <h3 className="font-heading font-extrabold text-sm sm:text-base text-amber-300 uppercase tracking-wider">
                        NASA Space Apps Challenge 2026
                      </h3>
                      <p className="text-[10px] text-white/60 font-mono">
                        Junior Astronaut Mission Trainer Expedition Program
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-[#22C55E] block">
                      SOL 30 VERIFIED
                    </span>
                    <span className="text-[10px] text-white/50">{currentDateFormatted}</span>
                  </div>
                </div>

                {/* Recipient / Callsign */}
                <div className="text-center py-2 space-y-1">
                  <span className="text-xs font-mono uppercase text-amber-200/80 tracking-widest block">
                    This official certificate is proudly awarded to
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white flex items-center justify-center gap-2">
                    <span>{profile.avatar}</span>
                    <span className="tracking-wide">{profile.callsign}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-medium mt-1">
                    <span>{activeSpecialty?.icon}</span>
                    <span>{activeSpecialty?.name}</span>
                    <span>•</span>
                    <span>{activeSpecialty?.title}</span>
                  </div>
                </div>

                {/* Body Text */}
                <p className="text-xs text-white/80 text-center my-3 leading-relaxed max-w-md mx-auto">
                  For outstanding courage, resource management, and scientific resilience demonstrated during the 30-Sol Mars Outpost Expedition under NASA DONKI solar event conditions.
                </p>

                {/* Earned Badges & Rank on Certificate */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-amber-400/20 text-xs font-mono">
                  <div>
                    <span className="text-white/50 block text-[10px]">MISSION SCORE &amp; RANK:</span>
                    <span className="text-amber-300 font-bold">
                      {finalScore.toLocaleString()} PTS {leaderboardRank ? `(RANK #${leaderboardRank})` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-white/50 block text-[10px]">HONORS ATTAINED:</span>
                    <span className="text-[#22C55E] font-bold">
                      {profile.badges.length} CAREER BADGES
                    </span>
                  </div>
                </div>

                {/* Seal & Verification */}
                <div className="mt-4 pt-3 border-t border-amber-400/20 flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>EXPEDITION ID: {profile.cadetId.substring(0, 14)}</span>
                  <span className="text-amber-300/80 font-bold">★ SEAL OF MARS BASE ALPHA ★</span>
                </div>
              </div>

              {/* Print Button */}
              <div className="mt-2.5 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrint}
                  className="text-xs flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print / Save Certificate
                </Button>
              </div>
            </div>
          )}

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
          <div className="space-y-2.5 no-print">
            <Button variant="primary" size="lg" onClick={handlePlayAgain} className="w-full justify-center">
              🚀 Play Another Mission
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
