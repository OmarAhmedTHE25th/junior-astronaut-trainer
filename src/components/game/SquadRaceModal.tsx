'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import { LANDING_SITES } from '@/lib/constants';
import { SPECIALTY_METAS } from '@/lib/types';
import type { LandingSiteId, SquadRoom } from '@/lib/types';

interface SquadRaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SquadRaceModal({ isOpen, onClose }: SquadRaceModalProps) {
  const router = useRouter();
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [landingZone, setLandingZone] = useState<LandingSiteId>('jezero');
  const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
  const [callsign, setCallsign] = useState(activeCadet.callsign || 'CDR-NOVA-01');
  const [joinCode, setJoinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<SquadRoom | null>(null);
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial callsign from profile
  useEffect(() => {
    if (activeCadet.callsign) {
      setCallsign(activeCadet.callsign);
    }
  }, [activeCadet.callsign]);

  // Clean up poll timer on unmount or modal close
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Poll room updates when in lobby
  const pollRoom = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/squad/${code}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.room) {
        setCurrentRoom(data.room);

        // If host launched the mission, redirect all cadets to the game!
        if (data.room.status === 'ACTIVE') {
          playAction();
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          onClose();
          const timedSuffix = data.room.isTimedMode ? '&timed=true' : '';
          router.push(`/game?squad=${data.room.roomCode}${timedSuffix}`);
        }
      }
    } catch {
      // Non-blocking offline resilience
    }
  }, [onClose, playAction, router]);

  useEffect(() => {
    if (currentRoom?.roomCode && currentRoom.status === 'LOBBY') {
      pollTimerRef.current = setInterval(() => {
        pollRoom(currentRoom.roomCode);
      }, 1500);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [currentRoom?.roomCode, currentRoom?.status, pollRoom]);

  // Create Squad Room
  const handleCreate = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch('/api/squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          landingZone,
          isTimedMode,
          cadet: {
            cadetId: activeCadet.cadetId,
            callsign: callsign.trim().toUpperCase() || 'CDR-ALPHA',
            avatar: activeCadet.avatar || '👨‍🚀',
            specialty: activeCadet.specialty || 'commander',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        playSuccess();
        setCurrentRoom(data.room);
      } else {
        playAlert();
        setErrorMsg(data.error || 'Failed to establish squad room');
      }
    } catch (err) {
      playAlert();
      setErrorMsg(err instanceof Error ? err.message : 'Network error establishing squad room');
    } finally {
      setIsLoading(false);
    }
  };

  // Join Squad Room
  const handleJoin = async () => {
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setErrorMsg('Please enter a valid squad frequency code.');
      playAlert();
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch('/api/squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'JOIN',
          roomCode: cleanCode,
          cadet: {
            cadetId: activeCadet.cadetId,
            callsign: callsign.trim().toUpperCase() || 'CADET-SQUAD',
            avatar: activeCadet.avatar || '🚀',
            specialty: activeCadet.specialty || 'commander',
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        playSuccess();
        setCurrentRoom(data.room);
      } else {
        playAlert();
        setErrorMsg(data.error || 'Failed to connect to squad');
      }
    } catch (err) {
      playAlert();
      setErrorMsg(err instanceof Error ? err.message : 'Network error joining squad');
    } finally {
      setIsLoading(false);
    }
  };

  // Host launches mission
  const handleLaunchSquad = async () => {
    if (!currentRoom) return;
    setIsLoading(true);
    playAction();

    try {
      const res = await fetch('/api/squad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'START',
          roomCode: currentRoom.roomCode,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        onClose();
        const timedSuffix = data.room.isTimedMode ? '&timed=true' : '';
        router.push(`/game?squad=${data.room.roomCode}${timedSuffix}`);
      } else {
        setErrorMsg(data.error || 'Failed to start squad mission');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error starting mission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = currentRoom && currentRoom.cadets[0]?.cadetId === activeCadet.cadetId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setCurrentRoom(null);
        setErrorMsg(null);
        onClose();
      }}
      title="🏁 Competitive Squad Mode • Mars Race"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">
        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/50 text-red-300 text-xs flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-white/60 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* LOBBY VIEW (When room is active) */}
        {currentRoom ? (
          <div className="space-y-5 animate-slide-up">
            {/* Room Header & Code Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1a1f3d] to-[#0B1026] border-2 border-[#E87040] shadow-xl text-center space-y-2">
              <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E87040] block">
                🛰️ Squad Radio Frequency Code
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-widest bg-black/40 px-4 py-1.5 rounded-xl border border-white/10 select-all">
                  {currentRoom.roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-2 rounded-xl bg-[#E87040]/20 hover:bg-[#E87040]/30 border border-[#E87040]/40 text-[#E87040] font-mono text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer min-h-[44px]"
                  title="Copy room code to clipboard"
                >
                  {copied ? '✅ COPIED' : '📋 COPY'}
                </button>
              </div>
              <p className="text-[11px] text-[#F8FAFC]/60">
                Share this 6-character frequency code with up to 3 crewmates to compete on the same terrain &amp; solar storm seed!
              </p>
            </div>

            {/* Room Telemetry Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/5">
                <span className="text-[#F8FAFC]/50 block text-[10px]">LANDING ZONE:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1.5 mt-0.5 truncate">
                  <span>🪐</span>
                  {LANDING_SITES[currentRoom.landingZone]?.name || 'Jezero Crater'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/5">
                <span className="text-[#F8FAFC]/50 block text-[10px]">DONKI WEATHER SEED:</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1.5 mt-0.5 truncate">
                  <span>☀️</span>
                  #{currentRoom.weatherSeed}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[#F8FAFC]/50 block text-[10px]">CRISIS PROTOCOL:</span>
                <span className={`font-bold flex items-center gap-1.5 mt-0.5 truncate ${currentRoom.isTimedMode ? 'text-rose-400' : 'text-emerald-400'}`}>
                  <span>{currentRoom.isTimedMode ? '⏱️' : '🛡️'}</span>
                  {currentRoom.isTimedMode ? '15s TIMED CRISIS' : 'STANDARD UNTIMED'}
                </span>
              </div>
            </div>

            {/* Connected Cadets Roster (1-4 slots) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#F8FAFC]/70 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <span>👥</span> Connected Squad Cadets ({currentRoom.cadets.length}/4)
                </span>
                <span className="text-[10px] text-[#22C55E] flex items-center gap-1 animate-pulse">
                  ● Telemetry Mesh Live
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[0, 1, 2, 3].map((slotIdx) => {
                  const cadet = currentRoom.cadets[slotIdx];
                  if (cadet) {
                    const specialty = SPECIALTY_METAS.find((s) => s.id === cadet.specialty);
                    const isLocal = cadet.cadetId === activeCadet.cadetId;

                    return (
                      <div
                        key={cadet.cadetId}
                        className={`
                          p-3 rounded-xl border flex items-center justify-between gap-3 transition-all
                          ${isLocal
                            ? 'bg-[#E87040]/15 border-[#E87040] shadow-md shadow-[#E87040]/15'
                            : 'bg-[#1a1f3d]/80 border-white/10'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-2xl">{cadet.avatar || '👨‍🚀'}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-white text-xs truncate">
                                {cadet.callsign}
                              </span>
                              {slotIdx === 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  HOST
                                </span>
                              )}
                              {isLocal && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#F8FAFC]/60 block truncate">
                              {specialty?.icon} {specialty?.name || 'Astronaut'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-[#22C55E] font-mono">READY</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`empty-slot-${slotIdx}`}
                      className="p-3 rounded-xl border border-dashed border-white/10 bg-white/2 flex items-center justify-center text-white/40 text-xs font-mono gap-2"
                    >
                      <span className="animate-spin text-sm">📡</span>
                      <span>Awaiting Cadet #{slotIdx + 1}...</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch or Wait Action */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              {isHost ? (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleLaunchSquad}
                    disabled={isLoading}
                    className="w-full justify-center text-sm font-heading tracking-wider py-3.5"
                  >
                    🚀 Launch Squad Mission ({currentRoom.cadets.length} Cadet{currentRoom.cadets.length > 1 ? 's' : ''})
                  </Button>
                  <p className="text-[11px] text-white/50 text-center font-mono">
                    As Flight Director, clicking launch will immediately start the mission for all connected squad members.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center space-y-1">
                  <span className="text-xs font-mono font-bold text-blue-300 block animate-pulse">
                    🛰️ Standing by on squad frequency...
                  </span>
                  <p className="text-[11px] text-white/60">
                    The Flight Director will initiate orbital insertion once all cadets are ready.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    playClick();
                    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                    setCurrentRoom(null);
                  }}
                  className="text-xs"
                >
                  ← Exit Squad Lobby
                </Button>
                <span className="text-[10px] text-white/40 font-mono">
                  Room: {currentRoom.roomCode}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* CREATE OR JOIN TABS */
          <div className="space-y-5">
            {/* Tab Bar */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0B1026] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setTab('create');
                }}
                className={`
                  py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all cursor-pointer min-h-[44px]
                  ${tab === 'create'
                    ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                  }
                `}
              >
                🚀 Establish Squad
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setTab('join');
                }}
                className={`
                  py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all cursor-pointer min-h-[44px]
                  ${tab === 'join'
                    ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                    : 'text-white/60 hover:text-white'
                  }
                `}
              >
                📡 Join Squad Room
              </button>
            </div>

            {/* Cadet Callsign Banner */}
            <div className="p-3.5 rounded-xl bg-[#0B1026]/90 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeCadet.avatar}</span>
                <div>
                  <span className="text-[10px] font-mono text-white/50 block">ASTRONAUT CALLSIGN:</span>
                  <input
                    type="text"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value.toUpperCase().slice(0, 16))}
                    className="font-mono font-bold text-white text-xs bg-transparent border-b border-white/20 focus:border-[#E87040] focus:outline-none py-0.5 tracking-wider"
                    maxLength={16}
                  />
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {SPECIALTY_METAS.find((s) => s.id === activeCadet.specialty)?.name || 'Commander'}
              </span>
            </div>

            {/* CREATE TAB CONTENT */}
            {tab === 'create' && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white mb-2">
                    Select Mars Landing Zone
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(['jezero', 'gale', 'olympus'] as LandingSiteId[]).map((siteId) => {
                      const site = LANDING_SITES[siteId];
                      const isSelected = landingZone === siteId;

                      return (
                        <button
                          key={siteId}
                          type="button"
                          onClick={() => {
                            playClick();
                            setLandingZone(siteId);
                          }}
                          className={`
                            p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[90px]
                            ${isSelected
                              ? 'bg-[#E87040]/15 border-[#E87040] shadow-md shadow-[#E87040]/20'
                              : 'bg-[#1a1f3d]/70 border-white/10 hover:border-white/30'
                            }
                          `}
                        >
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {site.name}
                            </span>
                            <span className="text-[10px] text-white/50 block mt-0.5 font-mono">
                              {site.elevation}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#E87040] font-medium mt-1">
                            {site.perksSummary}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Squad Crisis Protocol Mode Selector */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white mb-2">
                    Select Squad Crisis Protocol
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setIsTimedMode(false);
                      }}
                      className={`
                        p-2.5 rounded-xl border text-left transition-all cursor-pointer
                        ${
                          !isTimedMode
                            ? 'bg-[#1a1f3d] border-[#22C55E] ring-1 ring-[#22C55E]/40'
                            : 'bg-[#0B1026]/70 border-white/10 hover:border-white/20 opacity-75'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>🛡️</span>
                        <span>Standard Mode</span>
                      </div>
                      <span className="text-[10px] text-white/50 block mt-0.5">
                        Untimed co-op race
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setIsTimedMode(true);
                      }}
                      className={`
                        p-2.5 rounded-xl border text-left transition-all cursor-pointer
                        ${
                          isTimedMode
                            ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/40'
                            : 'bg-[#0B1026]/70 border-white/10 hover:border-white/20 opacity-75'
                        }
                      `}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>⏱️</span>
                        <span>Timed Crisis</span>
                      </div>
                      <span className="text-[10px] text-rose-300/80 block mt-0.5">
                        15s / Sol (loss on 0s) + speed bonuses
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#F8FAFC]/70 space-y-1">
                  <span className="text-amber-400 font-bold block flex items-center gap-1.5">
                    <span>⚡</span> Identical Weather Seed Guaranteed
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    All 4 cadets in this squad will experience the exact same DONKI solar storm sequences and Martian crises. Survival depends entirely on your tactical engineering choices!
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="w-full justify-center text-sm font-heading tracking-wider py-3.5"
                >
                  {isLoading ? 'Establishing Frequency...' : '🛰️ Establish Squad Room'}
                </Button>
              </div>
            )}

            {/* JOIN TAB CONTENT */}
            {tab === 'join' && (
              <div className="space-y-4 animate-slide-up">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white mb-2">
                    Enter 6-Character Squad Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. MARS42"
                    className="
                      w-full p-4 rounded-xl bg-[#0B1026] border-2 border-white/20
                      text-center font-mono font-extrabold text-2xl tracking-[0.3em] text-white
                      focus:border-[#E87040] focus:outline-none uppercase placeholder:text-white/20
                    "
                    maxLength={6}
                  />
                  <p className="text-[11px] text-white/50 mt-1.5 text-center font-mono">
                    Ask your squad Flight Director for their 6-letter frequency code.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleJoin}
                  disabled={isLoading || joinCode.trim().length < 4}
                  className="w-full justify-center text-sm font-heading tracking-wider py-3.5"
                >
                  {isLoading ? 'Connecting to Frequency...' : '📡 Connect to Squad'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
