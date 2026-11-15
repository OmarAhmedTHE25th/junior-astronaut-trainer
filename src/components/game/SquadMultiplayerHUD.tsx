'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSound } from '@/lib/sound';
import {
  SQUAD_ROLES,
  type SquadMatch,
  type SquadMember,
  type SquadRole,
} from '@/lib/matchmakingTypes';
import { SquadRealtimeClient } from '@/lib/realtimeClient';

interface SquadMultiplayerHUDProps {
  matchId: string;
  playerId: string;
  playerName: string;
}

export default function SquadMultiplayerHUD({
  matchId,
  playerId,
  playerName,
}: SquadMultiplayerHUDProps) {
  const { playClick, playAction, playAlert, playSuccess } = useSound();
  const [match, setMatch] = useState<SquadMatch | null>(null);
  const [commsInput, setCommsInput] = useState('');
  const [isCommsOpen, setIsCommsOpen] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const realtimeClientRef = useRef<SquadRealtimeClient | null>(null);
  const commsEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize Realtime Client with SSE and fallback
  useEffect(() => {
    const client = new SquadRealtimeClient({
      matchId,
      playerId,
      playerName,
      onStateUpdate: (updatedMatch) => {
        setMatch(updatedMatch);
      },
      onError: (err) => {
        console.warn('Realtime client notice:', err);
      },
    });

    realtimeClientRef.current = client;

    return () => {
      client.destroy();
      realtimeClientRef.current = null;
    };
  }, [matchId, playerId, playerName]);

  // Scroll comms to bottom on new messages
  useEffect(() => {
    if (isCommsOpen && commsEndRef.current) {
      commsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [match?.events, isCommsOpen]);

  if (!match) {
    return (
      <div className="w-full bg-[#131838] border-b border-cyan-500/30 px-4 py-2 text-center text-xs font-mono text-cyan-300 animate-pulse">
        🛰️ Synchronizing Real-Time Telemetry Mesh for Match {matchId.slice(0, 8)}...
      </div>
    );
  }

  const currentMember = match.members.find((m) => m.playerId === playerId);
  const myRole: SquadRole = currentMember?.role || 'commander';
  const roleMeta = SQUAD_ROLES[myRole];
  const resources = match.sharedResources;

  // Execute Role Tactical Action
  const handlePerformRoleAction = async () => {
    if (!realtimeClientRef.current) return;
    playAction();

    const res = await realtimeClientRef.current.performTacticalAction(
      roleMeta.tacticalActionName,
      roleMeta.icon,
      roleMeta.tacticalActionEffects
    );

    if (res.success) {
      playSuccess();
      setActionSuccessMsg(`Executed: ${roleMeta.tacticalActionName}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

  // Send Quick-Ping
  const handleQuickPing = async (pingText: string) => {
    if (!realtimeClientRef.current) return;
    playClick();
    await realtimeClientRef.current.sendTacticalChat(pingText, true, myRole);
  };

  // Send Text Comms
  const handleSendComms = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = commsInput.trim();
    if (!clean || !realtimeClientRef.current) return;

    playClick();
    setCommsInput('');
    await realtimeClientRef.current.sendTacticalChat(clean, false, myRole);
  };

  const isLowRes =
    resources.power <= 20 ||
    resources.oxygen <= 20 ||
    resources.water <= 20 ||
    resources.shielding <= 20;

  return (
    <aside
      aria-label="Real-time squad tactical console"
      className="w-full bg-gradient-to-r from-[#0d1226]/95 via-[#131838]/95 to-[#0d1226]/95 border-b border-cyan-500/40 shadow-xl backdrop-blur-md z-30"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 space-y-2.5">
        {/* Top Ribbon: Match Status, Code, & Shared Habitat Telemetry */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-extrabold text-cyan-300 tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🛰️ SQUAD MESH ACTIVE</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-white border border-cyan-400/40">
                CODE: {match.joinCode}
              </span>
              <span className="text-white/60">Sol {match.currentSol}/30</span>
            </span>
          </div>

          {/* 5 Shared Habitat Life Support Bars */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Power */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/30">
              <span title="Habitat Power">⚡</span>
              <span className="font-bold text-amber-300 tabular-nums">{resources.power}%</span>
            </div>
            {/* Oxygen */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-blue-500/30">
              <span title="Habitat Oxygen">🫁</span>
              <span className="font-bold text-blue-300 tabular-nums">{resources.oxygen}%</span>
            </div>
            {/* Water */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              <span title="Water Reclamation">💧</span>
              <span className="font-bold text-cyan-300 tabular-nums">{resources.water}%</span>
            </div>
            {/* Hull Shielding */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <span title="Hull & Shielding">🛡️</span>
              <span className="font-bold text-emerald-300 tabular-nums">{resources.shielding}%</span>
            </div>
            {/* Crew Morale */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-purple-500/30">
              <span title="Crew Morale">💪</span>
              <span className="font-bold text-purple-300 tabular-nums">{resources.morale}%</span>
            </div>
          </div>

          {/* Comms Toggle */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setIsCommsOpen(!isCommsOpen);
            }}
            className="px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>💬</span>
            <span>Tactical Comms</span>
            {match.events && match.events.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-400 text-black text-[9px] font-bold">
                {match.events.length}
              </span>
            )}
          </button>
        </div>

        {/* Squad Members Real-Time Roster Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {match.members.map((m) => {
            const isMe = m.playerId === playerId;
            const role = SQUAD_ROLES[m.role];
            const isOnline = m.isBot || Date.now() - m.lastSeenAt < 8000;

            return (
              <div
                key={m.playerId}
                className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  isMe
                    ? 'bg-purple-950/30 border-purple-400/60 shadow-sm'
                    : 'bg-black/30 border-white/5'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <span className="text-xl">{m.avatar}</span>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                        m.isBot
                          ? 'bg-cyan-400'
                          : isOnline
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-rose-500'
                      }`}
                      title={isOnline ? 'Online' : 'Signal lost'}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[90px]">
                        {m.playerName}
                      </span>
                      {isMe && (
                        <span className="text-[8px] font-extrabold px-1 rounded bg-purple-500/40 text-purple-200">
                          YOU
                        </span>
                      )}
                      {m.isBot && (
                        <span className="text-[8px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300">
                          BOT
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/50 block font-mono truncate">
                      {role.icon} {role.badge}
                    </span>
                  </div>
                </div>

                {/* Last Action or Action Trigger */}
                {isMe ? (
                  <button
                    type="button"
                    onClick={handlePerformRoleAction}
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-[10px] uppercase tracking-wider shadow cursor-pointer transition-all active:scale-95 flex items-center gap-1 flex-shrink-0"
                    title={roleMeta.tacticalActionDescription}
                  >
                    <span>⚡</span>
                    <span className="hidden xl:inline">Execute</span>
                    <span>Role Action</span>
                  </button>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    Linked
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Success Toast */}
        {actionSuccessMsg && (
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono text-center animate-slide-up">
            ✓ {actionSuccessMsg}
          </div>
        )}

        {/* Low Resource Warning Banner */}
        {isLowRes && (
          <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono text-center animate-pulse flex items-center justify-center gap-2">
            <span>🚨 HABITAT CRITICAL:</span>
            <span>One or more shared life-support meters are below 20%! Coordinate squad actions immediately!</span>
          </div>
        )}

        {/* Tactical Quick-Ping Console */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5 text-[11px] font-mono">
          <span className="text-white/40 uppercase tracking-widest text-[9px] mr-1">
            QUICK COMMS:
          </span>
          <button
            type="button"
            onClick={() => handleQuickPing('⚠️ Crisis Alert! Review habitat gauges!')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-amber-300 cursor-pointer"
          >
            ⚠️ Alert!
          </button>
          <button
            type="button"
            onClick={() => handleQuickPing('⚡ Divert power! Systems depleted!')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-orange-300 cursor-pointer"
          >
            ⚡ Need Power!
          </button>
          <button
            type="button"
            onClick={() => handleQuickPing('🫁 Atmospheric O2 falling! Purge scrubbers!')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-blue-300 cursor-pointer"
          >
            🫁 Low O2!
          </button>
          <button
            type="button"
            onClick={() => handleQuickPing('💧 Water reclamation loop critical!')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-300 cursor-pointer"
          >
            💧 Need Water!
          </button>
          <button
            type="button"
            onClick={() => handleQuickPing('🛡️ Polarize outer hull shielding!')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-300 cursor-pointer"
          >
            🛡️ Shielding!
          </button>
          <button
            type="button"
            onClick={() => handleQuickPing('👍 Affirmative. Countermeasures deployed.')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer"
          >
            👍 Affirmative
          </button>
        </div>

        {/* Expandable Tactical Comms Drawer */}
        {isCommsOpen && (
          <div className="p-3 rounded-2xl bg-[#090d1f] border border-cyan-500/30 space-y-3 animate-slide-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-xs font-mono text-cyan-300 font-bold">
              <span>📡 TACTICAL COMMS &amp; EVENT LOG</span>
              <button
                type="button"
                onClick={() => setIsCommsOpen(false)}
                className="text-white/40 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            {/* Message Feed */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 text-xs font-mono">
              {match.events && match.events.length > 0 ? (
                match.events.map((ev, i) => {
                  const isChat = ev.eventType === 'tactical_chat';
                  const payload = ev.payload as Record<string, string>;

                  return (
                    <div
                      key={i}
                      className={`p-1.5 rounded-lg border text-[11px] ${
                        isChat
                          ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200'
                          : 'bg-white/5 border-white/5 text-white/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-white/40 mb-0.5">
                        <span className="font-bold text-cyan-400">
                          {isChat ? payload.playerName || ev.playerId : 'SYSTEM'}
                        </span>
                        <span>{new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      <p className="leading-snug">
                        {isChat ? payload.text : JSON.stringify(payload.message || payload.actionName || ev.eventType)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-white/40 text-center py-4">
                  Tactical radio frequency open. No transmissions logged yet.
                </div>
              )}
              <div ref={commsEndRef} />
            </div>

            {/* Comms Text Input */}
            <form onSubmit={handleSendComms} className="flex gap-2">
              <input
                type="text"
                value={commsInput}
                onChange={(e) => setCommsInput(e.target.value)}
                placeholder="Broadcast transmission to squad..."
                maxLength={100}
                className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold cursor-pointer"
              >
                Transmit
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
