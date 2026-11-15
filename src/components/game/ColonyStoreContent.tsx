'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSound } from '@/lib/sound';
import { useProfile, DEFAULT_PROFILE } from '@/lib/profile';
import {
  CATALOG_ITEMS,
  CRATE_TIERS,
  STRIPE_BUNDLES,
  type CrateTierSlug,
  type CrateReward,
  type StoreStripeBundle,
  type ItemCategory,
  type MarketplaceItemDef,
  type PlayerInventoryItem,
  type PlayerWallet,
} from '@/lib/marketplaceTypes';
import {
  useBattlePass,
  claimBattlePassTier,
  unlockFiveStarGeneral,
  isDailyVaultAvailable,
  markDailyVaultClaimed,
  BATTLEPASS_TIERS,
} from '@/lib/battlePass';
import SponsorAdModal from './SponsorAdModal';

interface ColonyStoreContentProps {
  layoutMode?: 'page' | 'modal';
}

const CATEGORY_TABS: { id: ItemCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Supplies', icon: '🪐' },
  { id: 'life_support', label: 'Life Support', icon: '🫁' },
  { id: 'power', label: 'Power & Fuel', icon: '⚡' },
  { id: 'hull_shielding', label: 'Hull & Shielding', icon: '🛡️' },
  { id: 'rare_tech', label: 'Tech Modules', icon: '🧪' },
];

export default function ColonyStoreContent({ layoutMode = 'page' }: ColonyStoreContentProps) {
  const { playClick, playSuccess, playAlert, playAction, playVictory } = useSound();
  const { profile, isLoaded } = useProfile();
  const {
    state: bpState,
    currentTier,
    progress,
    activateGeneral,
    isFiveStarGeneral,
    isDailyVaultReady,
  } = useBattlePass();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCadet = mounted && isLoaded ? profile : DEFAULT_PROFILE;

  // View state: 4 tabs
  const [activeTab, setActiveTab] = useState<'store' | 'inventory' | 'battlepass' | 'crates'>('store');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [inventory, setInventory] = useState<PlayerInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Quantities for store purchasing and recycling
  const [storeQuantities, setStoreQuantities] = useState<Record<string, number>>({});
  const [recycleQuantities, setRecycleQuantities] = useState<Record<string, number>>({});

  // Crate Opening & Reveal Modal state
  const [pityCount, setPityCount] = useState<number>(0);
  const [isOpeningCrate, setIsOpeningCrate] = useState(false);
  const [crateModalOpen, setCrateModalOpen] = useState(false);
  const [crateModalReward, setCrateModalReward] = useState<CrateReward | null>(null);
  const [activeOpeningSlug, setActiveOpeningSlug] = useState<CrateTierSlug | null>(null);
  const [isSponsorAdOpen, setIsSponsorAdOpen] = useState(false);

  // Initialize pity count from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jat_crate_pity_v1');
      if (raw) setPityCount(parseInt(raw, 10) || 0);
    } catch {}
  }, []);

  // Fetch player wallet and inventory
  const fetchWalletAndInventory = useCallback(async () => {
    if (!activeCadet?.cadetId) return;
    try {
      const res = await fetch(`/api/market/wallet?playerId=${encodeURIComponent(activeCadet.cadetId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setInventory(data.inventory || []);
      }
    } catch {}
  }, [activeCadet?.cadetId]);

  useEffect(() => {
    setIsLoading(true);
    fetchWalletAndInventory().finally(() => setIsLoading(false));
  }, [fetchWalletAndInventory]);

  // URL Query Param Listener for Stripe Checkout Returns (?payment=success&bundleId=...&session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const bundleId = params.get('bundleId');
      const sessionId = params.get('session_id');

      // Verify session_id is present from Stripe before fulfillment
      if (sessionId && bundleId) {
        const bundle = STRIPE_BUNDLES.find((b) => b.id === bundleId);
        if (bundle) {
          const fulfillPurchase = async () => {
            if (bundle.id === 'bundle-fivestar-pass' || bundle.isBattlePass) {
              activateGeneral();
            }
            if (bundle.mcAmount > 0) {
              try {
                await fetch('/api/market/reward', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    playerId: activeCadet.cadetId,
                    credits: bundle.mcAmount,
                  }),
                });
              } catch (err) {
                console.error('Failed to credit Mars Credits upon return:', err);
              }
            }
            await fetchWalletAndInventory();
            playVictory();
            setStatusMsg({
              type: 'success',
              text: `🎉 Stripe Payment Successful! ${bundle.name} has been credited to your outpost account.`,
            });
          };

          fulfillPurchase();
        }
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [activateGeneral, fetchWalletAndInventory, playVictory, activeCadet.cadetId]);

  // Catalog items filtered by category and search
  const catalogList = useMemo(() => {
    return Object.values(CATALOG_ITEMS).filter((item: MarketplaceItemDef) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.effectSummary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Inventory items filtered by category and search
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (item.quantity <= 0) return false;
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  const totalInventoryCount = useMemo(() => {
    return inventory.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0);
  }, [inventory]);

  // Handle Direct Store Buy
  const handleStoreBuy = async (item: MarketplaceItemDef) => {
    const qty = storeQuantities[item.slug] || 1;
    const totalCost = qty * item.basePrice;
    const currentCredits = wallet ? wallet.creditsBalance : 0;

    if (currentCredits < totalCost) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient Mars Credits! Required: ${totalCost} MC, Available: ${currentCredits} MC.`,
      });
      playAlert();
      return;
    }

    playClick();
    setIsProcessing(true);
    try {
      const res = await fetch('/api/market/store-buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          itemSlug: item.slug,
          quantity: qty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Purchased ${qty}x ${item.name} for ${totalCost} MC. Added to your outpost inventory!`,
        });
        await fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Purchase failed' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network connection error during store purchase' });
      playAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Instant 60% Recycle for Credits
  const handleRecycle = async (itemSlug: string, maxQty: number) => {
    const qty = Math.min(maxQty, Math.max(1, recycleQuantities[itemSlug] || 1));
    const itemDef = CATALOG_ITEMS[itemSlug];
    const refundPerUnit = itemDef ? Math.max(1, Math.floor(itemDef.basePrice * 0.6)) : 20;
    const totalRefund = refundPerUnit * qty;

    playClick();
    setIsProcessing(true);
    try {
      const res = await fetch('/api/market/recycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          itemSlug,
          quantity: qty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Recycled ${qty}x ${itemDef?.name || itemSlug} for +${data.refundCredits || totalRefund} MC refund!`,
        });
        setRecycleQuantities((prev) => ({ ...prev, [itemSlug]: 1 }));
        await fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to recycle item' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error recycling item' });
      playAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Hosted Stripe Checkout Portal
  const handleStripeCheckout = async (bundle: StoreStripeBundle) => {
    if (isProcessing) return;
    playClick();
    setIsProcessing(true);

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: bundle.id,
          playerId: activeCadet.cadetId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.checkoutUrl) {
        const errorText = data.error || 'Failed to initiate Stripe Checkout session';
        setStatusMsg({ type: 'error', text: errorText });
        playAlert();
        return;
      }

      const checkoutUrl = data.checkoutUrl as string;
      if (checkoutUrl.startsWith('https://checkout.stripe.com')) {
        window.location.href = checkoutUrl;
        return;
      } else {
        setStatusMsg({
          type: 'error',
          text: `Unexpected Checkout URL from server: ${checkoutUrl}`,
        });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error connecting to Stripe payment gateway' });
      playAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Battle Pass Tier Claim
  const handleClaimBattlePass = async (tierNumber: number, isPremium: boolean) => {
    if (isProcessing) return;
    playClick();
    setIsProcessing(true);

    try {
      const res = await claimBattlePassTier(tierNumber, isPremium, activeCadet.cadetId);
      if (res.success && res.reward) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Claimed Tier ${tierNumber} ${isPremium ? 'VIP' : 'Free'} Reward: ${res.reward.label}!`,
        });
        await fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to claim reward' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Error claiming Battle Pass reward' });
      playAlert();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Opening an Orbital Supply Drop Crate
  const handleOpenCrate = async (crateSlug: CrateTierSlug) => {
    const crateDef = CRATE_TIERS[crateSlug];
    const isDailyFree = crateSlug === 'sovereign' && isFiveStarGeneral && isDailyVaultReady;
    const currentCredits = wallet ? wallet.creditsBalance : 0;

    if (!isDailyFree && currentCredits < crateDef.costCredits) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient Mars Credits to open ${crateDef.name}! Need ${crateDef.costCredits} MC, have ${currentCredits} MC.`,
      });
      playAlert();
      return;
    }

    playClick();
    setIsOpeningCrate(true);
    setActiveOpeningSlug(crateSlug);
    setCrateModalOpen(true);
    setCrateModalReward(null);

    try {
      playAction();
      const res = await fetch('/api/market/open-crate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          crateSlug,
          isDailyFree,
        }),
      });

      const data = await res.json();
      if (data.success && data.reward) {
        if (isDailyFree) {
          markDailyVaultClaimed();
        }
        setPityCount(data.pityCount ?? 0);

        // Dramatic capsule decompression pause (700ms)
        setTimeout(() => {
          setCrateModalReward(data.reward);
          setIsOpeningCrate(false);
          if (data.reward.rarity === 'legendary' || data.reward.isJackpot) {
            playVictory();
          } else {
            playSuccess();
          }
          fetchWalletAndInventory();
        }, 700);
      } else {
        setCrateModalOpen(false);
        setIsOpeningCrate(false);
        setStatusMsg({ type: 'error', text: data.error || 'Failed to open supply crate' });
        playAlert();
      }
    } catch {
      setCrateModalOpen(false);
      setIsOpeningCrate(false);
      setStatusMsg({ type: 'error', text: 'Network failure during capsule orbital drop' });
      playAlert();
    }
  };

  const getCategoryLabel = (category: ItemCategory) => {
    switch (category) {
      case 'life_support':
        return 'Life Support';
      case 'power':
        return 'Power & Fuel';
      case 'hull_shielding':
        return 'Hull & Shield';
      case 'rare_tech':
        return 'Tech Module';
      default:
        return 'Survival';
    }
  };

  const gridClass =
    layoutMode === 'page'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5'
      : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  const pityRemaining = 5 - (pityCount % 5);

  return (
    <div className="space-y-6 font-mono">
      {/* Status Toast Notification */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between animate-slide-up ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{statusMsg.type === 'success' ? '✅' : '⚠️'} {statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-white/60 hover:text-white ml-2 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── TOP WALLET & OUTPOST BRIEFING HEADER ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0F172A] border border-slate-300/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
              Martian Outpost Logistics &amp; Economy
            </span>
          </div>
          <p className="text-xs text-starlight/75 max-w-xl leading-relaxed">
            Purchase emergency survival supplies, unlock seasonal Battle Pass rewards, open orbital loot drops, or top up your Mars Credit reserves via Stripe sandbox.
          </p>
        </div>

        {/* Player Credits Wallet Pill */}
        <div className="bg-[#111827] border border-amber-400/50 px-4 py-2.5 rounded-xl flex items-center gap-3 shrink-0 shadow-sm">
          <div className="text-right">
            <span className="text-[9px] font-mono text-amber-300/80 block uppercase tracking-wider">
              Cadet Balance
            </span>
            <span className="font-heading font-black text-xl text-white whitespace-nowrap">
              💰 {wallet ? wallet.creditsBalance.toLocaleString() : '500'}{' '}
              <span className="text-xs text-amber-300">MC</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── STRIPE HOSTED CHECKOUT CREDIT TOP-UP & VIP BAR ── */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#0B1026] border border-cyan-500/30 shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-base">💳</span>
            <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider">
              MC TOP-UP &amp; VIP ENTITLEMENTS (STRIPE CHECKOUT)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsSponsorAdOpen(true);
              }}
              className="
                px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60
                text-amber-300 font-mono font-extrabold text-xs
                hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer
                flex items-center gap-1.5
              "
              title="Watch mandatory sponsor commercial for +150 Mars Credits"
            >
              <span>🍔</span>
              <span>Watch Sponsor Broadcast (+150 MC)</span>
            </button>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
              Official Hosted Portal
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {STRIPE_BUNDLES.map((bundle) => {
            const isVipPass = bundle.id === 'bundle-fivestar-pass';
            const isAlreadyVip = isVipPass && isFiveStarGeneral;

            return (
              <button
                key={bundle.id}
                type="button"
                disabled={isProcessing || isAlreadyVip}
                onClick={() => handleStripeCheckout(bundle)}
                className={`
                  p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5
                  ${
                    isAlreadyVip
                      ? 'bg-amber-950/40 border-amber-400/50 text-amber-300 opacity-80 cursor-default'
                      : isVipPass
                      ? 'bg-[#1e1b10] border-amber-400/70 hover:border-amber-300 hover:scale-[1.02] shadow-amber-500/10'
                      : 'bg-[#111827] border-slate-700 hover:border-cyan-400 hover:scale-[1.02]'
                  }
                  shadow-md active:scale-95
                `}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-lg">{bundle.icon}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isVipPass ? 'bg-amber-400/20 text-amber-300' : 'bg-cyan-400/10 text-cyan-300'
                  }`}>
                    {bundle.priceUsd}
                  </span>
                </div>
                <div>
                  <span className="font-heading font-black text-xs text-white block leading-tight truncate">
                    {bundle.name}
                  </span>
                  <span className="text-[10px] text-white/60 block truncate mt-0.5">
                    {isAlreadyVip ? '✓ Active VIP' : bundle.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4 NAVIGATION TABS & SEARCH ── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('store');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'store'
                ? 'bg-cyan-400/15 border border-cyan-400 text-cyan-300 font-bold shadow-md'
                : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>🛒</span>
            <span>Supply Store</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('inventory');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'inventory'
                ? 'bg-cyan-400/15 border border-cyan-400 text-cyan-300 font-bold shadow-md'
                : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>🎒</span>
            <span>My Inventory</span>
            <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] text-cyan-300 border border-cyan-400/30">
              {totalInventoryCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('battlepass');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'battlepass'
                ? 'bg-amber-400/15 border border-amber-400 text-amber-300 font-bold shadow-md'
                : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>🎖️</span>
            <span>Battle Pass</span>
            <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-[10px] text-amber-300 border border-amber-400/30">
              T{currentTier}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setActiveTab('crates');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'crates'
                ? 'bg-purple-400/15 border border-purple-400 text-purple-300 font-bold shadow-md'
                : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <span>🎰</span>
            <span>Orbital Drops</span>
            {isDailyVaultReady && isFiveStarGeneral && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-400/30 text-[9px] text-emerald-300 font-black animate-pulse">
                FREE
              </span>
            )}
          </button>
        </div>

        {/* Search Box (Active for store & inventory tabs) */}
        {(activeTab === 'store' || activeTab === 'inventory') && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search equipment or effects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-8 rounded-xl bg-[#090d20] border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-cyan-400 outline-none"
            />
            <span className="absolute left-2.5 top-2 text-xs text-white/40 select-none">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-xs text-white/40 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── CATEGORY FILTER PILLS (Only for Store & Inventory) ── */}
      {(activeTab === 'store' || activeTab === 'inventory') && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {CATEGORY_TABS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-400/15 border border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-800/90 border border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 1: SUPPLY STORE
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'store' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-16 text-center text-sm text-starlight/60 flex flex-col items-center gap-3">
              <span className="text-3xl animate-spin">⏳</span>
              <span>Connecting to colony supply depot...</span>
            </div>
          ) : catalogList.length === 0 ? (
            <div className="p-12 text-center text-xs text-starlight/60 bg-[#111827] border border-slate-300/20 rounded-2xl">
              No equipment matches your active search or category filters.
            </div>
          ) : (
            <div className={gridClass}>
              {catalogList.map((item) => {
                const qty = storeQuantities[item.slug] || 1;
                const totalCost = qty * item.basePrice;
                const canAfford = wallet ? wallet.creditsBalance >= totalCost : true;

                return (
                  <div
                    key={item.slug}
                    className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-300/20 hover:border-cyan-400/50 shadow-xl flex flex-col justify-between gap-4 transition-all overflow-hidden"
                  >
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider shrink-0">
                              {getCategoryLabel(item.category)}
                            </span>
                          </div>
                          <h4 className="font-heading font-extrabold text-sm text-white mt-1 leading-tight break-words">
                            {item.name}
                          </h4>
                        </div>
                      </div>

                      {/* Price Tag */}
                      <div className="text-right shrink-0">
                        <span className="font-heading font-extrabold text-base text-amber-300 block whitespace-nowrap">
                          {item.basePrice} <span className="text-xs">MC</span>
                        </span>
                        <span className="text-[9px] text-white/50 uppercase whitespace-nowrap block">
                          Base Unit Price
                        </span>
                      </div>
                    </div>

                    {/* Stat-Boost Badge & Description */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg max-w-full">
                        <span className="shrink-0">⚡</span>
                        <span className="truncate">{item.effectSummary}</span>
                      </div>
                      <p className="text-xs text-starlight/75 leading-relaxed break-words">
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Controls: Stepper & Buy CTA */}
                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setStoreQuantities((prev) => ({
                              ...prev,
                              [item.slug]: Math.max(1, qty - 1),
                            }));
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-black text-xs text-white shrink-0">
                          {qty}x
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setStoreQuantities((prev) => ({
                              ...prev,
                              [item.slug]: qty + 1,
                            }));
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setStoreQuantities((prev) => ({
                              ...prev,
                              [item.slug]: 5,
                            }));
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-bold border border-slate-700 cursor-pointer shrink-0"
                        >
                          5x
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStoreBuy(item)}
                        disabled={!canAfford || isProcessing}
                        className={`
                          px-4 py-2 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider
                          transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0
                          ${
                            canAfford
                              ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-200 active:scale-95'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }
                        `}
                      >
                        <span>{canAfford ? 'Buy' : 'Need'}</span>
                        <span>{qty}x</span>
                        <span>({totalCost} MC)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 2: MY INVENTORY
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-16 text-center text-sm text-starlight/60 flex flex-col items-center gap-3">
              <span className="text-3xl animate-spin">⏳</span>
              <span>Retrieving outpost cargo manifest...</span>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-12 text-center space-y-3.5 bg-[#111827] border border-slate-300/20 rounded-2xl max-w-xl mx-auto">
              <span className="text-4xl block">📦</span>
              <h4 className="font-heading font-extrabold text-base text-white">
                Cargo Hold Is Empty
              </h4>
              <p className="text-xs text-starlight/65 leading-relaxed">
                You do not currently hold any supplies in this category. Purchase emergency supplies in the Supply Store or claim Battle Pass tiers.
              </p>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setActiveTab('store');
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs uppercase border border-cyan-200 shadow-sm cursor-pointer transition-all"
              >
                Go to Supply Store →
              </button>
            </div>
          ) : (
            <div className={gridClass}>
              {filteredInventory.map((item) => {
                const itemDef = CATALOG_ITEMS[item.itemSlug];
                const refundPerUnit = itemDef ? Math.max(1, Math.floor(itemDef.basePrice * 0.6)) : 20;
                const recycleQty = Math.min(
                  item.quantity,
                  Math.max(1, recycleQuantities[item.itemSlug] || 1)
                );
                const totalRefund = recycleQty * refundPerUnit;

                return (
                  <div
                    key={item.id || item.itemSlug}
                    className="p-4 sm:p-5 rounded-2xl bg-[#111827] border border-slate-300/20 hover:border-slate-300/40 shadow-xl flex flex-col justify-between gap-4 transition-all overflow-hidden"
                  >
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                          {item.icon || itemDef?.icon || '📦'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider shrink-0">
                              {getCategoryLabel(item.category)}
                            </span>
                          </div>
                          <h4 className="font-heading font-extrabold text-sm text-white mt-1 leading-tight break-words">
                            {item.itemName}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-black text-xs block whitespace-nowrap">
                          x{item.quantity} In Stock
                        </span>
                      </div>
                    </div>

                    {/* Stat Summary */}
                    <div className="space-y-1.5 min-w-0">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg max-w-full">
                        <span className="shrink-0">✓</span>
                        <span className="truncate">{itemDef?.effectSummary || 'Survival Equipment'}</span>
                      </div>
                      <p className="text-xs text-starlight/75 leading-relaxed break-words">
                        {itemDef?.description || 'Equippable survival asset. Deployable mid-mission during Sol action phases without ending your turn.'}
                      </p>
                    </div>

                    {/* Recycle for Credits Section */}
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-starlight/70 flex-wrap gap-1">
                        <span className="text-white/60">Recycle Value (60% Refund):</span>
                        <span className="font-mono font-bold text-amber-300 whitespace-nowrap">
                          +{totalRefund} MC ({refundPerUnit} MC/unit)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setRecycleQuantities((prev) => ({
                                ...prev,
                                [item.itemSlug]: Math.max(1, recycleQty - 1),
                              }));
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-mono font-black text-xs text-white shrink-0">
                            {recycleQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setRecycleQuantities((prev) => ({
                                ...prev,
                                [item.itemSlug]: Math.min(item.quantity, recycleQty + 1),
                              }));
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center shrink-0"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setRecycleQuantities((prev) => ({
                                ...prev,
                                [item.itemSlug]: item.quantity,
                              }));
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-bold border border-slate-700 cursor-pointer shrink-0"
                          >
                            Max
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRecycle(item.itemSlug, recycleQty)}
                          disabled={isProcessing}
                          className="flex-1 min-w-[120px] py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-mono font-bold text-xs uppercase border border-amber-400/40 hover:border-amber-300 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <span>♻️ Recycle for {totalRefund} MC</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 3: BATTLE PASS (10-TIER CURATED REWARD TRACK)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'battlepass' && (
        <div className="space-y-6">
          {/* Five-Star General VIP Status Card */}
          {isFiveStarGeneral ? (
            <div className="p-5 rounded-2xl bg-[#1e1b10] border-2 border-amber-400/80 shadow-amber-500/10 shadow-xl">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-400/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  <span><strong>3 Retries</strong> per Mission</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎰</span>
                  <span><strong>1 Free Daily</strong> Sovereign Drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">💰</span>
                  <span><strong>+25% MC</strong> Mission Bonus</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <span><strong>10 Tiers</strong> VIP Rewards</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-[#111827] border border-amber-400/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span className="font-heading font-black text-amber-300 text-base uppercase tracking-wider">
                    Upgrade to Five-Star General
                  </span>
                </div>
                <p className="text-xs text-starlight/75 mt-1 max-w-xl">
                  Unlock 3 Emergency Life-Support Retries on every mission, 1 Free Sovereign Drop Pod every 24 hours, +25% Mars Credit payouts, and all 10 Premium Battle Pass reward tiers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const passBundle = STRIPE_BUNDLES.find((b) => b.id === 'bundle-fivestar-pass');
                  if (passBundle) handleStripeCheckout(passBundle);
                }}
                disabled={isProcessing}
                className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider border border-amber-200 shadow-md cursor-pointer transition-all shrink-0 active:scale-95"
              >
                Unlock VIP Pass ($4.99) →
              </button>
            </div>
          )}

          {/* Season Level & XP Progress Card */}
          <div className="p-5 rounded-2xl bg-[#0F172A] border border-slate-700 shadow-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎖️</span>
                <div>
                  <h3 className="font-heading font-black text-base text-white">
                    Galactic Pass: Season 1 Telemetry
                  </h3>
                  <span className="text-xs text-white/60">
                    Earn XP automatically by surviving Sols and completing Mars missions.
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-cyan-300 uppercase block">
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
                <span>Tier {currentTier} Progress</span>
                <span className="font-bold text-cyan-300">
                  {progress.current} / {progress.max} XP ({progress.percent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-black/60 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-white/40">
                Total Season XP: {bpState.xp.toLocaleString()} XP
              </div>
            </div>
          </div>

          {/* 10-Tier Track List */}
          <div className="space-y-3">
            <h3 className="font-heading font-black text-sm text-cyan-300 uppercase tracking-wider">
              10-Tier Reward Track
            </h3>

            <div className="space-y-2.5">
              {BATTLEPASS_TIERS.map((tierDef) => {
                const isUnlocked = tierDef.tier <= currentTier;
                const isFreeClaimed = bpState.claimedFreeTiers.includes(tierDef.tier);
                const isPremiumClaimed = bpState.claimedPremiumTiers.includes(tierDef.tier);

                return (
                  <div
                    key={tierDef.tier}
                    className={`
                      p-4 rounded-2xl border transition-all
                      ${
                        isUnlocked
                          ? 'bg-[#111827] border-slate-700 shadow-md'
                          : 'bg-[#090d1f] border-slate-800 opacity-75'
                      }
                    `}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Tier Number & Status */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-heading font-black text-sm border ${
                          isUnlocked
                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-300'
                            : 'bg-black/40 border-white/10 text-white/40'
                        }`}>
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

                      {/* Middle & Right: Free Track vs. Five-Star General Track */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 w-full">
                        {/* Free Track Reward */}
                        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0">{tierDef.freeReward.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                                Free Track
                              </span>
                              <span className="font-bold text-xs text-white truncate block">
                                {tierDef.freeReward.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isUnlocked || isFreeClaimed || isProcessing}
                            onClick={() => handleClaimBattlePass(tierDef.tier, false)}
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
                            {isFreeClaimed ? '✓ Claimed' : isUnlocked ? 'Claim' : 'Locked'}
                          </button>
                        </div>

                        {/* Five-Star General Track Reward */}
                        <div className="p-3 rounded-xl bg-[#1e1b10] border border-amber-400/40 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-2xl shrink-0">{tierDef.premiumReward.icon}</span>
                            <div className="min-w-0">
                              <span className="text-[9px] uppercase tracking-wider text-amber-400 block font-bold">
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
                              isProcessing
                            }
                            onClick={() => {
                              if (!isFiveStarGeneral) {
                                const passBundle = STRIPE_BUNDLES.find((b) => b.id === 'bundle-fivestar-pass');
                                if (passBundle) handleStripeCheckout(passBundle);
                              } else if (isUnlocked) {
                                handleClaimBattlePass(tierDef.tier, true);
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
                              ? 'Claim VIP'
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
      )}

      {/* ══════════════════════════════════════════════════════════════
          TAB 4: ORBITAL DROPS (LOOT CRATES & PITY COUNTER)
      ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'crates' && (
        <div className="space-y-6">
          {/* Pity Counter & Drop Odds Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0F172A] border border-purple-500/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎰</span>
                <span className="font-heading font-black text-purple-300 text-sm uppercase tracking-wider">
                  Deep Space Orbital Drop Protocol
                </span>
              </div>
              <p className="text-xs text-starlight/75 max-w-xl">
                Call down pressurized orbital resupply pods launched from Mars orbit. Standard crates include chances at rare stims and jackpot credits; Sovereign Vaults guarantee high-tier tech modules.
              </p>
            </div>

            {/* Pity Counter Pill */}
            <div className="px-4 py-2.5 rounded-xl bg-purple-950/60 border border-purple-400/60 text-right shrink-0">
              <span className="text-[9px] font-mono uppercase tracking-widest text-purple-300 block">
                🛡️ Pity Counter Protection
              </span>
              <span className="font-heading font-black text-sm text-white">
                Guaranteed Legendary in{' '}
                <span className="text-amber-300">{pityRemaining === 0 ? 5 : pityRemaining}</span> opens
              </span>
            </div>
          </div>

          {/* 3 Crate Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Object.values(CRATE_TIERS).map((crate) => {
              const isSovereign = crate.slug === 'sovereign';
              const isFreeDaily = isSovereign && isFiveStarGeneral && isDailyVaultReady;
              const canAfford = isFreeDaily || (wallet ? wallet.creditsBalance >= crate.costCredits : false);

              return (
                <div
                  key={crate.slug}
                  className={`
                    p-5 rounded-2xl border flex flex-col justify-between gap-5 transition-all shadow-xl
                    ${
                      isSovereign
                        ? 'bg-[#1e1b10] border-amber-400/70 hover:border-amber-300 shadow-amber-500/10'
                        : crate.slug === 'elite'
                        ? 'bg-[#111827] border-purple-500/50 hover:border-purple-400'
                        : 'bg-[#111827] border-slate-700 hover:border-cyan-400'
                    }
                  `}
                >
                  {/* Top Crate Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-4xl">{crate.icon}</span>
                      <div className="text-right">
                        {isFreeDaily ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-black text-xs uppercase animate-pulse">
                            1 FREE DAILY DROP
                          </span>
                        ) : (
                          <span className="font-heading font-black text-lg text-white">
                            {crate.costCredits} <span className="text-xs text-amber-300">MC</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-heading font-black text-base text-white">
                        {crate.name}
                      </h4>
                      <p className="text-xs text-starlight/75 mt-1 leading-relaxed">
                        {crate.description}
                      </p>
                    </div>

                    {/* Special Crate Perks */}
                    <div className="space-y-1 text-[11px] font-mono">
                      {crate.slug === 'elite' && (
                        <div className="text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-1 rounded-lg">
                          💰 +100 MC Instant Rebate on every open
                        </div>
                      )}
                      {crate.slug === 'sovereign' && (
                        <div className="text-amber-300 bg-amber-950/40 border border-amber-400/30 px-2 py-1 rounded-lg">
                          ⭐ 2x Loot Multiplier + 2,500 MC Jackpot chance
                        </div>
                      )}
                    </div>

                    {/* Odds Breakdown */}
                    <div className="pt-3 border-t border-white/10 space-y-1.5 text-xs font-mono">
                      <span className="text-[10px] uppercase text-white/50 tracking-wider block font-bold">
                        Drop Odds:
                      </span>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Common:</span>
                        <span className="font-bold text-white">{Math.round(crate.odds.common * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-purple-400">Rare:</span>
                        <span className="font-bold text-purple-300">{Math.round(crate.odds.rare * 100)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-400 font-bold">Legendary:</span>
                        <span className="font-bold text-amber-300">{Math.round(crate.odds.legendary * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Open Button */}
                  <button
                    type="button"
                    disabled={(!canAfford && !isFreeDaily) || isOpeningCrate}
                    onClick={() => handleOpenCrate(crate.slug)}
                    className={`
                      w-full py-2.5 rounded-xl font-heading font-black text-xs uppercase tracking-wider
                      transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95
                      ${
                        isFreeDaily
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 border border-emerald-200'
                          : canAfford
                          ? isSovereign
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-200'
                            : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-200'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }
                    `}
                  >
                    <span>{isFreeDaily ? 'Claim Free Daily Vault' : `Open Capsule (${crate.costCredits} MC)`}</span>
                    <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ANIMATED CAPSULE OPENING REVEAL MODAL
      ══════════════════════════════════════════════════════════════ */}
      {crateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-mono">
          <div className="relative z-10 w-full max-w-md bg-[#0F172A] rounded-3xl border border-slate-700 p-6 sm:p-8 text-center shadow-2xl animate-scale-up space-y-5">
            {isOpeningCrate ? (
              <div className="py-8 space-y-4">
                <div className="text-6xl animate-bounce">🚀</div>
                <div className="space-y-1">
                  <h3 className="font-heading font-black text-base text-cyan-300 uppercase tracking-wider animate-pulse">
                    Atmospheric Drop Inbound...
                  </h3>
                  <p className="text-xs text-white/60">
                    Decelerator thrusters firing. Decompressing cargo hatch.
                  </p>
                </div>
                <div className="w-32 h-1.5 mx-auto rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-cyan-400 animate-pulse w-full" />
                </div>
              </div>
            ) : crateModalReward ? (
              <div className="space-y-4 animate-fade-in">
                {/* Rarity Pill */}
                <div>
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border inline-block
                    ${
                      crateModalReward.rarity === 'legendary'
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-amber-500/20 shadow-md'
                        : crateModalReward.rarity === 'rare'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }
                  `}>
                    {crateModalReward.isPityGuaranteed ? '🛡️ PITY GUARANTEE: ' : ''}
                    {crateModalReward.rarity.toUpperCase()} REWARD
                  </span>
                </div>

                {/* Reward Graphic */}
                <div className="w-24 h-24 mx-auto rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center text-5xl shadow-inner">
                  {crateModalReward.icon}
                </div>

                {/* Reward Title & Details */}
                <div className="space-y-1">
                  <h3 className="font-heading font-black text-lg text-white">
                    {crateModalReward.quantity}x {crateModalReward.name}
                  </h3>
                  <p className="text-xs text-starlight/75 max-w-sm mx-auto leading-relaxed">
                    {crateModalReward.description}
                  </p>
                </div>

                {/* Jackpot & Rebate Callouts */}
                {crateModalReward.isJackpot && (
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-300 font-black text-xs animate-pulse">
                    🎉 MARS CREDITS JACKPOT! +{crateModalReward.jackpotCredits} MC Credited to Wallet!
                  </div>
                )}

                {crateModalReward.rebateCredits && crateModalReward.rebateCredits > 0 && (
                  <div className="text-xs text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-500/30 p-2 rounded-lg">
                    💰 +{crateModalReward.rebateCredits} MC Elite Pod Rebate Deposited
                  </div>
                )}

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setCrateModalOpen(false);
                    setCrateModalReward(null);
                  }}
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-black text-xs uppercase tracking-wider border border-cyan-200 shadow-md cursor-pointer transition-all active:scale-95 mt-4"
                >
                  Deploy to Outpost Inventory →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sponsor Ad Modal */}
      <SponsorAdModal
        isOpen={isSponsorAdOpen}
        onClose={() => setIsSponsorAdOpen(false)}
        rewardMode="credits"
        cadetId={activeCadet?.cadetId}
        onRewardClaimed={(credits) => {
          setStatusMsg({
            type: 'success',
            text: `🍔 Sponsor Broadcast Completed! +${credits || 150} Mars Credits credited to your wallet.`,
          });
          fetchWalletAndInventory();
        }}
      />
    </div>
  );
}
