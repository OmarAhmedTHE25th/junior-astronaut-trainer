'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { PlayerInventoryItem } from '@/lib/marketplaceTypes';
import { getOrCreateCadetProfile, getPersistentPlayerId } from '@/lib/profile';
import { getBattlePassState, unlockFiveStarGeneral } from '@/lib/battlePass';

export interface WalletCacheData {
  creditsBalance: number;
  isFiveStarGeneral: boolean;
  updatedAt?: number;
}

export interface WalletContextType {
  creditsBalance: number;
  isFiveStarGeneral: boolean;
  isLoading: boolean;
  inventory: PlayerInventoryItem[];
  cadetId: string;
  adjustBalanceOptimistic: (delta: number) => void;
  syncWallet: (serverBalance: number, isVip?: boolean) => void;
  refreshWallet: () => Promise<void>;
  setVipStatus: (isVip: boolean) => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function getWalletCacheKey(cadetId: string): string {
  return `jat_wallet_cache_${cadetId}`;
}

export function readSynchronousWallet(targetCadetId?: string): WalletCacheData {
  if (typeof window === 'undefined') {
    return { creditsBalance: 500, isFiveStarGeneral: false };
  }
  const id = targetCadetId && targetCadetId !== 'cadet-nova-01' ? targetCadetId : getPersistentPlayerId();
  try {
    const raw = localStorage.getItem(getWalletCacheKey(id));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.creditsBalance === 'number') {
        return {
          creditsBalance: parsed.creditsBalance,
          isFiveStarGeneral: Boolean(parsed.isFiveStarGeneral),
          updatedAt: parsed.updatedAt,
        };
      }
    }
  } catch {}

  // Fallback scan across any existing jat_wallet_cache_* keys in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jat_wallet_cache_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.creditsBalance === 'number' && parsed.creditsBalance !== 500) {
            return {
              creditsBalance: parsed.creditsBalance,
              isFiveStarGeneral: Boolean(parsed.isFiveStarGeneral),
              updatedAt: parsed.updatedAt,
            };
          }
        }
      }
    }
  } catch {}

  // Fallback to battle pass for VIP status and 500 default credits
  try {
    const bp = getBattlePassState();
    return {
      creditsBalance: 500,
      isFiveStarGeneral: Boolean(bp.isFiveStarGeneral),
    };
  } catch {
    return { creditsBalance: 500, isFiveStarGeneral: false };
  }
}

export function writeSynchronousWallet(cadetId: string, data: WalletCacheData): void {
  if (typeof window === 'undefined') return;
  const id = cadetId && cadetId !== 'cadet-nova-01' ? cadetId : getPersistentPlayerId();
  if (!id) return;
  try {
    localStorage.setItem(getWalletCacheKey(id), JSON.stringify({
      creditsBalance: data.creditsBalance,
      isFiveStarGeneral: data.isFiveStarGeneral,
      updatedAt: Date.now(),
    }));
  } catch {}
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Read active cadet profile / persistent player ID synchronously
  const [cadetId, setCadetId] = useState<string>(() => {
    if (typeof window === 'undefined') return 'cadet-nova-01';
    try {
      return getPersistentPlayerId();
    } catch {
      return 'cadet-nova-01';
    }
  });

  // Synchronous 0ms hydration from localStorage
  const initialCache = useRef<WalletCacheData>(readSynchronousWallet(cadetId));
  const [creditsBalance, setCreditsBalance] = useState<number>(initialCache.current.creditsBalance);
  const [isFiveStarGeneral, setIsFiveStarGeneral] = useState<boolean>(initialCache.current.isFiveStarGeneral);
  const [inventory, setInventory] = useState<PlayerInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inFlightRef = useRef<boolean>(false);

  // Background silent revalidation against /api/market/wallet
  const revalidate = useCallback(async (targetId?: string) => {
    const idToFetch = targetId || cadetId || (typeof window !== 'undefined' ? getPersistentPlayerId() : undefined);
    if (!idToFetch || idToFetch === 'cadet-nova-01' || inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch(`/api/market/wallet?playerId=${encodeURIComponent(idToFetch)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.wallet) {
        const serverBalance = Number(data.wallet.creditsBalance ?? data.creditsBalance ?? 500);
        const serverVip = Boolean(data.wallet.isFiveStarGeneral ?? data.isFiveStarGeneral);

        setCreditsBalance((prev) => {
          if (prev !== serverBalance) {
            writeSynchronousWallet(idToFetch, { creditsBalance: serverBalance, isFiveStarGeneral: serverVip || isFiveStarGeneral });
            return serverBalance;
          }
          return prev;
        });

        if (serverVip && !isFiveStarGeneral) {
          setIsFiveStarGeneral(true);
          try {
            unlockFiveStarGeneral();
          } catch {}
          writeSynchronousWallet(idToFetch, { creditsBalance: serverBalance, isFiveStarGeneral: true });
        }

        if (Array.isArray(data.inventory)) {
          setInventory(data.inventory);
        }
      }
    } catch {
      // Offline resilience
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [cadetId, isFiveStarGeneral]);

  // Sync wallet directly from server response (0ms mutation, zero extra round-trips)
  const syncWallet = useCallback((serverBalance: number, isVip?: boolean) => {
    const finalBalance = Math.max(0, Math.round(serverBalance));
    setCreditsBalance(finalBalance);

    let nextVip = isFiveStarGeneral;
    const currentId = cadetId && cadetId !== 'cadet-nova-01' ? cadetId : getPersistentPlayerId();
    if (typeof isVip === 'boolean') {
      nextVip = isVip;
      setIsFiveStarGeneral(isVip);
      if (isVip) {
        try {
          unlockFiveStarGeneral();
        } catch {}
      }
      // Persist to Neon Postgres in background
      if (currentId && currentId !== 'cadet-nova-01') {
        fetch('/api/market/wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: currentId, isFiveStarGeneral: isVip }),
        }).catch(() => {});
      }
    }

    writeSynchronousWallet(currentId, { creditsBalance: finalBalance, isFiveStarGeneral: nextVip });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('jat-wallet-updated'));
    }
  }, [cadetId, isFiveStarGeneral]);

  // Optimistic instant delta adjustment (for quick actions)
  const adjustBalanceOptimistic = useCallback((delta: number) => {
    const currentId = cadetId && cadetId !== 'cadet-nova-01' ? cadetId : getPersistentPlayerId();
    setCreditsBalance((prev) => {
      const next = Math.max(0, prev + delta);
      writeSynchronousWallet(currentId, { creditsBalance: next, isFiveStarGeneral });
      return next;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('jat-wallet-updated'));
    }
  }, [cadetId, isFiveStarGeneral]);

  // Set VIP Five-Star General Status
  const setVipStatus = useCallback((isVip: boolean) => {
    setIsFiveStarGeneral(isVip);
    if (isVip) {
      try {
        unlockFiveStarGeneral();
      } catch {}
    }
    const currentId = cadetId && cadetId !== 'cadet-nova-01' ? cadetId : getPersistentPlayerId();
    writeSynchronousWallet(currentId, { creditsBalance, isFiveStarGeneral: isVip });
    // Persist to Neon Postgres in background
    if (currentId && currentId !== 'cadet-nova-01') {
      fetch('/api/market/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: currentId, isFiveStarGeneral: isVip }),
      }).catch(() => {});
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('jat-wallet-updated'));
      window.dispatchEvent(new Event('jat-planet-unlocked'));
    }
  }, [cadetId, creditsBalance]);

  // Revalidate on mount & listen to profile changes / focus / custom events
  useEffect(() => {
    // 1. Initial silent background revalidation
    revalidate(cadetId);

    // 2. Listen for profile switches
    const handleProfileChange = () => {
      const active = getOrCreateCadetProfile();
      if (active.cadetId && active.cadetId !== cadetId) {
        setCadetId(active.cadetId);
        const cached = readSynchronousWallet(active.cadetId);
        setCreditsBalance(cached.creditsBalance);
        setIsFiveStarGeneral(cached.isFiveStarGeneral);
        revalidate(active.cadetId);
      }
    };

    // 3. Listen for external wallet update events (e.g. from other tabs or components)
    const handleExternalWalletUpdate = () => {
      const cached = readSynchronousWallet(cadetId);
      setCreditsBalance(cached.creditsBalance);
      setIsFiveStarGeneral(cached.isFiveStarGeneral);
    };

    const handleFocus = () => {
      revalidate(cadetId);
    };

    window.addEventListener('jat-profile-updated', handleProfileChange);
    window.addEventListener('jat-wallet-updated', handleExternalWalletUpdate);
    window.addEventListener('storage', handleExternalWalletUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('jat-profile-updated', handleProfileChange);
      window.removeEventListener('jat-wallet-updated', handleExternalWalletUpdate);
      window.removeEventListener('storage', handleExternalWalletUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [cadetId, revalidate]);

  return (
    <WalletContext.Provider
      value={{
        creditsBalance,
        isFiveStarGeneral,
        isLoading,
        inventory,
        cadetId,
        adjustBalanceOptimistic,
        syncWallet,
        refreshWallet: () => revalidate(),
        setVipStatus,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    // Fallback if rendered outside WalletProvider (e.g. isolated test or server)
    const fallbackProfile = typeof window !== 'undefined' ? getOrCreateCadetProfile() : null;
    const fallbackId = fallbackProfile?.cadetId || 'cadet-nova-01';
    const fallbackCache = readSynchronousWallet(fallbackId);
    return {
      creditsBalance: fallbackCache.creditsBalance,
      isFiveStarGeneral: fallbackCache.isFiveStarGeneral,
      isLoading: false,
      inventory: [],
      cadetId: fallbackId,
      adjustBalanceOptimistic: () => {},
      syncWallet: () => {},
      refreshWallet: async () => {},
      setVipStatus: () => {},
    };
  }
  return ctx;
}
