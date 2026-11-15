'use client';

import React from 'react';
import type {
  TournamentDetails,
  TournamentBracketMatch,
  TournamentParticipant,
} from '@/lib/tournamentTypes';
import { useSound } from '@/lib/sound';

interface TournamentBracketProps {
  details: TournamentDetails;
  currentUserId?: string;
  onLaunchMatch?: (match: TournamentBracketMatch) => void;
}

export default function TournamentBracket({
  details,
  currentUserId,
  onLaunchMatch,
}: TournamentBracketProps) {
  const { playClick, playAction } = useSound();
  const { tournament, rounds, participants } = details;

  const isCompleted = tournament.status === 'completed';
  const champion = isCompleted
    ? participants.find((p) => p.entrantId === tournament.championId)
    : null;

  // Find user's active/playable match in current round
  const userPlayableMatch = details.matches.find(
    (m) =>
      (m.entrantAId === currentUserId || m.entrantBId === currentUserId) &&
      m.status === 'live' &&
      m.winnerEntrantId === null &&
      m.roundNumber === tournament.currentRound
  );

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto py-2">
      {/* ── CHAMPION PODIUM CARD (When Completed) ── */}
      {isCompleted && (
        <div className="relative overflow-hidden rounded-3xl bg-[#111827] border-2 border-amber-400 p-6 md:p-8 shadow-xl text-center animate-slide-up">
          <div className="absolute top-2 right-4 text-6xl opacity-15 pointer-events-none select-none">
            🏆
          </div>
          <div className="flex flex-col items-center justify-center space-y-3">
            <span className="text-4xl animate-bounce">👑</span>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-bold uppercase tracking-widest">
              Tournament Champion Crowned
            </div>
            <h2 className="text-2xl sm:text-4xl font-heading font-extrabold text-white">
              {tournament.championName || champion?.entrantName || 'Commander Survivor'}
            </h2>
            <p className="text-sm text-starlight/80 max-w-md">
              Endured brutal escalating radiation and catastrophic life support decay across all tournament bracket rounds!
            </p>
            {champion && (
              <div className="flex items-center gap-4 mt-2 font-mono text-xs text-amber-200">
                <span className="px-3 py-1 rounded-lg bg-black/40 border border-amber-400/30">
                  Best Survival: <strong>Sol {champion.bestSolsSurvived}</strong>
                </span>
                <span className="px-3 py-1 rounded-lg bg-black/40 border border-amber-400/30">
                  Total Score: <strong>{champion.totalScore} pts</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVE MATCH HERO BANNER (If user has a playable match) ── */}
      {userPlayableMatch && (
        <div className="p-4 sm:p-6 rounded-2xl bg-[#111827] border-2 border-cyan-400 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
                Round {userPlayableMatch.roundNumber} Heat Active • {userPlayableMatch.roundName}
              </span>
            </div>
            <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white">
              {userPlayableMatch.entrantAName || 'Entrant A'} vs{' '}
              {userPlayableMatch.entrantBName || 'Entrant B'}
            </h3>
            <p className="text-xs text-starlight/70">
              Shared Seed: <code className="text-cyan-300">{userPlayableMatch.rngSeed}</code> • Sudden-Death Endurance (No 30-Sol Cap)
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              playAction();
              if (onLaunchMatch) onLaunchMatch(userPlayableMatch);
            }}
            className="
              px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300
              text-slate-950 font-heading font-extrabold text-sm border border-cyan-200
              shadow-sm active:scale-95 transition-all
              flex items-center gap-2 cursor-pointer whitespace-nowrap
            "
          >
            <span>🚀 Enter Endless Match</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* ── HORIZONTAL BRACKET TREE ── */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="min-w-[760px] flex items-stretch justify-between gap-6 md:gap-10">
          {rounds.map((round, rIdx) => {
            const isCurrent = round.roundNumber === tournament.currentRound;

            return (
              <div key={round.roundNumber} className="flex-1 flex flex-col min-w-[220px]">
                {/* Round Header */}
                <div className="text-center mb-4 pb-2 border-b border-white/10">
                  <span
                    className={`text-xs font-mono font-bold uppercase tracking-wider block ${
                      isCurrent ? 'text-cyan-300 animate-pulse' : 'text-starlight/60'
                    }`}
                  >
                    {isCurrent ? '● Active Round' : `Round ${round.roundNumber}`}
                  </span>
                  <h4 className="font-heading font-extrabold text-sm sm:text-base text-white mt-0.5">
                    {round.roundName}
                  </h4>
                </div>

                {/* Match Cards Column */}
                <div className="flex-1 flex flex-col justify-around gap-4 py-2">
                  {round.matches.map((match) => {
                    const isUserMatch =
                      match.entrantAId === currentUserId ||
                      match.entrantBId === currentUserId;

                    return (
                      <div
                        key={match.id}
                        className={`
                          relative rounded-2xl p-3.5 border transition-all shadow-md
                          ${
                            isUserMatch
                              ? 'bg-[#1b224c] border-cyan-400 shadow-cyan-500/20 ring-1 ring-cyan-400'
                              : match.status === 'completed'
                              ? 'bg-[#121633]/90 border-white/10'
                              : 'bg-[#151a3a]/80 border-purple-500/30'
                          }
                        `}
                      >
                        {/* Match Status Badge */}
                        <div className="flex items-center justify-between text-[10px] font-mono mb-2">
                          <span className="text-white/40">M#{match.matchIndex + 1}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              match.status === 'completed'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : match.status === 'live'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                                : 'bg-white/10 text-white/50'
                            }`}
                          >
                            {match.status}
                          </span>
                        </div>

                        {/* Entrant A Row */}
                        <div
                          className={`
                            flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all mb-1.5
                            ${
                              match.winnerEntrantId === match.entrantAId && match.entrantAId
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold'
                                : match.winnerEntrantId && match.winnerEntrantId !== match.entrantAId
                                ? 'opacity-40 line-through text-white/50'
                                : 'bg-black/30 text-white'
                            }
                          `}
                        >
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span>{match.entrantAAvatar || '👤'}</span>
                            <span className="truncate">
                              {match.entrantAName || 'TBD (Awaiting)'}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {match.entrantASols > 0 ? (
                              <span className="font-bold text-cyan-300">
                                Sol {match.entrantASols}
                              </span>
                            ) : (
                              <span className="text-white/40">-</span>
                            )}
                          </div>
                        </div>

                        {/* VS Divider */}
                        <div className="text-center text-[9px] font-mono text-white/30 my-0.5">
                          VS
                        </div>

                        {/* Entrant B Row */}
                        <div
                          className={`
                            flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-all
                            ${
                              match.winnerEntrantId === match.entrantBId && match.entrantBId
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold'
                                : match.winnerEntrantId && match.winnerEntrantId !== match.entrantBId
                                ? 'opacity-40 line-through text-white/50'
                                : 'bg-black/30 text-white'
                            }
                          `}
                        >
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            <span>{match.entrantBAvatar || '👤'}</span>
                            <span className="truncate">
                              {match.entrantBName || 'TBD (Awaiting)'}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {match.entrantBSols > 0 ? (
                              <span className="font-bold text-cyan-300">
                                Sol {match.entrantBSols}
                              </span>
                            ) : (
                              <span className="text-white/40">-</span>
                            )}
                          </div>
                        </div>

                        {/* Play Match Button if this is user's playable match */}
                        {isUserMatch && match.status === 'live' && !match.winnerEntrantId && (
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              if (onLaunchMatch) onLaunchMatch(match);
                            }}
                            className="
                              mt-2.5 w-full py-1.5 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/50
                              border border-cyan-400 text-cyan-200 text-[11px] font-bold font-mono
                              transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1
                            "
                          >
                            <span>▶ Play Sol Heat</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PARTICIPANTS SEED ROSTER TABLE ── */}
      <div className="bg-[#121633]/80 rounded-2xl border border-white/10 p-4">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-starlight/70 mb-3">
          Entrants &amp; Seed Rankings ({participants.length} / {tournament.maxEntrants})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {participants.map((p) => (
            <div
              key={p.id}
              className={`p-2 rounded-xl border flex items-center justify-between ${
                p.eliminatedInRound
                  ? 'bg-red-500/10 border-red-500/20 opacity-60 text-white/60'
                  : 'bg-black/30 border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-starlight/40 font-bold">#{p.seedNumber}</span>
                <span>{p.avatar}</span>
                <span className="truncate">{p.entrantName}</span>
              </div>
              <span className="text-[10px] ml-1">
                {p.eliminatedInRound ? (
                  <span className="text-red-300">Out R{p.eliminatedInRound}</span>
                ) : p.bestSolsSurvived > 0 ? (
                  <span className="text-cyan-300">Sol {p.bestSolsSurvived}</span>
                ) : (
                  <span className="text-emerald-300">Alive</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
