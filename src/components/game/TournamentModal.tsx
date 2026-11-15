'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import type {
  Tournament,
  TournamentDetails,
  TournamentBracketMatch,
} from '@/lib/tournamentTypes';
import TournamentBracket from './TournamentBracket';

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TournamentModal({ isOpen, onClose }: TournamentModalProps) {
  const router = useRouter();
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  const [activeTab, setActiveTab] = useState<'bracket' | 'list' | 'create'>('bracket');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields for Create Tournament
  const [newTitle, setNewTitle] = useState('Mars Endurance Cup 2026');
  const [newSize, setNewSize] = useState<4 | 8 | 16>(8);
  const [newMode, setNewMode] = useState<'solo' | 'squad'>('solo');

  // Fetch list of tournaments
  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.tournaments) {
        setTournaments(data.tournaments);
        // Default to first active or registration tournament
        if (!selectedTournamentId && data.tournaments.length > 0) {
          setSelectedTournamentId(data.tournaments[0].id);
        }
      }
    } catch {}
  }, [selectedTournamentId]);

  // Fetch details for selected tournament
  const fetchDetails = useCallback(async (id: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setTournamentDetails(data);
      }
    } catch {
      setErrorMsg('Failed to load tournament bracket');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
    }
  }, [isOpen, fetchTournaments]);

  useEffect(() => {
    if (selectedTournamentId && isOpen) {
      fetchDetails(selectedTournamentId);
    }
  }, [selectedTournamentId, isOpen, fetchDetails]);

  // Create new tournament
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          mode: newMode,
          maxEntrants: newSize,
          creatorId: activeCadet.cadetId,
          creatorName: activeCadet.callsign || 'CDR-NOVA',
          creatorAvatar: activeCadet.avatar || '👨‍🚀',
        }),
      });

      const data = await res.json();
      if (data.success && data.tournament) {
        playSuccess();
        setSelectedTournamentId(data.tournament.id);
        setTournamentDetails(data);
        setActiveTab('bracket');
        fetchTournaments();
      } else {
        setErrorMsg(data.error || 'Failed to create tournament');
        playAlert();
      }
    } catch {
      setErrorMsg('Network error creating tournament');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Tournament
  const handleJoin = async (tournamentId: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entrantId: activeCadet.cadetId,
          entrantName: activeCadet.callsign || 'CDR-NOVA',
          avatar: activeCadet.avatar || '👨‍🚀',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSelectedTournamentId(tournamentId);
        setTournamentDetails(data);
        setActiveTab('bracket');
        fetchTournaments();
      } else {
        setErrorMsg(data.error || 'Failed to join tournament');
        playAlert();
      }
    } catch {
      setErrorMsg('Network error joining tournament');
    } finally {
      setIsLoading(false);
    }
  };

  // Backfill with bots & start tournament immediately
  const handleStartWithBots = async (tournamentId: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START_WITH_BOTS',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setSelectedTournamentId(tournamentId);
        setTournamentDetails(data);
        setActiveTab('bracket');
        fetchTournaments();
      } else {
        setErrorMsg(data.error || 'Failed to start tournament');
        playAlert();
      }
    } catch {
      setErrorMsg('Network error starting tournament');
    } finally {
      setIsLoading(false);
    }
  };

  // Launch Endless Survival Match from bracket
  const handleLaunchMatch = (match: TournamentBracketMatch) => {
    if (!selectedTournamentId) return;
    playAction();
    onClose();

    const isEntrantA = match.entrantAId === activeCadet.cadetId;
    const rivalName = isEntrantA ? match.entrantBName : match.entrantAName;
    const rivalAvatar = (isEntrantA ? match.entrantBAvatar : match.entrantAAvatar) || '🤖';

    router.push(
      `/game?tournamentId=${selectedTournamentId}&matchId=${match.id}&seed=${match.rngSeed}&rival=${encodeURIComponent(
        rivalName || 'RIVAL-CADET'
      )}&rivalAvatar=${encodeURIComponent(rivalAvatar)}`
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏆 ENDLESS SURVIVAL TOURNAMENT BRACKETS"
    >
      <div className="space-y-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/50 text-red-200 text-xs flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-white/60 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 gap-2 text-xs sm:text-sm font-mono">
          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('bracket');
            }}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'bracket'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            🏆 Active Bracket
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('list');
              fetchTournaments();
            }}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            📋 Open Tournaments ({tournaments.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('create');
            }}
            className={`pb-2.5 px-3 border-b-2 font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            ➕ Host Tournament
          </button>
        </div>

        {/* ── TAB 1: ACTIVE BRACKET TREE ── */}
        {activeTab === 'bracket' && (
          <div className="space-y-4">
            {/* Tournament Selector Pill Dropdown */}
            {tournaments.length > 1 && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white/50">Viewing:</span>
                <select
                  value={selectedTournamentId || ''}
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                  className="bg-[#0B1026] text-white border border-white/15 rounded-lg px-2.5 py-1 text-xs font-mono outline-none focus:border-amber-400"
                >
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status.toUpperCase()} • {t.maxEntrants} Entrants)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoading && !tournamentDetails ? (
              <div className="text-center py-12 text-sm font-mono text-cyan-300 animate-pulse">
                🛰️ Loading tournament bracket matrix...
              </div>
            ) : tournamentDetails ? (
              <div className="space-y-4">
                {/* Registration Stage Banner */}
                {tournamentDetails.tournament.status === 'registration' && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-amber-300 block">
                        ⏳ Registration Open ({tournamentDetails.participants.length} /{' '}
                        {tournamentDetails.tournament.maxEntrants} Cadets)
                      </span>
                      <span className="text-white/70">
                        Bracket will generate automatically once full, or start now with NASA AI bots.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartWithBots(tournamentDetails.tournament.id)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono whitespace-nowrap shadow-md cursor-pointer"
                    >
                      ⚡ Fill with Bots &amp; Start
                    </button>
                  </div>
                )}

                <TournamentBracket
                  details={tournamentDetails}
                  currentUserId={activeCadet.cadetId}
                  onLaunchMatch={handleLaunchMatch}
                />
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <p className="text-white/60 text-sm">No tournament selected or active.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold cursor-pointer"
                >
                  Create Your First Tournament →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: TOURNAMENT LIST ── */}
        {activeTab === 'list' && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {tournaments.length === 0 ? (
              <div className="text-center py-10 text-sm text-white/50">
                No active tournaments found. Host one below!
              </div>
            ) : (
              tournaments.map((t) => {
                const isSelected = t.id === selectedTournamentId;

                return (
                  <div
                    key={t.id}
                    className={`
                      p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-4
                      ${
                        isSelected
                          ? 'bg-[#1e2348] border-amber-400/80 shadow-lg shadow-amber-500/10'
                          : 'bg-[#141936] border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                              : t.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-xs font-mono text-white/50">
                          {t.maxEntrants} Entrants • {t.mode.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-heading font-extrabold text-white text-base">
                        {t.title}
                      </h4>
                      {t.championName && (
                        <p className="text-xs text-amber-300">
                          👑 Champion: <strong>{t.championName}</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {t.status === 'registration' && (
                        <button
                          type="button"
                          onClick={() => handleJoin(t.id)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-mono font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          Register ✍️
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setSelectedTournamentId(t.id);
                          setActiveTab('bracket');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs transition-all cursor-pointer"
                      >
                        View Bracket 🔍
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 3: CREATE TOURNAMENT ── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4 max-w-lg mx-auto">
            <div>
              <label className="block text-xs font-mono text-white/70 mb-1">
                Tournament Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B1026] border border-white/20 text-white text-sm font-mono focus:border-purple-400 outline-none"
                placeholder="e.g. Olympus Mons Sudden-Death Cup"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-white/70 mb-1">
                  Bracket Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([4, 8, 16] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setNewSize(size)}
                      className={`py-2 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                        newSize === size
                          ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                          : 'bg-[#0B1026] text-white/60 border-white/10 hover:text-white'
                      }`}
                    >
                      {size} Teams
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-white/70 mb-1">
                  Format Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['solo', 'squad'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNewMode(mode)}
                      className={`py-2 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                        newMode === mode
                          ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                          : 'bg-[#0B1026] text-white/60 border-white/10 hover:text-white'
                      }`}
                    >
                      {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 leading-snug">
              ℹ️ <strong>Endless Survival Rules:</strong> All matches run without a 30-sol cap on a deterministic shared seed. The entrant surviving the most Sols and hours advances through the bracket!
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="
                w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500
                hover:opacity-95 text-white font-heading font-extrabold text-sm uppercase tracking-wider
                shadow-xl shadow-purple-500/20 active:scale-95 transition-all cursor-pointer
              "
            >
              {isLoading ? 'Creating Bracket...' : '🏆 Create & Open Registration'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
