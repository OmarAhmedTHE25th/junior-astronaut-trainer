'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import {
  SQUAD_ROLES,
  type SquadRole,
  type SquadMatch,
} from '@/lib/matchmakingTypes';

interface SquadMatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SquadMatchmakingModal({
  isOpen,
  onClose,
}: SquadMatchmakingModalProps) {
  const router = useRouter();
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  const [activeTab, setActiveTab] = useState<'matchmaking' | 'private'>('matchmaking');
  const [preferredRole, setPreferredRole] = useState<SquadRole>('commander');
  const [isQueuing, setIsQueuing] = useState(false);
  const [queueCount, setQueueCount] = useState(1);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchedId, setMatchedId] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<SquadMatch | null>(null);
  const [privateCode, setPrivateCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchPollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up all timers on unmount or close
  const cleanupTimers = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (matchPollTimerRef.current) clearInterval(matchPollTimerRef.current);
    pollTimerRef.current = null;
    matchPollTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => cleanupTimers();
  }, [cleanupTimers]);

  // Leave queue when modal closes
  const handleModalClose = useCallback(async () => {
    if (isQueuing && !matchedId) {
      try {
        await fetch('/api/matchmaking/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: activeCadet.cadetId,
            action: 'CANCEL',
          }),
        });
      } catch {}
    }
    cleanupTimers();
    setIsQueuing(false);
    setMatchedId(null);
    setMatchState(null);
    onClose();
  }, [isQueuing, matchedId, activeCadet.cadetId, cleanupTimers, onClose]);

  // ── 1. Enter Matchmaking Queue ──
  const handleJoinQueue = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    playClick();

    try {
      const res = await fetch('/api/matchmaking/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          playerName: activeCadet.callsign || 'CDR-NOVA',
          avatar: activeCadet.avatar || '👨‍🚀',
          preferredRole,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to join queue.');
      }

      setIsQueuing(true);
      if (data.status === 'matched' && data.matchId) {
        playSuccess();
        setMatchedId(data.matchId);
      } else {
        setQueueCount(data.queueCount || 1);
        startQueuePolling();
      }
    } catch (err) {
      playAlert();
      setErrorMsg(err instanceof Error ? err.message : 'Connection failure entering queue.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 2. Poll Queue Status ──
  const startQueuePolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/matchmaking/status?playerId=${encodeURIComponent(activeCadet.cadetId)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success) {
          if (data.status === 'matched' && data.matchId) {
            playSuccess();
            setMatchedId(data.matchId);
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          } else {
            setQueueCount(data.queueCount || 1);
            setCountdown(data.countdownSeconds ?? null);
          }
        }
      } catch {
        // Non-blocking resilience
      }
    }, 1500);
  }, [activeCadet.cadetId, playSuccess]);

  // ── 3. Force Start with NASA AI Bots ──
  const handleForceStartBots = async () => {
    setIsLoading(true);
    playAction();

    try {
      const res = await fetch('/api/matchmaking/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          action: 'FORCE_START',
        }),
      });

      const data = await res.json();
      if (data.success && data.matchId) {
        playSuccess();
        cleanupTimers();
        setMatchedId(data.matchId);
      } else {
        setErrorMsg(data.error || 'Failed to initialize autonomous bots.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error launching squad bots.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 4. Cancel Queue ──
  const handleCancelQueue = async () => {
    playClick();
    cleanupTimers();
    setIsQueuing(false);

    try {
      await fetch('/api/matchmaking/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          action: 'CANCEL',
        }),
      });
    } catch {}
  };

  // ── 5. Poll Match State Once in Lobby ──
  useEffect(() => {
    if (!matchedId) return;

    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/match/${matchedId}/stream?poll=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.match) {
          setMatchState(data.match);

          // If match starts, deploy to Mars!
          if (data.match.status === 'in_progress') {
            playAction();
            cleanupTimers();
            onClose();
            router.push(`/game?matchId=${matchedId}`);
          }
        }
      } catch {}
    };

    fetchMatch();
    matchPollTimerRef.current = setInterval(fetchMatch, 1200);

    return () => {
      if (matchPollTimerRef.current) clearInterval(matchPollTimerRef.current);
    };
  }, [matchedId, onClose, playAction, router, cleanupTimers]);

  // ── 6. Role Selection & Lock-In in Lobby ──
  const handleSelectRole = async (role: SquadRole) => {
    if (!matchedId) return;
    playClick();

    try {
      const res = await fetch(`/api/match/${matchedId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          actionType: 'ROLE_CHANGE',
          payload: { role },
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        setMatchState(data.match);
      } else if (data.error) {
        setErrorMsg(data.error);
        playAlert();
      }
    } catch {
      setErrorMsg('Failed to lock role.');
    }
  };

  // ── 7. Toggle Ready Status in Lobby ──
  const handleToggleReady = async () => {
    if (!matchedId || !matchState) return;
    playClick();

    const currentMember = matchState.members.find((m) => m.playerId === activeCadet.cadetId);
    const nextReady = !currentMember?.isReady;

    try {
      const res = await fetch(`/api/match/${matchedId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          actionType: 'READY_TOGGLE',
          payload: { isReady: nextReady },
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        setMatchState(data.match);
      }
    } catch {
      setErrorMsg('Failed to update ready status.');
    }
  };

  const currentMember = matchState?.members.find((m) => m.playerId === activeCadet.cadetId);
  const allReady =
    matchState &&
    matchState.members.length >= 2 &&
    matchState.members.every((m) => m.isReady);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="🛰️ REAL-TIME SQUAD MULTIPLAYER"
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

        {/* LOBBY VIEW (When Matched) */}
        {matchedId && matchState ? (
          <div className="space-y-5 animate-slide-up">
            {/* Squad Header Banner */}
            <div className="p-4 rounded-2xl bg-[#111827] border-2 border-cyan-400 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
                    Tactical Squad Linked • Code: {matchState.joinCode}
                  </span>
                </div>
                <h3 className="text-lg font-heading font-extrabold text-white mt-1">
                  Mars Base Alpha • Orbital Descent Bay
                </h3>
                <p className="text-xs text-white/60">
                  Landing Site: <strong className="text-amber-300">{matchState.landingZone.toUpperCase()}</strong> • DONKI Seed: <strong className="text-cyan-300">#{matchState.weatherSeed}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(matchState.joinCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-400 text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  {copied ? '✅ COPIED' : `📋 CODE: ${matchState.joinCode}`}
                </button>
              </div>
            </div>

            {/* 4 Squad Member Slots */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, idx) => {
                const member = matchState.members[idx];
                const isYou = member?.playerId === activeCadet.cadetId;
                const isOnline =
                  member && (member.isBot || Date.now() - member.lastSeenAt < 8000);
                const roleMeta = member ? SQUAD_ROLES[member.role] : null;

                if (!member) {
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center min-h-[140px]"
                    >
                      <span className="text-2xl opacity-40 animate-pulse">🛰️</span>
                      <span className="text-xs font-mono text-white/40 mt-2">
                        Awaiting Cadet...
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={member.playerId}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col justify-between min-h-[140px] ${
                      isYou
                        ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/20'
                        : 'bg-[#0B1026]/80 border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{member.avatar}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate max-w-[90px]">
                                {member.playerName}
                              </span>
                              {isYou && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/40 text-purple-200">
                                  YOU
                                </span>
                              )}
                              {member.isBot && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                                  BOT
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/50 block font-mono">
                              {member.isBot ? 'NASA AI' : isOnline ? '● Online' : '⚠️ AFK'}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            member.isBot
                              ? 'bg-cyan-400'
                              : isOnline
                              ? 'bg-emerald-400 animate-pulse'
                              : 'bg-amber-400'
                          }`}
                          title={isOnline ? 'Active link' : 'Signal lagging'}
                        />
                      </div>

                      {/* Assigned Role */}
                      <div className="mt-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold ${
                            roleMeta?.colorTheme.badgeBg
                          } ${roleMeta?.colorTheme.badgeText} ${roleMeta?.colorTheme.border}`}
                        >
                          <span>{roleMeta?.icon}</span>
                          <span>{roleMeta?.name}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-white/50">STATUS:</span>
                      <span
                        className={`font-bold ${
                          member.isReady ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {member.isReady ? '✓ READY' : 'LOCKING IN...'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role Lock-In Matrix (Prevents Duplicate Roles) */}
            <div className="p-4 rounded-2xl bg-[#0B1026]/90 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-extrabold text-white uppercase tracking-wider">
                  Select &amp; Lock Survival Discipline (No Duplicates Allowed)
                </span>
                <span className="text-[10px] text-white/50 font-mono">
                  Current: {SQUAD_ROLES[currentMember?.role || 'commander'].name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {(Object.keys(SQUAD_ROLES) as SquadRole[]).map((roleKey) => {
                  const role = SQUAD_ROLES[roleKey];
                  const claimingMember = matchState.members.find((m) => m.role === roleKey);
                  const isClaimedByYou = claimingMember?.playerId === activeCadet.cadetId;
                  const isClaimedByOther = claimingMember && !isClaimedByYou;

                  return (
                    <button
                      key={roleKey}
                      type="button"
                      disabled={isClaimedByOther || currentMember?.isReady}
                      onClick={() => handleSelectRole(roleKey)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[120px] ${
                        isClaimedByYou
                          ? 'bg-purple-900/30 border-purple-400 ring-1 ring-purple-400 shadow-md'
                          : isClaimedByOther
                          ? 'bg-white/5 border-white/5 opacity-40 cursor-not-allowed'
                          : 'bg-[#1a1f3d]/60 border-white/10 hover:border-cyan-400 cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{role.icon}</span>
                          {isClaimedByYou ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500 text-white font-mono">
                              YOUR ROLE
                            </span>
                          ) : isClaimedByOther ? (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 truncate max-w-[80px]">
                              {claimingMember.playerName}
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono text-cyan-300">
                              AVAILABLE
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs text-white mt-1">
                          {role.name}
                        </h4>
                        <p className="text-[10px] text-white/60 leading-tight mt-0.5">
                          {role.perkDescription}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono text-amber-300 mt-2 block">
                        ⚡ {role.tacticalActionName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Action Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleToggleReady}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-heading font-extrabold text-sm tracking-wider cursor-pointer shadow-sm transition-all ${
                  currentMember?.isReady
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500 border border-emerald-400'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold border border-cyan-200'
                }`}
              >
                {currentMember?.isReady ? '✓ YOU ARE LOCKED IN & READY' : '🔒 LOCK IN ROLE & CONFIRM READY'}
              </button>

              <div className="text-right">
                <span className="text-xs font-mono text-white/70 block">
                  {allReady
                    ? '🚀 All cadets ready! Initializing descent...'
                    : 'Awaiting all cadets to lock in and toggle ready.'}
                </span>
                <span className="text-[10px] text-white/40 font-mono">
                  Match ID: {matchState.id.slice(0, 16)}...
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* MATCHMAKING QUEUE & TABS */
          <div className="space-y-5">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#0B1026] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveTab('matchmaking');
                }}
                className={`py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all cursor-pointer ${
                  activeTab === 'matchmaking'
                    ? 'bg-cyan-400/15 border border-cyan-400 text-cyan-300 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Random Matchmaking
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveTab('private');
                }}
                className={`py-2.5 rounded-xl font-heading font-bold text-xs tracking-wider transition-all cursor-pointer ${
                  activeTab === 'private'
                    ? 'bg-cyan-400/15 border border-cyan-400 text-cyan-300 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📡 Private Squad Code
              </button>
            </div>

            {/* TAB A: MATCHMAKING QUEUE */}
            {activeTab === 'matchmaking' && (
              <div className="space-y-5">
                {isQueuing ? (
                  /* Radar-Style Queue Animation Screen */
                  <div className="p-8 rounded-3xl bg-[#111827] border-2 border-cyan-500/40 text-center space-y-6 relative overflow-hidden">
                    {/* Rotating Radar Scanner */}
                    <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                      {/* Concentric rings */}
                      <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
                      <div className="absolute inset-4 rounded-full border border-cyan-500/30" />
                      <div className="absolute inset-10 rounded-full border border-cyan-500/40" />
                      <div className="absolute inset-16 rounded-full border border-cyan-500/60" />

                      {/* Rotating sweep line */}
                      <div className="absolute inset-0 rounded-full animate-spin [animation-duration:3s]">
                        <div className="w-1/2 h-1/2 bg-cyan-400/25 border-r border-b border-cyan-400/60 rounded-tl-full origin-bottom-right" />
                      </div>

                      {/* Center Blip */}
                      <div className="relative z-10 w-4 h-4 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400 animate-ping" />
                      <span className="relative z-10 text-2xl">🪐</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-cyan-300 block animate-pulse">
                        Scanning Deep Space Network Frequencies...
                      </span>
                      <h3 className="text-xl font-heading font-extrabold text-white">
                        Searching for Compatible Mars Squadmates
                      </h3>
                      <p className="text-xs text-white/60 max-w-sm mx-auto">
                        Cadets currently in orbital queue: <strong className="text-cyan-300 font-mono text-sm">{queueCount}</strong> / 4
                      </p>
                    </div>

                    {/* Auto-launch countdown if 2+ matched */}
                    {countdown !== null && (
                      <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-mono animate-bounce-subtle">
                        ⏳ Squad partial match detected! Launching in <strong>{countdown}s</strong> (or force start now).
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={handleForceStartBots}
                        disabled={isLoading}
                        className="text-xs font-mono"
                      >
                        🚀 Fill Remaining Slots with NASA Bots &amp; Launch
                      </Button>

                      <Button
                        variant="secondary"
                        size="md"
                        onClick={handleCancelQueue}
                        className="text-xs font-mono"
                      >
                        ✕ Cancel Matchmaking
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Initial Matchmaking Queue Setup */
                  <div className="space-y-4">
                    {/* Role Preference Selector */}
                    <div>
                      <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white mb-2">
                        Preferred Survival Discipline
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {(Object.keys(SQUAD_ROLES) as SquadRole[]).map((roleKey) => {
                          const r = SQUAD_ROLES[roleKey];
                          const isSelected = preferredRole === roleKey;
                          return (
                            <button
                              key={roleKey}
                              type="button"
                              onClick={() => {
                                playClick();
                                setPreferredRole(roleKey);
                              }}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#E87040]/20 border-[#E87040] shadow-md shadow-[#E87040]/20'
                                  : 'bg-[#1a1f3d]/70 border-white/10 hover:border-white/30'
                              }`}
                            >
                              <span className="text-2xl">{r.icon}</span>
                              <span className="font-bold text-xs text-white block mt-1">
                                {r.name}
                              </span>
                              <span className="text-[10px] text-white/50 block mt-0.5">
                                {r.title}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/70 space-y-1">
                      <span className="text-cyan-300 font-bold block flex items-center gap-1.5">
                        <span>🛰️</span> Real-Time Synchronized Co-Op
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        Match with up to 4 cadets in real time. Shared habitat life support, synchronized solar storm crises, and live tactical quick-comms over Neon PostgreSQL.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleJoinQueue}
                      disabled={isLoading}
                      className="w-full justify-center text-sm font-heading tracking-wider py-4"
                    >
                      {isLoading ? 'Scanning Frequencies...' : '⚡ FIND RANDOM SQUAD'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: PRIVATE SQUAD CODE */}
            {activeTab === 'private' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-white mb-2">
                    Enter 6-Character Squad Invite Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={privateCode}
                    onChange={(e) => setPrivateCode(e.target.value.toUpperCase())}
                    placeholder="e.g. UFWTHM"
                    className="w-full px-4 py-3 rounded-xl bg-[#0B1026] border-2 border-white/20 text-white font-mono font-extrabold text-center tracking-widest text-lg uppercase focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const clean = privateCode.trim().toUpperCase();
                    if (!clean || clean.length < 4) {
                      setErrorMsg('Please enter a valid squad code.');
                      return;
                    }
                    onClose();
                    router.push(`/game?squad=${clean}`);
                  }}
                  className="w-full justify-center text-sm font-heading tracking-wider py-3.5"
                >
                  🚀 Connect to Private Squad
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
