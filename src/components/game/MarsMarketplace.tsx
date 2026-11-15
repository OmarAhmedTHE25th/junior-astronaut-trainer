'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import {
  CATALOG_ITEMS,
  type ItemCategory,
  type MarketListing,
  type MarketScarcityTrend,
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
  { id: 'rare_tech', label: 'Rare Tech Modules', icon: '🧪' },
];

export default function MarsMarketplace({ isOpen, onClose }: MarsMarketplaceProps) {
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  // View state
  const [activeTab, setActiveTab] = useState<'exchange' | 'my_listings' | 'sell'>('exchange');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [trends, setTrends] = useState<MarketScarcityTrend[]>([]);
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [inventory, setInventory] = useState<PlayerInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Partial buy state: listingId -> quantityToBuy
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});

  // Quick sell form state
  const [sellItemSlug, setSellItemSlug] = useState<string>('oxygen-canister');
  const [sellQuantity, setSellQuantity] = useState<number>(5);
  const [sellUnitPrice, setSellUnitPrice] = useState<number>(50);

  // Fetch market listings and trends
  const fetchMarketData = useCallback(async () => {
    try {
      const url =
        selectedCategory === 'all'
          ? '/api/market/listings'
          : `/api/market/listings?category=${selectedCategory}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
        setTrends(data.trends || []);
      }
    } catch {}
  }, [selectedCategory]);

  // Fetch player wallet and inventory
  const fetchWalletAndInventory = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/wallet?playerId=${activeCadet.cadetId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        setInventory(data.inventory || []);
      }
    } catch {}
  }, [activeCadet.cadetId]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([fetchMarketData(), fetchWalletAndInventory()]).finally(() =>
        setIsLoading(false)
      );
    }
  }, [isOpen, fetchMarketData, fetchWalletAndInventory]);

  // Handle Buy
  const handleBuy = async (listing: MarketListing) => {
    const qty = buyQuantities[listing.id] || 1;
    const totalCost = qty * listing.unitPrice;

    if (wallet && wallet.creditsBalance < totalCost) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient Mars Credits! Need ${totalCost} MC, you have ${wallet.creditsBalance} MC.`,
      });
      playAlert();
      return;
    }

    playClick();
    try {
      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: activeCadet.cadetId,
          buyerName: activeCadet.callsign || 'Cadet Buyer',
          listingId: listing.id,
          quantityToBuy: qty,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Purchased ${qty}x ${listing.itemName} for ${totalCost} MC (5% trade tax applied).`,
        });
        fetchMarketData();
        fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Purchase failed' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error during transaction' });
    }
  };

  // Handle Cancel Listing
  const handleCancel = async (listingId: string) => {
    playClick();
    try {
      const res = await fetch('/api/market/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: activeCadet.cadetId,
          listingId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Listing cancelled. Reclaimed ${data.returnedQuantity}x items back to inventory.`,
        });
        fetchMarketData();
        fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to cancel listing' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error cancelling listing' });
    }
  };

  // Handle Create Listing
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    const selectedInvItem = inventory.find((i) => i.itemSlug === sellItemSlug);
    if (!selectedInvItem || selectedInvItem.quantity < sellQuantity) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient ${CATALOG_ITEMS[sellItemSlug]?.name || 'items'} in inventory!`,
      });
      playAlert();
      return;
    }

    try {
      const res = await fetch('/api/market/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerId: activeCadet.cadetId,
          sellerName: activeCadet.callsign || 'Cadet Trader',
          sellerAvatar: activeCadet.avatar || '👨‍🚀',
          itemSlug: sellItemSlug,
          quantity: sellQuantity,
          unitPrice: sellUnitPrice,
        }),
      });

      const data = await res.json();
      if (data.success) {
        playSuccess();
        setStatusMsg({
          type: 'success',
          text: `Listed ${sellQuantity}x ${data.listing.itemName} for ${sellUnitPrice} MC/unit. Items locked in escrow!`,
        });
        setActiveTab('my_listings');
        fetchMarketData();
        fetchWalletAndInventory();
      } else {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to create listing' });
        playAlert();
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error creating listing' });
    }
  };

  // Filter listings
  const filteredListings = listings.filter((l) => {
    if (activeTab === 'my_listings') {
      return l.sellerId === activeCadet.cadetId;
    }
    const matchesCategory =
      selectedCategory === 'all' || l.category === selectedCategory;
    const matchesSearch =
      l.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && l.sellerId !== activeCadet.cadetId;
  });

  const myListings = listings.filter((l) => l.sellerId === activeCadet.cadetId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🪐 MARS EXCHANGE & SUPPLY DEPOT"
    >
      <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Status Toast Notification */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between animate-slide-up ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                : 'bg-red-500/15 border-red-500/50 text-red-200'
            }`}
          >
            <span>{statusMsg.type === 'success' ? '✅' : '⚠️'} {statusMsg.text}</span>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-white/60 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── TOP TERMINAL TICKER & WALLET BAR ── */}
        <div className="p-4 rounded-2xl bg-[#090d20] border border-cyan-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          {/* Live NASA Scarcity Price Trend Ticker */}
          <div className="flex-1 overflow-hidden w-full">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                Live Colony Commodity Ticker &amp; Scarcity Indices
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
              {trends.map((trend) => (
                <div
                  key={trend.itemSlug}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${
                    trend.activeSurge
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 animate-pulse'
                      : 'bg-black/40 border-white/10 text-white/80'
                  }`}
                >
                  <span>{CATALOG_ITEMS[trend.itemSlug]?.icon || '📦'}</span>
                  <span>{trend.itemName.split(' ')[0]}</span>
                  <span className="font-bold text-white">{trend.currentSuggestedPrice} MC</span>
                  <span
                    className={
                      trend.priceDeltaPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    +{trend.priceDeltaPercent}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Player Credits Wallet Pill */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500/20 to-purple-600/20 border border-amber-400/50 px-4 py-2 rounded-xl flex-shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-mono text-amber-300 block uppercase">
                Cadet Credit Balance
              </span>
              <span className="font-heading font-extrabold text-lg text-white">
                💰 {wallet ? wallet.creditsBalance.toLocaleString() : '500'} <span className="text-xs text-amber-300">MC</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── NAVIGATION TABS ── */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs sm:text-sm font-mono flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('exchange');
              }}
              className={`pb-2 px-3 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'exchange'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              🛒 Open Exchange ({listings.filter((l) => l.sellerId !== activeCadet.cadetId).length})
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('my_listings');
              }}
              className={`pb-2 px-3 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'my_listings'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              📦 My Active Listings ({myListings.length})
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('sell');
              }}
              className={`pb-2 px-3 border-b-2 font-bold transition-all cursor-pointer ${
                activeTab === 'sell'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              ➕ Quick Sell Supply
            </button>
          </div>

          {activeTab === 'exchange' && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplies or seller..."
              className="bg-[#0B1026] text-white border border-white/15 rounded-lg px-2.5 py-1 text-xs font-mono outline-none focus:border-cyan-400 w-48"
            />
          )}
        </div>

        {/* ── TAB 1: PEER-TO-PEER EXCHANGE ── */}
        {activeTab === 'exchange' && (
          <div className="space-y-4">
            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playClick();
                    setSelectedCategory(cat.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer border ${
                    selectedCategory === cat.id
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 font-bold'
                      : 'bg-black/30 text-white/60 border-white/10 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Listings Grid */}
            {isLoading ? (
              <div className="text-center py-12 text-sm font-mono text-cyan-300 animate-pulse">
                🛰️ Querying Mars Trade Relay network...
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/10 space-y-2">
                <span className="text-4xl block">📦</span>
                <p className="text-white/60 text-sm">No active sell orders in this category.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('sell')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold cursor-pointer"
                >
                  Be the first to list an item →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredListings.map((listing) => {
                  const itemDef = CATALOG_ITEMS[listing.itemSlug];
                  const currentQty = buyQuantities[listing.id] || 1;
                  const totalCost = currentQty * listing.unitPrice;
                  const canAfford = wallet ? wallet.creditsBalance >= totalCost : true;

                  return (
                    <div
                      key={listing.id}
                      className="p-4 rounded-2xl bg-[#121633]/90 border border-white/15 hover:border-cyan-400/50 transition-all shadow-md flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl p-2 rounded-xl bg-black/40 border border-white/10">
                            {listing.icon || itemDef?.icon || '📦'}
                          </span>
                          <div>
                            <h4 className="font-heading font-extrabold text-sm sm:text-base text-white">
                              {listing.itemName}
                            </h4>
                            <p className="text-[11px] text-cyan-300 font-mono">
                              ⚡ {itemDef?.effectSummary || 'Mission Survival Supply'}
                            </p>
                            <span className="text-[10px] text-white/50 font-mono">
                              Seller: {listing.sellerAvatar} {listing.sellerName}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-heading font-extrabold text-base text-amber-300 block">
                            {listing.unitPrice} <span className="text-xs">MC</span>
                          </span>
                          <span className="text-[10px] font-mono text-white/50">per unit</span>
                        </div>
                      </div>

                      {/* Stock & Quantity Partial Buy Stepper */}
                      <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-white/60">Available:</span>
                          <span className="font-bold text-white">
                            {listing.quantityRemaining} units
                          </span>
                        </div>

                        {/* Partial Buy Quantity Slider / Stepper */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setBuyQuantities((prev) => ({
                                ...prev,
                                [listing.id]: Math.max(1, (prev[listing.id] || 1) - 1),
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-bold text-cyan-300 px-1">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setBuyQuantities((prev) => ({
                                ...prev,
                                [listing.id]: Math.min(
                                  listing.quantityRemaining,
                                  (prev[listing.id] || 1) + 1
                                ),
                              }))
                            }
                            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBuy(listing)}
                            disabled={!canAfford}
                            className={`
                              px-3.5 py-1.5 rounded-xl font-bold font-mono text-xs transition-all cursor-pointer whitespace-nowrap
                              ${
                                canAfford
                                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white shadow-md'
                                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                              }
                            `}
                          >
                            Buy {currentQty}x ({totalCost} MC)
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

        {/* ── TAB 2: MY ACTIVE LISTINGS ── */}
        {activeTab === 'my_listings' && (
          <div className="space-y-3">
            {myListings.length === 0 ? (
              <div className="text-center py-12 bg-black/20 rounded-2xl border border-white/10 space-y-2">
                <span className="text-4xl block">📭</span>
                <p className="text-white/60 text-sm">You have no active sell orders in escrow.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('sell')}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold cursor-pointer"
                >
                  Create a Listing →
                </button>
              </div>
            ) : (
              myListings.map((listing) => (
                <div
                  key={listing.id}
                  className="p-4 rounded-2xl bg-[#141936] border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-black/40">
                      {listing.icon || '📦'}
                    </span>
                    <div>
                      <h4 className="font-heading font-extrabold text-white text-sm">
                        {listing.itemName}
                      </h4>
                      <p className="text-white/60">
                        {listing.quantityRemaining} remaining of {listing.initialQuantity} listed @{' '}
                        <strong className="text-amber-300">{listing.unitPrice} MC</strong>
                      </p>
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        ● Status: {listing.status} (In Escrow)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCancel(listing.id)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/40 font-bold transition-all cursor-pointer"
                  >
                    Cancel &amp; Reclaim Items
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB 3: QUICK SELL FROM INVENTORY ── */}
        {activeTab === 'sell' && (
          <div className="space-y-6">
            {/* Player's Current Inventory Cards */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-starlight/70 mb-2">
                Select Item to List from Inventory (Escrow Locked)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {inventory.map((item) => {
                  const isSelected = item.itemSlug === sellItemSlug;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSellItemSlug(item.itemSlug);
                        setSellUnitPrice(CATALOG_ITEMS[item.itemSlug]?.basePrice || 50);
                        setSellQuantity(Math.min(item.quantity, 5));
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600/30 border-purple-400 ring-2 ring-purple-400/50'
                          : 'bg-black/30 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{item.icon || '📦'}</span>
                      <span className="font-bold text-white text-xs block truncate">
                        {item.itemName}
                      </span>
                      <span className="text-[11px] font-mono text-cyan-300">
                        In Stock: {item.quantity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listing Form */}
            <form
              onSubmit={handleCreateListing}
              className="p-5 rounded-2xl bg-[#0e1329] border border-purple-500/30 space-y-4 font-mono text-xs"
            >
              <h4 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider">
                Create Sell Order for {CATALOG_ITEMS[sellItemSlug]?.name || sellItemSlug}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 mb-1">Quantity to List</label>
                  <input
                    type="number"
                    min="1"
                    max={inventory.find((i) => i.itemSlug === sellItemSlug)?.quantity || 1}
                    value={sellQuantity}
                    onChange={(e) => setSellQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1026] border border-white/20 text-white font-mono focus:border-purple-400 outline-none"
                  />
                  <span className="text-[10px] text-white/40 mt-1 block">
                    Will be deducted into escrow immediately
                  </span>
                </div>

                <div>
                  <label className="block text-white/70 mb-1">Unit Price (Mars Credits)</label>
                  <input
                    type="number"
                    min="1"
                    value={sellUnitPrice}
                    onChange={(e) => setSellUnitPrice(Math.max(1, Number(e.target.value)))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1026] border border-white/20 text-white font-mono focus:border-purple-400 outline-none"
                  />
                  <span className="text-[10px] text-amber-300 mt-1 block">
                    Suggested: {CATALOG_ITEMS[sellItemSlug]?.basePrice || 50} MC
                  </span>
                </div>
              </div>

              {/* Payout Calculation Callout */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-white/70 block">Total Gross Order:</span>
                  <span className="font-bold text-white">
                    {sellQuantity * sellUnitPrice} MC
                  </span>
                </div>
                <div>
                  <span className="text-white/70 block">Colony Trade Tax (5%):</span>
                  <span className="text-red-300">
                    -{Math.floor(sellQuantity * sellUnitPrice * 0.05)} MC
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-300 font-bold block">Net Seller Payout:</span>
                  <span className="font-heading font-extrabold text-sm text-emerald-400">
                    {sellQuantity * sellUnitPrice - Math.floor(sellQuantity * sellUnitPrice * 0.05)} MC
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:opacity-95 text-white font-heading font-extrabold text-sm tracking-wider uppercase transition-all shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                🔒 Lock in Escrow &amp; Publish Listing
              </button>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}
