'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';
import { useProfile, DEFAULT_PROFILE } from '@/lib/profile';
import {
  CATALOG_ITEMS,
  type ItemCategory,
  type MarketplaceItemDef,
  type PlayerInventoryItem,
  type PlayerWallet,
} from '@/lib/marketplaceTypes';

interface MarsMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_TABS: { id: ItemCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Supplies', icon: '🪐' },
  { id: 'life_support', label: 'Life Support', icon: '🫁' },
  { id: 'power', label: 'Power & Fuel', icon: '⚡' },
  { id: 'hull_shielding', label: 'Hull & Shielding', icon: '🛡️' },
  { id: 'rare_tech', label: 'Tech Modules', icon: '🧪' },
];

export default function MarsMarketplace({ isOpen, onClose }: MarsMarketplaceProps) {
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeCadet = mounted && isLoaded ? profile : DEFAULT_PROFILE;

  // View state: 2 clean tabs
  const [activeTab, setActiveTab] = useState<'store' | 'inventory'>('store');
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
    if (isOpen) {
      setIsLoading(true);
      fetchWalletAndInventory().finally(() => setIsLoading(false));
    }
  }, [isOpen, fetchWalletAndInventory]);

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
        // Reset local stepper
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📦 COLONY SUPPLY STORE & INVENTORY"
    >
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1 font-mono">
        {/* Status Toast Notification */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-slide-up ${
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
        <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-300/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                Martian Outpost Quartermaster
              </span>
            </div>
            <p className="text-xs text-starlight/75 max-w-md leading-relaxed">
              Stock emergency oxygen flasks, backup fuel cells, and specialized modules. Deployed supplies are accessible mid-mission from your Operations Deck.
            </p>
          </div>

          {/* Player Credits Wallet Pill */}
          <div className="bg-[#111827] border border-amber-400/50 px-4 py-2.5 rounded-xl flex items-center gap-3 shrink-0 shadow-sm">
            <div className="text-right">
              <span className="text-[9px] font-mono text-amber-300/80 block uppercase tracking-wider">
                Cadet Balance
              </span>
              <span className="font-heading font-black text-lg text-white">
                💰 {wallet ? wallet.creditsBalance.toLocaleString() : '500'}{' '}
                <span className="text-xs text-amber-300">MC</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── 2 NAVIGATION TABS ── */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('store');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-2 ${
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
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex items-center gap-2 ${
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
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 pl-8 rounded-xl bg-[#090d20] border border-white/15 text-white text-xs placeholder:text-white/40 focus:border-cyan-400 outline-none"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-white/40 select-none">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1 text-xs text-white/40 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── CATEGORY FILTER PILLS ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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

        {/* ── TAB 1: SUPPLY STORE ── */}
        {activeTab === 'store' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-starlight/60 flex flex-col items-center gap-2">
                <span className="text-2xl animate-spin">⏳</span>
                <span>Connecting to colony supply depot...</span>
              </div>
            ) : catalogList.length === 0 ? (
              <div className="p-8 text-center text-xs text-starlight/60 bg-[#111827] border border-slate-300/20 rounded-2xl">
                No items match your active filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {catalogList.map((item) => {
                  const qty = storeQuantities[item.slug] || 1;
                  const totalCost = qty * item.basePrice;
                  const canAfford = wallet ? wallet.creditsBalance >= totalCost : true;

                  return (
                    <div
                      key={item.slug}
                      className="p-4 rounded-2xl bg-[#111827] border border-slate-300/20 hover:border-cyan-400/50 shadow-xl flex flex-col justify-between gap-3.5 transition-all"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {item.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider">
                                {getCategoryLabel(item.category)}
                              </span>
                            </div>
                            <h4 className="font-heading font-extrabold text-sm text-white mt-1 leading-tight">
                              {item.name}
                            </h4>
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="text-right shrink-0">
                          <span className="font-heading font-extrabold text-base text-amber-300 block">
                            {item.basePrice} <span className="text-xs">MC</span>
                          </span>
                          <span className="text-[9px] text-white/50 uppercase">Base Unit Price</span>
                        </div>
                      </div>

                      {/* Stat-Boost Badge & Description */}
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                          <span>⚡</span>
                          <span>{item.effectSummary}</span>
                        </div>
                        <p className="text-xs text-starlight/75 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Bottom Controls: Stepper & Buy CTA */}
                      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                        {/* Stepper */}
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setStoreQuantities((prev) => ({
                                ...prev,
                                [item.slug]: Math.max(1, qty - 1),
                              }));
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-mono font-black text-xs text-white">
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
                            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center"
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
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 font-bold border border-slate-700 cursor-pointer"
                          >
                            5x
                          </button>
                        </div>

                        {/* Buy Button */}
                        <button
                          type="button"
                          onClick={() => handleStoreBuy(item)}
                          disabled={!canAfford || isProcessing}
                          className={`
                            w-full sm:w-auto flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-heading font-extrabold text-xs uppercase tracking-wider
                            transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5
                            ${
                              canAfford
                                ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-200 active:scale-95'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }
                          `}
                        >
                          <span>{canAfford ? 'Buy' : 'Insufficient'}</span>
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

        {/* ── TAB 2: MY INVENTORY ── */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-starlight/60 flex flex-col items-center gap-2">
                <span className="text-2xl animate-spin">⏳</span>
                <span>Retrieving outpost cargo manifest...</span>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-[#111827] border border-slate-300/20 rounded-2xl">
                <span className="text-3xl block">📦</span>
                <h4 className="font-heading font-extrabold text-sm text-white">
                  Cargo Hold Is Empty
                </h4>
                <p className="text-xs text-starlight/60 max-w-sm mx-auto leading-relaxed">
                  You do not currently hold any supplies in this category. Purchase emergency oxygen, fuel cells, or shielding in the Supply Store.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setActiveTab('store');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs uppercase border border-cyan-200 shadow-sm cursor-pointer"
                >
                  Go to Supply Store →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="p-4 rounded-2xl bg-[#111827] border border-slate-300/20 hover:border-slate-300/40 shadow-xl flex flex-col justify-between gap-3.5 transition-all"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {item.icon || itemDef?.icon || '📦'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 uppercase tracking-wider">
                                {getCategoryLabel(item.category)}
                              </span>
                            </div>
                            <h4 className="font-heading font-extrabold text-sm text-white mt-1 leading-tight">
                              {item.itemName}
                            </h4>
                          </div>
                        </div>

                        {/* Quantity In Stock Badge */}
                        <div className="text-right shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono font-black text-xs block">
                            x{item.quantity} In Stock
                          </span>
                        </div>
                      </div>

                      {/* Stat Summary & Tactical Mid-Mission Note */}
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                          <span>✓</span>
                          <span>{itemDef?.effectSummary || 'Survival Equipment'}</span>
                        </div>
                        <p className="text-xs text-starlight/75 leading-relaxed">
                          {itemDef?.description || 'Equippable survival asset. Deployable mid-mission during Sol action phases without ending your turn.'}
                        </p>
                      </div>

                      {/* Recycle for Credits Section */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-starlight/70">
                          <span>Recycle Value (60% Refund):</span>
                          <span className="font-mono font-bold text-amber-300">
                            +{totalRefund} MC ({refundPerUnit} MC/unit)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Recycle Stepper */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                setRecycleQuantities((prev) => ({
                                  ...prev,
                                  [item.itemSlug]: Math.max(1, recycleQty - 1),
                                }));
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-mono font-black text-xs text-white">
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
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center"
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
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 font-bold border border-slate-700 cursor-pointer"
                            >
                              Max
                            </button>
                          </div>

                          {/* Recycle Button */}
                          <button
                            type="button"
                            onClick={() => handleRecycle(item.itemSlug, item.quantity)}
                            disabled={isProcessing}
                            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 font-mono font-bold text-xs uppercase border border-amber-400/40 hover:border-amber-300 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
      </div>
    </Modal>
  );
}
