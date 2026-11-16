// ─── Junior Astronaut Mission Trainer – Mars Marketplace Types ───
// Strict TypeScript definitions for peer-to-peer exchange, escrow, and scarcity order books.

export type ItemCategory = 'life_support' | 'power' | 'hull_shielding' | 'rare_tech';

export type ItemScope = 'all_worlds' | 'mars_survival';

export type ListingStatus = 'active' | 'sold_out' | 'cancelled' | 'expired';

export interface MarketplaceItemDef {
  slug: string;
  name: string;
  category: ItemCategory;
  icon: string;
  basePrice: number;
  description: string;
  effectSummary: string;
  scope?: ItemScope;
  arcadeEffect?: string;
  marsEffect?: string;
}

export interface PlayerWallet {
  playerId: string;
  creditsBalance: number;
  isFiveStarGeneral?: boolean;
  updatedAt: string;
}

export interface PlayerInventoryItem {
  id: string;
  playerId: string;
  itemSlug: string;
  itemName: string;
  category: ItemCategory;
  quantity: number;
  icon?: string;
  metadataJson?: Record<string, unknown>;
}

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  itemSlug: string;
  itemName: string;
  category: ItemCategory;
  quantityRemaining: number;
  initialQuantity: number;
  unitPrice: number;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string;
  icon?: string;
}

export interface MarketTransaction {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  itemSlug: string;
  quantityBought: number;
  totalPrice: number;
  marketTaxPaid: number;
  executedAt: string;
}

export interface MarketScarcityTrend {
  category: ItemCategory;
  itemSlug: string;
  itemName: string;
  basePrice: number;
  currentSuggestedPrice: number;
  priceDeltaPercent: number;
  surgeLabel?: string;
  activeSurge: boolean;
}

export const CATALOG_ITEMS: Record<string, MarketplaceItemDef> = {
  // ── Universal Arcade & Tactical Power-Ups [ALL WORLDS] ───────
  'kinetic-overcharger': {
    slug: 'kinetic-overcharger',
    name: 'Kinetic Railgun Overcharger',
    category: 'rare_tech',
    icon: '💥',
    basePrice: 95,
    scope: 'all_worlds',
    description: 'Electromagnetic railgun capacitor boost. Doubles projectile blast radius and grants a +25% score multiplier across all planetary mini-games (+15 Power on Mars).',
    effectSummary: '+25% Score & Double Blast Radius / +15 Mars Power',
    arcadeEffect: 'Double Blast Radius & +25% Score Multiplier',
    marsEffect: '+15 Power Reserves',
  },
  'quantum-scanner': {
    slug: 'quantum-scanner',
    name: 'Quantum Deep-Scan Pulse',
    category: 'rare_tech',
    icon: '📡',
    basePrice: 90,
    scope: 'all_worlds',
    description: 'Sub-space radar resonance array. Grants +3 extra scan sweeps on Earth, highlights ring ice & jetstream hazards on Saturn and Neptune, and boosts Mars research by +15%.',
    effectSummary: '+3 Scans / Hazard Sensor / +15% Mars Research',
    arcadeEffect: '+3 Scans & Hazard Detection Warning',
    marsEffect: '+15% Research Discovery Score',
  },
  'aegis-hull-matrix': {
    slug: 'aegis-hull-matrix',
    name: 'Aegis Hull Reinforcement',
    category: 'hull_shielding',
    icon: '🛡️',
    basePrice: 85,
    scope: 'all_worlds',
    description: 'Nanite-hardened reactive alloy plating. Provides +35% starting hull/shield buffer across all arcade mini-games (+20 Shielding on Mars).',
    effectSummary: '+35% Mini-Game Hull / +20 Mars Shielding',
    arcadeEffect: '+35% Initial Hull & Shield Buffer',
    marsEffect: '+20 Shielding Integrity',
  },
  'chrono-stabilizer': {
    slug: 'chrono-stabilizer',
    name: 'Chrono-Stasis Capacitor',
    category: 'rare_tech',
    icon: '⏱️',
    basePrice: 110,
    scope: 'all_worlds',
    description: 'Relativistic temporal buffer field. Adds +10 seconds of extra clock time to Timed Mode countdowns and arcade survival timers (+10 Morale on Mars).',
    effectSummary: '+10s Clock Buffer / +10 Mars Morale',
    arcadeEffect: '+10s Countdown Clock Extension',
    marsEffect: '+10 Crew Morale',
  },

  // ── Colony Survival Consumables [MARS SURVIVAL] ───────────────
  'oxygen-canister': {
    slug: 'oxygen-canister',
    name: 'Liquid O₂ Pressure Canister',
    category: 'life_support',
    icon: '🫁',
    basePrice: 45,
    scope: 'mars_survival',
    description: 'High-density cryogenic oxygen flask. Critical for habitat atmosphere balancing.',
    effectSummary: '+20% Oxygen Reserve',
    marsEffect: '+20% Oxygen Reserve',
  },
  'fuel-cell': {
    slug: 'fuel-cell',
    name: 'Sub-Zero Methane Fuel Cell',
    category: 'power',
    icon: '⚡',
    basePrice: 50,
    scope: 'mars_survival',
    description: 'Compact fuel cell for solar array backup and night-cycle heating.',
    effectSummary: '+25% Power Reserve',
    marsEffect: '+25% Power Reserve',
  },
  'hydroponic-rations': {
    slug: 'hydroponic-rations',
    name: 'Hydroponic Spirulina Rations',
    category: 'life_support',
    icon: '🥗',
    basePrice: 30,
    scope: 'mars_survival',
    description: 'Nutrient-rich algae nutrient block that stabilizes crew psychological stress.',
    effectSummary: '+15% Morale Boost',
    marsEffect: '+15% Morale Boost',
  },
  'hull-plating': {
    slug: 'hull-plating',
    name: 'Titanium-AeroGel Hull Plating',
    category: 'hull_shielding',
    icon: '🛡️',
    basePrice: 65,
    scope: 'mars_survival',
    description: 'Impact-absorbing composite armor against micrometeorite collisions.',
    effectSummary: '+25% Hull Integrity',
    marsEffect: '+25% Hull Integrity',
  },
  'rad-shielding': {
    slug: 'rad-shielding',
    name: 'Borated Polyethylene Shield Pack',
    category: 'hull_shielding',
    icon: '🧲',
    basePrice: 80,
    scope: 'mars_survival',
    description: 'Heavy hydrogenous polymer lining engineered to stop solar flare protons.',
    effectSummary: '+30% Radiation Deflection',
    marsEffect: '+30% Radiation Deflection',
  },
  'solar-concentrator': {
    slug: 'solar-concentrator',
    name: 'Fresnel Solar Concentrator',
    category: 'rare_tech',
    icon: '☀️',
    basePrice: 150,
    scope: 'mars_survival',
    description: 'Precision optical lens module that doubles photovoltaic yield during dust storms.',
    effectSummary: 'Passive: +10% Solar Efficiency',
    marsEffect: 'Passive: +10% Solar Efficiency',
  },
  'emergency-scrubber': {
    slug: 'emergency-scrubber',
    name: 'Lithium Hydroxide Quick-Scrubber',
    category: 'rare_tech',
    icon: '🧪',
    basePrice: 140,
    scope: 'mars_survival',
    description: 'Instant chemical CO₂ absorption kit for sudden life support failures.',
    effectSummary: 'Emergency: Zero O₂ depletion for 3 Sols',
    marsEffect: 'Emergency: Zero O₂ depletion for 3 Sols',
  },
  'telemetry-decoy': {
    slug: 'telemetry-decoy',
    name: 'Radio-Frequency Telemetry Decoy',
    category: 'rare_tech',
    icon: '📡',
    basePrice: 120,
    scope: 'mars_survival',
    description: 'Broadband transponder spoofing rival sensor arrays in squad race heats.',
    effectSummary: 'Tactical: Jam rival telemetry pings',
    marsEffect: 'Tactical: Jam rival telemetry pings',
  },
};

// ─── Orbital Supply Drop Crates & Loot Pods ───────────────────

export type CrateTierSlug = 'standard' | 'elite' | 'sovereign';
export type RewardRarity = 'common' | 'rare' | 'legendary';

export interface CrateDef {
  slug: CrateTierSlug;
  name: string;
  costMC: number;
  costCredits: number;
  icon: string;
  badge: string;
  description: string;
  rebateMC?: number;
  freeDailyForVIP?: boolean;
  odds: {
    common: number;     // e.g. 0.65
    rare: number;       // e.g. 0.28
    legendary: number;  // e.g. 0.07
  };
  features: string[];
}

export const CRATE_TIERS: Record<CrateTierSlug, CrateDef> = {
  standard: {
    slug: 'standard',
    name: 'Standard Orbital Crate',
    costMC: 150,
    costCredits: 150,
    icon: '📦',
    badge: 'STANDARD',
    description: 'Automated atmospheric resupply capsule deployed via drogue chute.',
    odds: { common: 0.65, rare: 0.28, legendary: 0.07 },
    features: ['65% Common Consumables', '28% Rare Tech Modules', '7% Legendary / 500 GC Jackpot'],
  },
  elite: {
    slug: 'elite',
    name: 'Deep-Space Elite Pod',
    costMC: 400,
    costCredits: 400,
    icon: '🛸',
    badge: 'ELITE POD',
    description: 'Pressurized aerospace capsule with reinforced avionics and guaranteed 100 GC rebate.',
    rebateMC: 100,
    odds: { common: 0.30, rare: 0.50, legendary: 0.20 },
    features: ['Instant 100 GC Rebate', '50% Rare Tech Modules', '20% Legendary / 1,000 GC Jackpot'],
  },
  sovereign: {
    slug: 'sovereign',
    name: 'Five-Star General Sovereign Vault',
    costMC: 750,
    costCredits: 750,
    icon: '👑',
    badge: 'SOVEREIGN VAULT',
    description: 'Orbital titanium dreadnought vault containing apex colony hardware with double yield.',
    freeDailyForVIP: true,
    odds: { common: 0.00, rare: 0.55, legendary: 0.45 },
    features: ['1 Free Daily Open for VIPs', 'Zero Common Items', '45% Legendary / 2,500 GC Jackpot', '2x Quantity Yield'],
  },
};

export interface CrateReward {
  itemSlug?: string;
  itemName: string;
  name?: string;
  icon: string;
  quantity: number;
  rarity: RewardRarity;
  isJackpot?: boolean;
  jackpotCredits?: number;
  description?: string;
  rebateCredits?: number;
  isPityGuaranteed?: boolean;
}

// ─── Stripe Galaxy Coin Bundles ───────────────────────────────

export interface StoreStripeBundle {
  id: string;
  name: string;
  mcAmount: number;
  credits?: number;
  usdPriceCents: number;
  priceFormatted: string;
  priceUsd?: string;
  icon: string;
  badge?: string;
  description?: string;
  isBattlePass?: boolean;
}

export const STRIPE_BUNDLES: StoreStripeBundle[] = [
  {
    id: 'bundle-500',
    name: 'Cadet Supply Crate (500 GC)',
    mcAmount: 500,
    credits: 500,
    usdPriceCents: 99,
    priceFormatted: '$0.99',
    priceUsd: '$0.99',
    icon: '💰',
    badge: 'STARTER',
    description: '500 Galaxy Coins Top-Up',
  },
  {
    id: 'bundle-1500',
    name: 'Commander Stash (1,500 GC)',
    mcAmount: 1500,
    credits: 1500,
    usdPriceCents: 249,
    priceFormatted: '$2.49',
    priceUsd: '$2.49',
    icon: '🪙',
    badge: 'POPULAR (+25% BONUS)',
    description: '1,500 Galaxy Coins Top-Up',
  },
  {
    id: 'bundle-5000',
    name: 'Outpost Treasury (5,000 GC)',
    mcAmount: 5000,
    credits: 5000,
    usdPriceCents: 499,
    priceFormatted: '$4.99',
    priceUsd: '$4.99',
    icon: '💎',
    badge: 'BEST VALUE (2X VALUE)',
    description: '5,000 Galaxy Coins Top-Up',
  },
  {
    id: 'bundle-fivestar-pass',
    name: '★★★★★ Five-Star General VIP Pass',
    mcAmount: 0,
    credits: 0,
    usdPriceCents: 499,
    priceFormatted: '$4.99',
    priceUsd: '$4.99',
    icon: '⭐',
    badge: 'PERMANENT VIP ENTITLEMENT',
    description: '3 Retries + Free Daily Drop + VIP Perks',
    isBattlePass: true,
  },
];
