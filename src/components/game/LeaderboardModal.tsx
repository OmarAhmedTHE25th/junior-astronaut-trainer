'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { LeaderboardEntry } from '@/lib/types';
import { useProfile } from '@/lib/profile';
import { playClick } from '@/lib/sound';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightScore?: number;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  highlightScore,
}: LeaderboardModalProps) {
  const { profile } = useProfile();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCloud, setIsCloud] = useState<boolean>(false);
  const [storageType, setStorageType] = useState<string>('local');

  const fetchScores = useCallback(async (difficulty: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?difficulty=${difficulty}&limit=25`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setIsCloud(Boolean(data.isCloudStorage));
        setStorageType(data.storageType || (data.isCloudStorage ? 'neon' : 'local'));
      }
    } catch {
      // If server unreachable, check client local backup
      try {
        const local = localStorage.getItem('jat_local_leaderboard_v1');
        if (local) {
          setEntries(JSON.parse(local));
        }
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchScores(selectedDifficulty);
    }
  }, [isOpen, selectedDifficulty, fetchScores]);

  const difficulties = [
    { id: 'all', label: 'All Flights' },
    { id: 'cadet', label: 'Cadet' },
    { id: 'commander', label: 'Commander' },
    { id: 'pioneer', label: 'Pioneer' },
  ];

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return <span className="font-mono font-bold text-xs text-[#F8FAFC]/50">#{rank}</span>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🏆 Global Deep Space Leaderboard">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Backend & Cloud Status Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-[#0B1026]/90 rounded-xl border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#F8FAFC]/70 font-semibold">
              Storage Adapter:
            </span>
            <span className="font-bold text-white">
              {isCloud || storageType === 'neon' ? '🟢 Neon Postgres Live' : '💾 Zero-Setup In-Memory Fallback'}
            </span>
          </div>
          <span className="text-[#F8FAFC]/40 text-[11px] font-mono">
            Anti-Cheat Verified Scores
          </span>
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex gap-2 border-b border-white/10 pb-3">
          {difficulties.map((d) => {
            const isSelected = selectedDifficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedDifficulty(d.id);
                }}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px]
                  ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                      : 'bg-[#1a1f3d] text-[#F8FAFC]/60 hover:text-white'
                  }
                `}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-2xl border border-white/10 bg-[#0B1026]/60 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-[#F8FAFC]/60 flex flex-col items-center gap-2">
              <span className="text-2xl animate-spin">⏳</span>
              <span>Retrieving telemetry rankings...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#F8FAFC]/50">
              No flight records found for this difficulty. Be the first to land on Mars! 🚀
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {entries.map((entry, idx) => {
                const rankNum = entry.rank || idx + 1;
                const isCurrentPlayer = entry.cadetId === profile.cadetId;
                const isHighlightedScore =
                  typeof highlightScore === 'number' && entry.score === highlightScore;

                return (
                  <div
                    key={`${entry.cadetId}-${entry.timestamp}-${idx}`}
                    className={`
                      flex items-center gap-3 p-3.5 transition-colors
                      ${
                        isCurrentPlayer || isHighlightedScore
                          ? 'bg-[#E87040]/15 border-l-4 border-l-[#E87040]'
                          : 'hover:bg-white/5'
                      }
                    `}
                  >
                    {/* Rank */}
                    <div className="w-9 flex items-center justify-center flex-shrink-0">
                      {getRankBadge(rankNum)}
                    </div>

                    {/* Avatar & Callsign */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#1a1f3d] border border-white/10 flex items-center justify-center text-lg flex-shrink-0">
                        {entry.avatar || '🚀'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-white truncate">
                            {entry.callsign}
                          </span>
                          {isCurrentPlayer && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-[#E87040] text-white">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#F8FAFC]/50 block">
                          Sol {entry.solsSurvived}/30 • {entry.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Badges count */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-[#E87040]" title={`${entry.badgesCount} badges earned`}>
                      <span>🎖️</span>
                      <span className="font-bold tabular-nums">{entry.badgesCount || 0}</span>
                    </div>

                    {/* Final Score */}
                    <div className="text-right flex-shrink-0">
                      <div className="font-extrabold text-sm sm:text-base text-[#22C55E] tabular-nums">
                        {entry.score.toLocaleString()} <span className="text-xs font-normal text-[#22C55E]/70">pts</span>
                      </div>
                      <span className="text-[9px] text-[#22C55E]/80 font-mono block">
                        ✓ Verified
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchScores(selectedDifficulty)}
          >
            🔄 Refresh
          </Button>
          <Button variant="primary" onClick={onClose}>
            Back to Command
          </Button>
        </div>
      </div>
    </Modal>
  );
}
