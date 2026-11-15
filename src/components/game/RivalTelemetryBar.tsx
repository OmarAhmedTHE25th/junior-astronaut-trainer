'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { RivalTelemetryUpdate } from '@/lib/tournamentTypes';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';
import {
  SABOTAGE_CATALOG,
  type SabotageSlug,
  type SabotagePaymentType,
} from '@/lib/sabotageTypes';

interface RivalTelemetryBarProps {
  tournamentId: string;
  matchId: string;
  entrantId: string;
  currentSol: number;
  rivalName?: string;
  rivalAvatar?: string;
}

export default function RivalTelemetryBar({
  tournamentId,
  matchId,
  entrantId,
  currentSol,
  rivalName = 'Rival Cadet',
  rivalAvatar = '🤖',
}: RivalTelemetryBarProps) {
  const { state, dispatch } = useGame();
  const { playClick, playAlert, playSuccess } = useSound();

  const [rival, setRival] = useState<RivalTelemetryUpdate | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isTriggering, setIsTriggering] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<SabotagePaymentType>('power');
  const [walletCredits, setWalletCredits] = useState<number>(500);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch Player Wallet Balance for MC payments
  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/wallet?playerId=${encodeURIComponent(entrantId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.wallet) {
        setWalletCredits(data.wallet.creditsBalance ?? 500);
      }
    } catch {}
  }, [entrantId]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Fetch Rival Telemetry Periodic Loop
  useEffect(() => {
    let isMounted = true;

    const fetchRivalTelemetry = async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/rival?matchId=${matchId}&entrantId=${entrantId}&sol=${currentSol}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.rival && isMounted) {
          setRival(data.rival);
        }
      } catch {}
    };

    fetchRivalTelemetry();
    const interval = setInterval(fetchRivalTelemetry, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournamentId, matchId, entrantId, currentSol]);

  // Execute Sabotage Operation
  const handleLaunchSabotage = async (slug: SabotageSlug) => {
    const def = SABOTAGE_CATALOG[slug];
    if (!def) return;

    // Check payment viability
    if (paymentMode === 'power' && state.power < def.powerCost) {
      playAlert();
      setActionFeedback(`⚠️ Insufficient Outpost Power! Requires ${def.powerCost}⚡ (Current: ${state.power}⚡)`);
      return;
    }

    if (paymentMode === 'mc' && walletCredits < def.mcCost) {
      playAlert();
      setActionFeedback(`⚠️ Insufficient Mars Credits! Requires ${def.mcCost} MC (Balance: ${walletCredits} MC)`);
      return;
    }

    // Check cooldown
    const cooldownUntil = state.sabotageCooldowns?.[slug];
    if (cooldownUntil && cooldownUntil > state.sol) {
      playAlert();
      setActionFeedback(`⏳ ${def.name} on cooldown until Sol ${cooldownUntil}`);
      return;
    }

    setIsTriggering(slug);
    setActionFeedback(null);
    playClick();

    try {
      const res = await fetch('/api/sabotage/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextType: 'tournament',
          contextId: matchId,
          attackerId: entrantId,
          attackerName: state.callsign || 'Commander Nova',
          attackerAvatar: state.avatar || '👨‍🚀',
          targetId: rival?.rivalId || 'ghost-rival-ai',
          targetName: rival?.rivalName || rivalName,
          sabotageSlug: slug,
          paymentType: paymentMode,
          isBotTarget: true,
          currentSol: state.sol,
        }),
      });

      const data = await res.json();

      if (data.success) {
        playSuccess();
        if (data.remainingCredits !== undefined) {
          setWalletCredits(data.remainingCredits);
        }

        // Dispatch local state update
        dispatch({
          type: 'TRIGGER_SABOTAGE',
          slug,
          paymentType: paymentMode,
          powerCost: paymentMode === 'power' ? def.powerCost : 0,
          stolenO2: slug === 'supply-intercept' ? 6 : 0,
          stolenPower: slug === 'supply-intercept' ? 5 : 0,
          targetName: rival?.rivalName || rivalName,
        });

        setActionFeedback(`🎯 ${def.name} successfully deployed against ${rival?.rivalName || rivalName}!`);

        // If bot retaliated immediately
        if (data.counterAttack) {
          setTimeout(() => {
            playAlert();
            dispatch({ type: 'RECEIVE_SABOTAGE', event: data.counterAttack });
          }, 1200);
        }
      } else {
        playAlert();
        setActionFeedback(`❌ Sabotage failed: ${data.error || 'Server rejected order'}`);
      }
    } catch {
      playAlert();
      setActionFeedback('❌ Communication failure transmitting electronic warfare signal.');
    } finally {
      setIsTriggering(null);
    }
  };

  const isEmpJammed = Boolean(state.activeDebuffs && state.activeDebuffs.empJammedSols > 0);

  return (
    <div className="w-full bg-[#0d112b]/95 border-b border-amber-500/40 text-xs font-mono shadow-xl backdrop-blur-md transition-all">
      {/* ── TOP TELEMETRY COMPARISON BAR ── */}
      <div className="px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Tournament Match Identifier */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="font-heading font-extrabold text-amber-300 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
            <span>🏆 ENDLESS BRACKET HEAT</span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="hidden sm:inline text-[11px] font-normal text-white/70">
              Sudden-Death Endurance
            </span>
          </span>
        </div>

        {/* Synchronized Rival Telemetry Comparison */}
        <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
          <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
            <span className="text-base">{rival?.rivalAvatar || rivalAvatar}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-[11px]">
                  {rival?.rivalName || rivalName}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    rival?.isAlive !== false
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {rival?.isAlive !== false ? `Sol ${rival?.sol ?? currentSol}` : 'Eliminated'}
                </span>
              </div>
              <p className="text-[10px] text-white/60 truncate max-w-[200px] sm:max-w-[260px]">
                {rival?.statusText || 'Synchronizing rival telemetry...'}
              </p>
            </div>
          </div>

          {/* Rival Vital Telemetry Meters (Glitching if Player is EMP Jammed) */}
          {rival && rival.isAlive && (
            <div className="flex items-center gap-2.5 text-[11px]">
              <span
                title="Rival Power"
                className={`text-amber-300 ${isEmpJammed ? 'animate-pulse text-purple-300 font-extrabold' : ''}`}
              >
                ⚡ {isEmpJammed ? '??%' : `${rival.power}%`}
              </span>
              <span
                title="Rival Oxygen"
                className={`text-cyan-300 ${isEmpJammed ? 'animate-pulse text-purple-300 font-extrabold' : ''}`}
              >
                🫁 {isEmpJammed ? '??%' : `${rival.oxygen}%`}
              </span>
              <span
                title="Rival Shielding"
                className={`text-purple-300 ${isEmpJammed ? 'animate-pulse text-purple-300 font-extrabold' : ''}`}
              >
                🛡️ {isEmpJammed ? '??%' : `${rival.shielding}%`}
              </span>
            </div>
          )}

          {/* Electronic Warfare Drawer Toggle Button */}
          <button
            onClick={() => {
              playClick();
              setIsDrawerOpen((prev) => !prev);
            }}
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-900/60 to-rose-900/60 border border-purple-500/40 text-purple-200 font-bold hover:border-purple-400 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <span className="text-amber-300">⚡</span>
            <span>Electronic Warfare</span>
            <span className="text-[10px] text-white/60">{isDrawerOpen ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* ── EXPANDED ELECTRONIC WARFARE & SABOTAGE DRAWER ── */}
      {isDrawerOpen && (
        <div className="bg-[#080b1e] border-t border-purple-500/25 px-3 sm:px-4 py-2.5 transition-all animate-slide-up">
          {/* Header & Payment Currency Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1">
                <span>🛰️ OFFENSIVE CYBER-OPERATIONS</span>
                <span className="text-white/40">•</span>
                <span className="text-white/70 font-normal text-[10px]">
                  Target: {rival?.rivalName || rivalName}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-white/60">Pay with:</span>
              <div className="inline-flex rounded-lg bg-black/50 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPaymentMode('power');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    paymentMode === 'power'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ⚡ Power ({state.power}⚡)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPaymentMode('mc');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    paymentMode === 'mc'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  🪙 Credits ({walletCredits} MC)
                </button>
              </div>
            </div>
          </div>

          {/* 4 Tactical Sabotage Operations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {(Object.keys(SABOTAGE_CATALOG) as SabotageSlug[]).map((slug) => {
              const def = SABOTAGE_CATALOG[slug];
              const cooldownUntil = state.sabotageCooldowns?.[slug];
              const isOnCooldown = Boolean(cooldownUntil && cooldownUntil > state.sol);
              const remainingCd = isOnCooldown ? (cooldownUntil as number) - state.sol : 0;
              const isExecuting = isTriggering === slug;

              const canAfford =
                paymentMode === 'power'
                  ? state.power >= def.powerCost
                  : walletCredits >= def.mcCost;

              return (
                <div
                  key={slug}
                  className={`
                    p-2.5 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden
                    ${
                      isOnCooldown
                        ? 'bg-black/30 border-white/5 opacity-60'
                        : !canAfford
                        ? 'bg-[#121528] border-white/10 opacity-75'
                        : 'bg-[#121736] border-purple-500/30 hover:border-purple-400 hover:bg-[#161d44] shadow-sm'
                    }
                  `}
                >
                  {/* Top Bar: Icon, Name & Cooldown */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm">{def.icon}</span>
                        <span className="font-bold text-white text-[11px] truncate">
                          {def.name}
                        </span>
                      </div>
                      {isOnCooldown && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
                          {remainingCd}s CD
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-white/65 leading-tight mb-2 line-clamp-2">
                      {def.targetEffectDesc}
                    </p>
                  </div>

                  {/* Action Trigger Button */}
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-amber-300">
                      {paymentMode === 'power' ? `${def.powerCost}⚡` : `${def.mcCost} MC`}
                    </span>

                    <button
                      type="button"
                      disabled={isOnCooldown || !canAfford || Boolean(isTriggering)}
                      onClick={() => handleLaunchSabotage(slug)}
                      className={`
                        px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer
                        ${
                          isOnCooldown
                            ? 'bg-white/5 text-white/30 cursor-not-allowed'
                            : !canAfford
                            ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md active:scale-95'
                        }
                      `}
                    >
                      {isExecuting ? (
                        <span>Transmitting...</span>
                      ) : isOnCooldown ? (
                        <span>Locked ({remainingCd}s)</span>
                      ) : !canAfford ? (
                        <span>Low Funds</span>
                      ) : (
                        <span>Deploy Op →</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-[11px] text-amber-200 flex items-center justify-between animate-fade-in">
              <span>{actionFeedback}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-white/50 hover:text-white text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
