'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';

const LeaderboardModal = dynamic(() => import('./LeaderboardModal'), { ssr: false });
const TelemetryChart = dynamic(() => import('./TelemetryChart'), { ssr: false });
import { calculateScore } from '@/lib/gameEngine';
import { playVictory, playGameOver, playClick, playSuccess } from '@/lib/sound';
import { useBattlePass, addBattlePassXP } from '@/lib/battlePass';
import {
  savePlanetBestScore,
  PLANET_CARTRIDGES,
  getPlanetCartridge,
  type PlanetCartridge,
} from '@/lib/planetCartridges';
import { getPlanetFacts } from '@/lib/planetFacts';
import {
  useProfile,
  evaluateBadges,
  CADET_BADGES,
  getOrCreateCadetProfile,
} from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';
import type { BadgeId, SquadCadetState } from '@/lib/types';
import { getStoredGuild } from '@/lib/guildClient';
import { getGuildBuff } from '@/lib/guildTypes';

const ConfettiPiece = React.memo(function ConfettiPiece({ index }: { index: number }) {
  const colors = ['#E87040', '#3B82F6', '#22C55E', '#6B3FA0', '#EF4444', '#F8FAFC'];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 3;
  const duration = 2 + Math.random() * 3;
  const size = 6 + Math.random() * 8;

  return (
    <div
      className="absolute top-0 animate-[confetti-fall_linear_forwards] pointer-events-none will-change-transform"
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
});

export default function EndScreen() {
  const router = useRouter();
  const { state, dispatch, quitMission } = useGame();
  const { profile, isLoaded } = useProfile();
  const { state: bpState } = useBattlePass();
  const [showConfetti, setShowConfetti] = useState(false);
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState<BadgeId[]>([]);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [showCertificateView, setShowCertificateView] = useState(false);
  const [squadPodium, setSquadPodium] = useState<SquadCadetState[]>([]);
  const [unlockedNextCartridge, setUnlockedNextCartridge] = useState<PlanetCartridge | null>(null);
  const submittedRef = useRef(false);

  // Identify the active cadet profile
  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : (typeof window !== 'undefined' ? getOrCreateCadetProfile() : profile);

  const isFiveStar = Boolean(state.isFiveStarGeneral || bpState.isFiveStarGeneral);
  const isVictory = state.phase === 'victory';
  const finalScore = useMemo(() => calculateScore(state), [state]);
  const cartridge = useMemo(() => getPlanetCartridge(state.planetId), [state.planetId]);
  const dayUnit = cartridge.dayUnit || { singular: 'SOL', plural: 'SOLS' };
  const isMars = (state.planetId || 'mars') === 'mars';
  const planetFacts = useMemo(() => getPlanetFacts(state.planetId || 'mars'), [state.planetId]);

  const activeGuild = state.guild || (typeof window !== 'undefined' ? getStoredGuild() : null);
  const guildTag = activeGuild?.tag;
  const isGuildGoldTrim = activeGuild?.buffLevel === 5;
  const guildBuff = useMemo(() => getGuildBuff(activeGuild?.buffLevel || 0), [activeGuild?.buffLevel]);
  const guildCreditsMultiplier = 1 + (guildBuff.creditsBonusPercent / 100);

  const rawCallsign = activeCadet.callsign || 'CADET';
  const displayCallsign = guildTag && !rawCallsign.startsWith(`[${guildTag}]`)
    ? `[${guildTag}] ${rawCallsign}`
    : rawCallsign;

  const { earnedCredits, bpXpEarned, petXpToAward, stars, starDisplay } = useMemo(() => {
    // Rebalanced economy: 25 to 350 Galaxy Coins capped per standard mission run
    const baseCredits = Math.min(350, Math.max(25, Math.round(finalScore * 0.12)));
    const vipCredits = isFiveStar ? Math.round(baseCredits * 1.25) : baseCredits;
    const earned = Math.round(vipCredits * guildCreditsMultiplier);
    // Rebalanced Battle Pass progression: 60 to 450 XP per run + 150 XP victory bonus
    const bpXp = Math.min(450, Math.max(60, Math.round(finalScore * 0.15))) + (isVictory ? 150 : 0);
    const petXp = (state.petXpEarned || 0) + (isVictory ? 100 : 0);
    const starCount = Math.min(5, Math.max(1, Math.ceil(finalScore / 300)));
    const starsStr = '⭐'.repeat(starCount) + '☆'.repeat(5 - starCount);
    return {
      earnedCredits: earned,
      bpXpEarned: bpXp,
      petXpToAward: petXp,
      stars: starCount,
      starDisplay: starsStr,
    };
  }, [finalScore, state.petXpEarned, isFiveStar, guildCreditsMultiplier, isVictory]);

  const activeSpecialty = SPECIALTY_METAS.find(
    (s) => s.id === (state.specialty || activeCadet.specialty || 'commander')
  );

  const formatMissionDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Ensure any active save slot is purged immediately on mission completion or defeat
  useEffect(() => {
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}
    const activeCadetId =
      state.cadetId ||
      (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);
    if (activeCadetId) {
      fetch(`/api/save?cadetId=${encodeURIComponent(activeCadetId)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }, [state.cadetId]);

  // Evaluate badges & auto-submit to anti-cheat server leaderboard
  useEffect(() => {
    if (submittedRef.current) return;
    // Safety: do not evaluate until loaded or until state.cadetId is available
    if (!isLoaded && !state.cadetId && typeof window === 'undefined') return;
    submittedRef.current = true;

    // 1. Evaluate achievement badges for the cadet who played this mission
    const { updatedProfile, newBadges } = evaluateBadges(state, activeCadet);
    if (newBadges.length > 0) {
      setNewlyUnlockedBadges(newBadges);
      setTimeout(() => playSuccess(), 800);
    }

    // 2. Submit to server-verified leaderboard API with the real cadet's credentials
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cadetId: updatedProfile.cadetId,
        callsign: updatedProfile.callsign,
        avatar: updatedProfile.avatar,
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

    // 3. If in an Endless Tournament Bracket match, submit match score & advance bracket
    if (state.isEndlessTournament && state.tournamentId && state.tournamentMatchId) {
      fetch(`/api/tournaments/${state.tournamentId}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: state.tournamentMatchId,
          entrantId: updatedProfile.cadetId,
          solsSurvived: state.sol,
          hoursSurvived: Math.floor((state.missionTimeSeconds || 0) / 3600) || Math.min(23, state.sol % 24),
          resources: {
            power: state.power,
            oxygen: state.oxygen,
            shielding: state.shielding,
            morale: state.morale,
          },
        }),
      }).catch(() => {});
    }

    // 3.5 Award Galactic Battle Pass XP
    try {
      addBattlePassXP(bpXpEarned);
    } catch {}

    // 4. Reward Mars Credits (with +25% VIP bonus for Five-Star Generals and Guild Buff) and Companion Pet XP
    fetch('/api/market/reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: updatedProfile.cadetId,
        credits: earnedCredits,
        petId: state.equippedPet?.id,
        petXp: petXpToAward,
      }),
    }).catch((err) => console.warn('Reward API notice:', err));

    // 5. Contribute mission completion score to active Orbital Guild
    fetch('/api/guilds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'contribute_score',
        cadetId: updatedProfile.cadetId,
        score: finalScore,
      }),
    }).catch(() => {});

    // 6. Record Standard Mode score to Campaign Progression
    const isStandardCampaign = !state.isTimedMode && !state.isEndlessTournament;
    const currentPlanetId = state.planetId || 'earth';
    if (isStandardCampaign) {
      const { unlockedPlanet } = savePlanetBestScore(currentPlanetId, finalScore);
      if (unlockedPlanet && PLANET_CARTRIDGES[unlockedPlanet]) {
        setUnlockedNextCartridge(PLANET_CARTRIDGES[unlockedPlanet]);
        setTimeout(() => playSuccess(), 1000);
      }
    }
  }, [isLoaded, state, activeCadet, bpXpEarned, earnedCredits, petXpToAward, finalScore, playSuccess]);

  // If this mission was a Competitive Squad Race, fetch final squad standings
  useEffect(() => {
    if (!state.squadCode) return;
    const fetchSquadPodium = () => {
      fetch(`/api/squad/${state.squadCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.room?.cadets) {
            setSquadPodium(data.room.cadets);
          }
        })
        .catch(() => {});
    };
    fetchSquadPodium();
    const interval = setInterval(fetchSquadPodium, 4000);
    return () => clearInterval(interval);
  }, [state.squadCode]);

  const handlePlayAgain = () => {
    playClick();
    quitMission();
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}
    dispatch({ type: 'RESTART' });
  };

  const handleReturnToCommandCenter = () => {
    playClick();
    quitMission();
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}
    dispatch({ type: 'RESTART' });
    window.location.assign('/');
  };

  const handleGoToCampaignMap = (targetUrl: string = '/planets') => {
    playClick();
    quitMission();
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}
    dispatch({ type: 'RESTART' });
    router.push(targetUrl);
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
        <div className="absolute inset-0 bg-[#0B1026]/95 no-print" aria-hidden="true" />

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
            bg-[#0F172A]
            rounded-3xl border
            ${isVictory ? 'border-[#22C55E]/60 shadow-[#22C55E]/20' : 'border-[#EF4444]/60 shadow-[#EF4444]/20'}
            shadow-2xl p-6 sm:p-8
            animate-[slide-up_0.4s_ease-out] max-h-[90vh] overflow-y-auto
          `}
          role="dialog"
          aria-label={isVictory ? 'Mission Complete' : 'Mission Failed'}
        >
          {/* Icon */}
          <div className="text-5xl sm:text-6xl mb-3" aria-hidden="true">
            {isVictory ? '🎉' : state.gameOverReason === 'timeout' ? '💥' : '💔'}
          </div>

          {/* Title */}
          <h2
            className={`text-2xl sm:text-3xl font-extrabold mb-1 ${
              isVictory ? 'text-[#22C55E]' : 'text-[#EF4444]'
            }`}
          >
            {isVictory
              ? (isMars ? 'Mars Outpost Mission Complete!' : `${cartridge.name} Mission Operation Complete!`)
              : state.gameOverReason === 'timeout'
              ? (isMars ? 'Mission Failure: Decision Timeout' : 'Mission Failure: Blitz Timeout')
              : (isMars ? 'Mission Depletion: Abort' : `${cartridge.name} Operation Aborted`)}
          </h2>

          <p className="text-sm text-[#F8FAFC]/70 mb-4">
            {isVictory
              ? (isMars
                  ? `Commander ${displayCallsign}, you successfully survived all ${state.maxSol} ${dayUnit.plural.toLowerCase()} on ${cartridge.name}!`
                  : `Commander ${displayCallsign}, tactical mission objective on ${cartridge.name} successfully cleared with a score of ${finalScore.toLocaleString()} PTS!`)
              : state.gameOverReason === 'timeout'
              ? (isMars
                  ? `Commander ${displayCallsign}, life-support collapsed on ${dayUnit.singular} ${state.sol} after failing to commit countermeasures before the 15s timer expired.`
                  : `Commander ${displayCallsign}, tactical mission timer expired during rapid blitz operation.`)
              : (isMars
                  ? `Commander ${displayCallsign}, your outpost sustained operations for ${state.sol} ${dayUnit.plural.toLowerCase()} before mission abort.`
                  : `Commander ${displayCallsign}, tactical mission aborted on ${cartridge.name}. Score: ${finalScore.toLocaleString()} PTS.`)}
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

            {/* Timed Crisis Mode Statistics */}
            {state.isTimedMode && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-bold">
                  <span>⏱️ Timed Crisis Protocol</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold">
                  <span>🕒 Mission Time: {formatMissionDuration(state.missionTimeSeconds)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold">
                  <span>⚡ Rapid Response: +{(state.rapidResponseBonus || 0).toLocaleString()} pts</span>
                </span>
              </div>
            )}

            {/* Mars Colony Economy, Battle Pass & Companion Pet Rewards Banner */}
            <div className="mt-4 w-full p-3.5 rounded-2xl bg-[#111827] border border-emerald-500/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-left">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30">💰</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-black text-emerald-300 text-sm block leading-none">
                      +{earnedCredits} Galaxy Coins Earned!
                    </span>
                    {isFiveStar && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/50">
                        +25% VIP BONUS
                      </span>
                    )}
                    {guildBuff.creditsBonusPercent > 0 && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/50">
                        +{guildBuff.creditsBonusPercent}% GUILD BUFF
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-white/60 mt-0.5 block">
                    Credited to Colony Wallet for Marketplace trading &amp; upgrades
                  </span>
                </div>
              </div>

              {/* Battle Pass XP Award */}
              <div className="flex items-center gap-2">
                <span className="text-xl p-1 rounded-xl bg-cyan-500/20 border border-cyan-400/30">🎖️</span>
                <div>
                  <span className="font-bold text-cyan-300 block leading-none">
                    +{bpXpEarned} Battle Pass XP
                  </span>
                  <span className="text-[10px] text-white/60 mt-0.5 block">
                    Galactic Pass season rank progression
                  </span>
                </div>
              </div>

              {state.equippedPet && petXpToAward > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xl p-1 rounded-xl bg-purple-500/20 border border-purple-400/30">{state.equippedPet.avatar || '🐾'}</span>
                  <div>
                    <span className="font-bold text-cyan-300 block leading-none">
                      +{petXpToAward} XP to {state.equippedPet.name}
                    </span>
                    <span className="text-[10px] text-white/60 mt-0.5 block">
                      Companion Pet progression synchronized
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Squad Race Mission Podium (if in Squad Mode) */}
          {state.squadCode && (
            <div className="mb-6 text-left p-4 rounded-2xl bg-[#111827] border border-slate-700/80 shadow-lg">
              <div className="flex items-center justify-between mb-3 border-b border-purple-500/20 pb-2">
                <span className="text-xs font-mono font-extrabold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏁</span> Competitive Squad Mission Podium
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/40">
                  ROOM: {state.squadCode}
                </span>
              </div>

              {squadPodium.length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-white/50">
                  Retrieving telemetry standings from squad relay...
                </div>
              ) : (
                <div className="space-y-2">
                  {squadPodium.map((cadet, idx) => {
                    const isYou = cadet.cadetId === activeCadet.cadetId || cadet.callsign === activeCadet.callsign;
                    const medals = ['🥇 1ST', '🥈 2ND', '🥉 3RD', '🎖️ 4TH'];
                    const medalBadge = medals[idx] || `#${idx + 1}`;
                    const rankStyles = [
                      'border-amber-400/60 bg-amber-500/10 text-amber-300',
                      'border-slate-300/50 bg-slate-400/10 text-slate-200',
                      'border-amber-700/50 bg-amber-700/10 text-amber-500',
                      'border-white/10 bg-white/5 text-slate-400',
                    ];
                    const rankStyle = rankStyles[idx] || 'border-white/10 bg-white/5 text-slate-400';

                    return (
                      <div
                        key={cadet.cadetId}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-mono transition-all ${
                          isYou
                            ? 'bg-purple-900/30 border-purple-400/60 ring-1 ring-purple-400/40 shadow-sm'
                            : 'bg-[#0B1026]/70 border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${rankStyle}`}>
                            {medalBadge}
                          </span>
                          <span className="text-base">{cadet.avatar || '🧑‍🚀'}</span>
                          <div className="min-w-0">
                            <div className="font-bold text-white flex items-center gap-1.5 truncate">
                              <span className="truncate">{cadet.callsign}</span>
                              {isYou && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/40 text-purple-200 border border-purple-400/60">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-white/50 flex items-center gap-2">
                              <span>{dayUnit.singular} {cadet.sol}/30</span>
                              <span>•</span>
                              <span className={cadet.alive ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                                {cadet.alive ? (cadet.sol >= 30 ? `${dayUnit.singular} 30 REACHED` : 'ACTIVE') : 'FLATLINED'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end pl-2">
                          <span className="text-sm font-extrabold text-[#E87040] tabular-nums">
                            {cadet.score.toLocaleString()}
                            <span className="text-[10px] font-normal text-white/40 ml-1">pts</span>
                          </span>
                          <div className="flex items-center gap-1.5 text-[9px] text-white/40">
                            <span>⚡{cadet.power}%</span>
                            <span>🫧{cadet.oxygen}%</span>
                            <span>🛡️{cadet.shielding}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Telemetry Sparkline & Analytics Debrief (Mars Survival Only) */}
          {isMars && (
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-extrabold text-[#38BDF8] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊</span> Outpost {dayUnit.singular} Telemetry Analysis
                </span>
                <span className="text-[10px] font-mono text-white/50">
                  {state.telemetryHistory?.length || 0} {dayUnit.plural} Logged
                </span>
              </div>
              <TelemetryChart history={state.telemetryHistory ?? []} maxSol={state.maxSol} />
            </div>
          )}

          {/* Official Outpost Completion Certificate Preview on Victory */}
          {isVictory && (
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-extrabold text-[#22C55E] uppercase tracking-wider flex items-center gap-1">
                  <span>📜</span> {isMars ? 'Official Mars Outpost Certificate' : `Official ${cartridge.name} Mission Certificate`}
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
                  p-6 rounded-2xl border border-amber-400/40 bg-[#111827]
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
                      {isMars ? `${dayUnit.singular} 30 VERIFIED` : 'MISSION VERIFIED'}
                    </span>
                    <span className="text-[10px] text-white/50">{currentDateFormatted}</span>
                  </div>
                </div>

                {/* Recipient / Callsign */}
                <div className="text-center py-2 space-y-1">
                  <span className="text-xs font-mono uppercase text-amber-200/80 tracking-widest block">
                    This official certificate is proudly awarded to
                  </span>
                  {isFiveStar && (
                    <div className="text-[11px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5 mb-1">
                      <span>★★★★★</span> FIVE-STAR GENERAL <span>★★★★★</span>
                    </div>
                  )}
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white flex items-center justify-center gap-2">
                    <span>{activeCadet.avatar}</span>
                    {guildTag && (
                      <span className={`text-base px-2 py-0.5 rounded ${
                        isGuildGoldTrim
                          ? 'text-amber-300 bg-amber-400/20 border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                          : 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/50'
                      }`}>
                        [{guildTag}]
                      </span>
                    )}
                    <span className="tracking-wide">{rawCallsign}</span>
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
                  {isMars
                    ? `For outstanding courage, resource management, and scientific resilience demonstrated during the 30-${dayUnit.singular} ${cartridge.name} Outpost Expedition under NASA DONKI solar event conditions.`
                    : `For outstanding operational reflexes, precision tactical maneuvers, and scientific mission completion demonstrated during the ${cartridge.name} Tactical Operation.`}
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
                      {activeCadet.badges.length} CAREER BADGES
                    </span>
                  </div>
                </div>

                {/* Seal & Verification */}
                <div className="mt-4 pt-3 border-t border-amber-400/20 flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>EXPEDITION ID: {activeCadet.cadetId.substring(0, 14)}</span>
                  <span className="text-amber-300/80 font-bold">★ SEAL OF {cartridge.name.toUpperCase()} COMMAND ★</span>
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

          {/* NASA Planetary Science Debrief Transmission Card */}
          {planetFacts.length > 0 && (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] border border-cyan-500/30 text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🛰️</span> NASA Planetary Science Transmission // {cartridge.name.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                  AUTHENTICATED
                </span>
              </div>
              <div className="text-xs font-mono text-amber-300 font-bold">
                📌 {planetFacts[0]?.title}
              </div>
              <p className="text-xs text-starlight/90 leading-relaxed font-sans">
                {planetFacts[0]?.fact}
              </p>
              <div className="text-[10px] font-mono text-cyan-300/70 pt-1 flex items-center justify-between border-t border-white/5">
                <span>NASA Telemetry: {planetFacts[0]?.nasaSource}</span>
                <span className="text-amber-400">{'★'.repeat(planetFacts[0]?.funRating || 5)}</span>
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

          {/* Newly Unlocked Planetary Campaign Sector Alert */}
          {unlockedNextCartridge && (
            <div className="mb-5 p-4 rounded-3xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border-2 border-emerald-400 text-left shadow-[0_0_30px_rgba(52,211,153,0.35)] animate-bounce-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/60 border border-emerald-400/50 flex items-center justify-center text-3xl shadow-md flex-shrink-0">
                  <span>🔓</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-black uppercase text-emerald-300 tracking-widest flex items-center gap-1.5">
                    <span>✨</span>
                    <span>NEW SECTOR UNLOCKED!</span>
                  </div>
                  <div className="text-base sm:text-lg font-heading font-black text-white">
                    {unlockedNextCartridge.sector} // {unlockedNextCartridge.name.toUpperCase()}
                  </div>
                  <p className="text-xs text-starlight/80 leading-snug">
                    Score clearance achieved! You have unlocked landing clearance for {unlockedNextCartridge.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleGoToCampaignMap(`/planets/${unlockedNextCartridge.id}`)}
                className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 border border-emerald-200 text-slate-950 font-bold text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0 text-center cursor-pointer"
              >
                Explore {unlockedNextCartridge.name} →
              </button>
            </div>
          )}

          {/* Outpost Telemetry Stats (Mars Survival) OR Arcade Mission Performance Grid (Other Worlds) */}
          {isMars ? (
            <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs sm:text-sm">
              <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5">
                <div className="text-[#F8FAFC]/50 text-[11px]">{dayUnit.plural} Survived</div>
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
          ) : (
            <div className="grid grid-cols-2 gap-2.5 mb-6 text-xs sm:text-sm font-mono">
              <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5 text-left">
                <div className="text-[#F8FAFC]/50 text-[11px]">Objective Outcome</div>
                <div className={`text-base font-extrabold ${isVictory ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isVictory ? 'SECTOR CLEARED' : 'OPERATION ABORTED'}
                </div>
              </div>
              <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5 text-left">
                <div className="text-[#F8FAFC]/50 text-[11px]">Mission Rating</div>
                <div className="text-base font-extrabold text-amber-300">
                  {starDisplay}
                </div>
              </div>
              <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5 text-left">
                <div className="text-[#F8FAFC]/50 text-[11px]">Operational Mode</div>
                <div className="text-base font-extrabold text-cyan-300">
                  {state.isTimedMode ? 'BLITZ 1.5x' : 'STANDARD ARCADE'}
                </div>
              </div>
              <div className="bg-[#0B1026]/70 rounded-xl p-3 border border-white/5 text-left">
                <div className="text-[#F8FAFC]/50 text-[11px]">Total Score</div>
                <div className="text-base font-extrabold text-[#E87040] tabular-nums">
                  {finalScore.toLocaleString()} PTS
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 no-print">
            <Button variant="primary" size="lg" onClick={handlePlayAgain} className="w-full justify-center">
              🚀 Play Another Mission
            </Button>
            <button
              type="button"
              onClick={() => handleGoToCampaignMap('/planets')}
              className="w-full py-3 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-98"
            >
              <span>🪐</span>
              <span>Solar System Campaign Map</span>
              <span>→</span>
            </button>
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
            <Button
              variant="secondary"
              size="md"
              onClick={handleReturnToCommandCenter}
              className="w-full justify-center text-xs flex items-center gap-1.5"
            >
              <span>🏠</span> Return to Command Center
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
