'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useBattlePass, BATTLEPASS_TIERS, getClaimableTiersCount } from '@/lib/battlePass';
import { useProfile, DEFAULT_PROFILE } from '@/lib/profile';
import { useWallet } from '@/context/WalletContext';
import { playClick, playSuccess } from '@/lib/sound';

interface BattlePassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStore?: () => void;
}

export default function BattlePassModal({ isOpen, onClose, onOpenStore }: BattlePassModalProps) {
  const { profile, isLoaded } = useProfile();
  const activeCadet = isLoaded ? profile : DEFAULT_PROFILE;
  const { creditsBalance, isFiveStarGeneral: walletIsFiveStar, refreshWallet } = useWallet();
  const {
    state: bpState,
    currentTier,
    progress,
    claimTier,
    claimAll,
    activateGeneral,
  } = useBattlePass();

  const isFiveStarGeneral = walletIsFiveStar || bpState.isFiveStarGeneral;
  const claimableCount = getClaimableTiersCount(bpState, isFiveStarGeneral);

  const [isBatchClaiming, setIsBatchClaiming] = useState(false);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [claimToast, setClaimToast] = useState<{
    count: number;
    coins: number;
    items: string[];
    titles: string[];
  } | null>(null);

  // Auto-dismiss confirmation toast after 6 seconds
  useEffect(() => {
    if (!claimToast) return;
    const timer = setTimeout(() => {
      setClaimToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [claimToast]);

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const handleClaimAll = async () => {
    if (claimableCount <= 0 || isBatchClaiming) return;
    playClick();
    setIsBatchClaiming(true);

    try {
      const res = await claimAll(activeCadet.cadetId, isFiveStarGeneral);
      if (res.success && res.claimedCount > 0) {
        playSuccess();
        await refreshWallet();
        setClaimToast({
          count: res.claimedCount,
          coins: res.totalCoinsEarned,
          items: res.unlockedItems.map((i) => `${i.quantity}x ${i.label}`),
          titles: res.unlockedTitles,
        });
      }
    } catch (err) {
      console.error('Batch claim failed:', err);
    } finally {
      setIsBatchClaiming(false);
    }
  };

  const handleClaimSingle = async (tier: number, isPremium: boolean) => {
    playClick();
    const key = `${tier}-${isPremium ? 'vip' : 'free'}`;
    setProcessingTier(key);

    try {
      const res = await claimTier(tier, isPremium, activeCadet.cadetId);
      if (res.success && res.reward) {
        playSuccess();
        await refreshWallet();
        setClaimToast({
          count: 1,
          coins: res.reward.mcAmount || 0,
          items: res.reward.itemSlug ? [res.reward.label] : [],
          titles: res.reward.titleName ? [res.reward.titleName] : [],
        });
      }
    } catch (err) {
      console.error('Tier claim failed:', err);
    } finally {
      setProcessingTier(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Galactic Battle Pass"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#070b18]/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] bg-[#0c1224] border-2 border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden animate-slide-up text-white font-sans">
        {/* ── TOP HEADER ── */}
        <div className="p-4 sm:p-5 border-b border-cyan-500/20 bg-[#080d1a] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-inner animate-pulse">
              <span>⭐</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  SEASON 1 LIVE
                </span>
                <span className="text-[10px] font-mono text-starlight/60">
                  WALLET: {creditsBalance.toLocaleString()} GC
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-black text-white leading-tight">
                Galactic Battle Pass
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Glowing Claim All Button */}
            {claimableCount > 0 ? (
              <button
                type="button"
                onClick={handleClaimAll}
                disabled={isBatchClaiming}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
              >
                {isBatchClaiming ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>CLAIMING...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Claim All Rewards ({claimableCount})</span>
                  </>
                )}
              </button>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <span>✓</span>
                <span>All Tiers Claimed</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
              aria-label="Close Battle Pass"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Confirmation Toast / Banner */}
          {claimToast && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-slate-900 to-amber-950/95 border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.35)] flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-3">
                <span className="text-3xl shrink-0">🎉</span>
                <div>
                  <div className="font-heading font-black text-emerald-300 text-sm uppercase tracking-wider">
                    Batch Claim Successful!
                  </div>
                  <div className="text-xs text-starlight/90 leading-snug">
                    Claimed <strong>{claimToast.count}</strong> reward{claimToast.count > 1 ? 's' : ''}!{' '}
                    {claimToast.coins > 0 && (
                      <span className="text-amber-300 font-bold font-mono">
                        +{claimToast.coins.toLocaleString()} Galaxy Coins credited.{' '}
                      </span>
                    )}
                    {claimToast.items.length > 0 && (
                      <span className="text-cyan-200">
                        Added {claimToast.items.join(', ')} to Colony Inventory.{' '}
                      </span>
                    )}
                    {claimToast.titles.length > 0 && (
                      <span className="text-purple-300 font-semibold">
                        Unlocked title: {claimToast.titles.join(', ')}.
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClaimToast(null)}
                className="text-white/60 hover:text-white text-xs px-2 py-1 rounded bg-black/40 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Five-Star General VIP Status Card */}
          {isFiveStarGeneral ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#1e1b10] border-2 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.15)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⭐⭐⭐⭐⭐</span>
                  <div>
                    <span className="font-heading font-black text-amber-300 text-base uppercase tracking-wider block">
                      Five-Star General VIP Active
                    </span>
                    <span className="text-xs text-amber-200/80">
                      Apex Cadet Credentials • Sovereign Command Privileges
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/50 text-xs font-mono font-bold">
                  VIP STATUS VERIFIED
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-400/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span><strong>3 Retries</strong> / Run</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎰</span>
                  <span><strong>1 Free Daily</strong> Drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span><strong>+25% GC</strong> Bonus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <span><strong>10 Tiers</strong> VIP Access</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-amber-400/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span className="font-heading font-black text-amber-300 text-base uppercase tracking-wider">
                    Upgrade to Five-Star General
                  </span>
                </div>
                <p className="text-xs text-starlight/75 mt-1 max-w-xl leading-relaxed">
                  Unlock 3 Emergency Life-Support Retries on every mission, 1 Free Sovereign Drop Pod every 24 hours, +25% Galaxy Coin payouts, and all 10 Premium Battle Pass reward tiers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onOpenStore) {
                    onOpenStore();
                    onClose();
                  } else {
                    activateGeneral();
                  }
                }}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider border border-amber-200 shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
              >
                Unlock VIP Pass ($4.99) →
              </button>
            </div>
          )}

          {/* Season Level & XP Progress Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0F172A] border border-slate-700 shadow-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎖️</span>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    Season 1 Telemetry Progress
                  </h3>
                  <span className="text-xs text-white/60">
                    Earn XP automatically by clearing planetary sectors and surviving Mars Sols.
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase block">
                  Current Rank
                </span>
                <span className="font-heading font-black text-xl text-white">
                  Tier {currentTier} <span className="text-xs text-white/50">/ 10</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-starlight/70">
                <span>Tier {currentTier} XP Progress</span>
                <span className="font-bold text-cyan-300">
                  {progress.current} / {progress.max} XP ({progress.percent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-white/40 font-mono">
                Total Season XP: {bpState.xp.toLocaleString()} XP
              </div>
            </div>
          </div>

          {/* 10-Tier Track List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-black text-sm text-cyan-300 uppercase tracking-wider">
                10-Tier Reward Track
              </h3>
              {claimableCount > 0 && (
                <span className="text-xs font-mono font-bold text-amber-300">
                  {claimableCount} Unclaimed Reward{claimableCount > 1 ? 's' : ''} Ready!
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {BATTLEPASS_TIERS.map((tierDef) => {
                const isUnlocked = tierDef.tier <= currentTier;
                const isFreeClaimed = bpState.claimedFreeTiers.includes(tierDef.tier);
                const isPremiumClaimed = bpState.claimedPremiumTiers.includes(tierDef.tier);
                const isFreeProcessing = processingTier === `${tierDef.tier}-free`;
                const isPremiumProcessing = processingTier === `${tierDef.tier}-vip`;

                return (
                  <div
                    key={tierDef.tier}
                    className={`
                      p-3.5 sm:p-4 rounded-2xl border transition-all
                      ${
                        isUnlocked
                          ? 'bg-[#111827] border-slate-700 shadow-md'
                          : 'bg-[#090d1f] border-slate-800 opacity-75'
                      }
                    `}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
                      {/* Left: Tier Number & Status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-heading font-black text-sm border ${
                            isUnlocked
                              ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                              : 'bg-black/40 border-white/10 text-white/40'
                          }`}
                        >
                          T{tierDef.tier}
                        </div>
                        <div>
                          <span className="font-heading font-black text-white text-xs block">
                            Tier {tierDef.tier.toString().padStart(2, '0')}
                          </span>
                          <span className="text-[10px] text-white/50 block font-mono">
                            {tierDef.xpRequired} XP Required
                          </span>
                        </div>
                      </div>

                      {/* Middle & Right: Free Track vs. VIP Track */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 flex-1 w-full">
                        {/* Free Track Reward */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0">{tierDef.freeReward.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold font-mono">
                                Free Track
                              </span>
                              <span className="font-bold text-xs text-white truncate block">
                                {tierDef.freeReward.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isUnlocked || isFreeClaimed || isFreeProcessing || isBatchClaiming}
                            onClick={() => handleClaimSingle(tierDef.tier, false)}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shrink-0 cursor-pointer
                              ${
                                isFreeClaimed
                                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'
                                  : isUnlocked
                                  ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-200'
                                  : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                              }
                            `}
                          >
                            {isFreeClaimed ? '✓ Claimed' : isUnlocked ? (isFreeProcessing ? '...' : 'Claim') : 'Locked'}
                          </button>
                        </div>

                        {/* VIP General Track Reward */}
                        <div className="p-2.5 sm:p-3 rounded-xl bg-[#1e1b10] border border-amber-400/40 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0">{tierDef.premiumReward.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase tracking-wider text-amber-400 block font-bold font-mono">
                                VIP General Track
                              </span>
                              <span className="font-bold text-xs text-amber-200 truncate block">
                                {tierDef.premiumReward.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={
                              (!isFiveStarGeneral && !isUnlocked) ||
                              isPremiumClaimed ||
                              isPremiumProcessing ||
                              isBatchClaiming
                            }
                            onClick={() => {
                              if (!isFiveStarGeneral) {
                                if (onOpenStore) {
                                  onOpenStore();
                                  onClose();
                                } else {
                                  activateGeneral();
                                }
                              } else if (isUnlocked) {
                                handleClaimSingle(tierDef.tier, true);
                              }
                            }}
                            className={`
                              px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all shrink-0 cursor-pointer
                              ${
                                isPremiumClaimed
                                  ? 'bg-amber-950/40 text-amber-400/60 border border-amber-900 cursor-default'
                                  : !isFiveStarGeneral
                                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50'
                                  : isUnlocked
                                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-200'
                                  : 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                              }
                            `}
                          >
                            {isPremiumClaimed
                              ? '✓ Claimed'
                              : !isFiveStarGeneral
                              ? 'Unlock VIP'
                              : isUnlocked
                              ? (isPremiumProcessing ? '...' : 'Claim VIP')
                              : 'Locked'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
