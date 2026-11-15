// ─── Galactic Battle Pass & Five-Star General Live-Service Progression ───
// Manages 10-Tier reward progression, VIP entitlement, and 3 emergency life-support retries.

import { useState, useEffect, useCallback } from 'react';
import { CATALOG_ITEMS, type MarketplaceItemDef } from './marketplaceTypes';

export const BATTLEPASS_STORAGE_KEY = 'jat_battlepass_v1';
export const XP_PER_TIER = 500;
export const MAX_TIER = 10;

export interface BattlePassReward {
  type: 'credits' | 'item' | 'title';
  mcAmount?: number;
  itemSlug?: string;
  quantity?: number;
  titleName?: string;
  label: string;
  icon: string;
}

export interface BattlePassTierDef {
  tier: number;
  xpRequired: number;
  freeReward: BattlePassReward;
  premiumReward: BattlePassReward;
}

export interface BattlePassState {
  xp: number;
  isFiveStarGeneral: boolean;
  claimedFreeTiers: number[];
  claimedPremiumTiers: number[];
  retriesRemaining: number;
  lastDailyVaultDate?: string;
}

export const DEFAULT_BATTLEPASS_STATE: BattlePassState = {
  xp: 0,
  isFiveStarGeneral: false,
  claimedFreeTiers: [],
  claimedPremiumTiers: [],
  retriesRemaining: 0,
};

// ─── 10-Tier Curated Reward Track ─────────────────────────────

export const BATTLEPASS_TIERS: BattlePassTierDef[] = [
  {
    tier: 1,
    xpRequired: 0,
    freeReward: { type: 'credits', mcAmount: 100, label: '100 MC', icon: '💰' },
    premiumReward: { type: 'credits', mcAmount: 500, titleName: 'Vanguard Recruit', label: '500 MC + Title', icon: '⭐' },
  },
  {
    tier: 2,
    xpRequired: 500,
    freeReward: { type: 'item', itemSlug: 'oxygen-canister', quantity: 1, label: '1x Liquid O₂ Canister', icon: '🫁' },
    premiumReward: { type: 'item', itemSlug: 'rad-shielding', quantity: 2, label: '2x Borated Shield Pack', icon: '🧲' },
  },
  {
    tier: 3,
    xpRequired: 1000,
    freeReward: { type: 'credits', mcAmount: 150, label: '150 MC', icon: '💰' },
    premiumReward: { type: 'credits', mcAmount: 750, label: '750 MC Payout', icon: '🪙' },
  },
  {
    tier: 4,
    xpRequired: 1500,
    freeReward: { type: 'item', itemSlug: 'fuel-cell', quantity: 1, label: '1x Methane Fuel Cell', icon: '⚡' },
    premiumReward: { type: 'item', itemSlug: 'hull-plating', quantity: 2, label: '2x Titanium Hull Armor', icon: '🛡️' },
  },
  {
    tier: 5,
    xpRequired: 2000,
    freeReward: { type: 'credits', mcAmount: 200, label: '200 MC', icon: '💰' },
    premiumReward: { type: 'credits', mcAmount: 1000, titleName: 'Fleet Commander', label: '1,000 MC + Title', icon: '🎖️' },
  },
  {
    tier: 6,
    xpRequired: 2500,
    freeReward: { type: 'item', itemSlug: 'hydroponic-rations', quantity: 2, label: '2x Spirulina Rations', icon: '🥗' },
    premiumReward: { type: 'item', itemSlug: 'solar-concentrator', quantity: 1, label: '1x Fresnel Solar Concentrator', icon: '☀️' },
  },
  {
    tier: 7,
    xpRequired: 3000,
    freeReward: { type: 'credits', mcAmount: 250, label: '250 MC', icon: '💰' },
    premiumReward: { type: 'credits', mcAmount: 1250, label: '1,250 MC Payout', icon: '🪙' },
  },
  {
    tier: 8,
    xpRequired: 3500,
    freeReward: { type: 'item', itemSlug: 'oxygen-canister', quantity: 2, label: '2x Liquid O₂ Canisters', icon: '🫁' },
    premiumReward: { type: 'item', itemSlug: 'emergency-scrubber', quantity: 1, label: '1x LiOH Quick-Scrubber', icon: '🧪' },
  },
  {
    tier: 9,
    xpRequired: 4000,
    freeReward: { type: 'credits', mcAmount: 300, label: '300 MC', icon: '💰' },
    premiumReward: { type: 'credits', mcAmount: 1500, titleName: 'Star Marshal', label: '1,500 MC + Title', icon: '🚀' },
  },
  {
    tier: 10,
    xpRequired: 4500,
    freeReward: { type: 'item', itemSlug: 'rad-shielding', quantity: 1, label: '1x Shield Pack + 300 MC', icon: '👑' },
    premiumReward: { type: 'item', itemSlug: 'telemetry-decoy', quantity: 2, mcAmount: 2000, label: '2,000 MC + 2x Decoys + Apex Badge', icon: '⭐⭐⭐⭐⭐' },
  },
];

const bpListeners = new Set<(state: BattlePassState) => void>();

/** Calculate current Battle Pass tier (1–10) from XP */
export function getTierFromXP(xp: number): number {
  return Math.min(MAX_TIER, Math.floor(Math.max(0, xp) / XP_PER_TIER) + 1);
}

/** Get XP progress inside the current tier (0–500) */
export function getTierProgressXP(xp: number): { current: number; max: number; percent: number } {
  const tier = getTierFromXP(xp);
  if (tier >= MAX_TIER && xp >= (MAX_TIER - 1) * XP_PER_TIER) {
    return { current: XP_PER_TIER, max: XP_PER_TIER, percent: 100 };
  }
  const current = xp % XP_PER_TIER;
  return {
    current,
    max: XP_PER_TIER,
    percent: Math.min(100, Math.round((current / XP_PER_TIER) * 100)),
  };
}

/** Read battle pass state from localStorage */
export function getBattlePassState(): BattlePassState {
  if (typeof window === 'undefined') return DEFAULT_BATTLEPASS_STATE;

  try {
    const raw = localStorage.getItem(BATTLEPASS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BattlePassState;
      return {
        xp: Number.isFinite(parsed.xp) ? parsed.xp : 0,
        isFiveStarGeneral: Boolean(parsed.isFiveStarGeneral),
        claimedFreeTiers: Array.isArray(parsed.claimedFreeTiers) ? parsed.claimedFreeTiers : [],
        claimedPremiumTiers: Array.isArray(parsed.claimedPremiumTiers) ? parsed.claimedPremiumTiers : [],
        retriesRemaining: parsed.isFiveStarGeneral ? (parsed.retriesRemaining ?? 3) : 0,
        lastDailyVaultDate: parsed.lastDailyVaultDate,
      };
    }
  } catch {}

  return DEFAULT_BATTLEPASS_STATE;
}

/** Save battle pass state to localStorage and notify listeners */
export function saveBattlePassState(state: BattlePassState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(BATTLEPASS_STORAGE_KEY, JSON.stringify(state));
  } catch {}

  bpListeners.forEach((fn) => fn(state));
}

/** Award XP on mission completion and return updated state */
export function addBattlePassXP(amount: number): { state: BattlePassState; leveledUp: boolean; newTier: number } {
  const current = getBattlePassState();
  const oldTier = getTierFromXP(current.xp);
  const nextXP = current.xp + Math.max(0, amount);
  const newTier = getTierFromXP(nextXP);

  const nextState: BattlePassState = {
    ...current,
    xp: nextXP,
  };

  saveBattlePassState(nextState);

  return {
    state: nextState,
    leveledUp: newTier > oldTier,
    newTier,
  };
}

/** Unlock the permanent Five-Star General VIP entitlement */
export function unlockFiveStarGeneral(): BattlePassState {
  const current = getBattlePassState();
  const nextState: BattlePassState = {
    ...current,
    isFiveStarGeneral: true,
    retriesRemaining: 3,
  };
  saveBattlePassState(nextState);
  return nextState;
}

/** Reset Battle Pass state and pity counter, removing them from localStorage and notifying listeners */
export function resetBattlePassState(): BattlePassState {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(BATTLEPASS_STORAGE_KEY);
      localStorage.removeItem('jat_crate_pity_v1');
    } catch {}
  }
  bpListeners.forEach((fn) => fn(DEFAULT_BATTLEPASS_STATE));
  return DEFAULT_BATTLEPASS_STATE;
}

/** Reset 3 emergency retries when starting a fresh mission */
export function resetRetriesForMission(): number {
  const current = getBattlePassState();
  if (!current.isFiveStarGeneral) return 0;

  const nextState: BattlePassState = {
    ...current,
    retriesRemaining: 3,
  };
  saveBattlePassState(nextState);
  return 3;
}

/** Check if today's free daily Sovereign Vault is ready for Five-Star Generals */
export function isDailyVaultAvailable(): boolean {
  const current = getBattlePassState();
  if (!current.isFiveStarGeneral) return false;

  const todayStr = new Date().toISOString().slice(0, 10);
  return current.lastDailyVaultDate !== todayStr;
}

/** Mark today's free daily Sovereign Vault as claimed */
export function markDailyVaultClaimed(): void {
  const current = getBattlePassState();
  const todayStr = new Date().toISOString().slice(0, 10);
  saveBattlePassState({
    ...current,
    lastDailyVaultDate: todayStr,
  });
}

/** Claim a tier reward (Free or Five-Star General) and add items/credits to player */
export async function claimBattlePassTier(
  tierNumber: number,
  isPremium: boolean,
  playerId: string
): Promise<{ success: boolean; reward?: BattlePassReward; error?: string }> {
  const current = getBattlePassState();
  const activeTier = getTierFromXP(current.xp);

  if (tierNumber > activeTier) {
    return { success: false, error: `Tier ${tierNumber} is locked. Reach ${BATTLEPASS_TIERS[tierNumber - 1].xpRequired} XP to unlock.` };
  }

  if (isPremium && !current.isFiveStarGeneral) {
    return { success: false, error: 'Five-Star General Pass required to claim premium track rewards.' };
  }

  const claimedList = isPremium ? current.claimedPremiumTiers : current.claimedFreeTiers;
  if (claimedList.includes(tierNumber)) {
    return { success: false, error: `Tier ${tierNumber} ${isPremium ? 'Five-Star General' : 'Free'} reward has already been claimed.` };
  }

  const tierDef = BATTLEPASS_TIERS.find((t) => t.tier === tierNumber);
  if (!tierDef) return { success: false, error: 'Invalid tier' };

  const reward = isPremium ? tierDef.premiumReward : tierDef.freeReward;

  // Credit reward to player account
  try {
    if (reward.mcAmount && reward.mcAmount > 0) {
      await fetch('/api/market/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, credits: reward.mcAmount }),
      });
    }

    if (reward.itemSlug && reward.quantity) {
      await fetch('/api/market/store-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          itemSlug: reward.itemSlug,
          quantity: reward.quantity,
          isGrant: true,
        }),
      });
    }
  } catch (err) {
    console.error('Failed to grant Battle Pass tier reward to database:', err);
  }

  // Update claimed list
  const nextClaimed = [...claimedList, tierNumber];
  const nextState: BattlePassState = isPremium
    ? { ...current, claimedPremiumTiers: nextClaimed }
    : { ...current, claimedFreeTiers: nextClaimed };

  saveBattlePassState(nextState);

  return { success: true, reward };
}

/** Subscribe to battle pass state updates */
export function subscribeBattlePass(listener: (state: BattlePassState) => void): () => void {
  bpListeners.add(listener);
  return () => {
    bpListeners.delete(listener);
  };
}

/** React hook for live Battle Pass state */
export function useBattlePass() {
  const [bpState, setBpState] = useState<BattlePassState>(DEFAULT_BATTLEPASS_STATE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBpState(getBattlePassState());

    const unsub = subscribeBattlePass((updated) => {
      setBpState(updated);
    });

    // Cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === BATTLEPASS_STORAGE_KEY) {
        setBpState(getBattlePassState());
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const currentTier = getTierFromXP(bpState.xp);
  const progress = getTierProgressXP(bpState.xp);

  const claimTier = useCallback(
    async (tier: number, isPremium: boolean, playerId: string) => {
      const res = await claimBattlePassTier(tier, isPremium, playerId);
      if (res.success) {
        setBpState(getBattlePassState());
      }
      return res;
    },
    []
  );

  const activateGeneral = useCallback(() => {
    const updated = unlockFiveStarGeneral();
    setBpState(updated);
    return updated;
  }, []);

  return {
    state: bpState,
    isLoaded: mounted,
    currentTier,
    progress,
    tiers: BATTLEPASS_TIERS,
    claimTier,
    activateGeneral,
    resetBattlePass: resetBattlePassState,
    isFiveStarGeneral: bpState.isFiveStarGeneral,
    retriesRemaining: bpState.retriesRemaining,
    isDailyVaultReady: isDailyVaultAvailable(),
  };
}
