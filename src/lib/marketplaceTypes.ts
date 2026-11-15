// ─── Junior Astronaut Mission Trainer – Mars Marketplace Types ───
// Strict TypeScript definitions for peer-to-peer exchange, escrow, and scarcity order books.

export type ItemCategory = 'life_support' | 'power' | 'hull_shielding' | 'rare_tech';

export type ListingStatus = 'active' | 'sold_out' | 'cancelled' | 'expired';

export interface MarketplaceItemDef {
  slug: string;
  name: string;
  category: ItemCategory;
  icon: string;
  basePrice: number;
  description: string;
  effectSummary: string;
}

export interface PlayerWallet {
  playerId: string;
  creditsBalance: number;
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
  'oxygen-canister': {
    slug: 'oxygen-canister',
    name: 'Liquid O₂ Pressure Canister',
    category: 'life_support',
    icon: '🫁',
    basePrice: 45,
    description: 'High-density cryogenic oxygen flask. Critical for habitat atmosphere balancing.',
    effectSummary: '+20% Oxygen Reserve',
  },
  'fuel-cell': {
    slug: 'fuel-cell',
    name: 'Sub-Zero Methane Fuel Cell',
    category: 'power',
    icon: '⚡',
    basePrice: 50,
    description: 'Compact fuel cell for solar array backup and night-cycle heating.',
    effectSummary: '+25% Power Reserve',
  },
  'hydroponic-rations': {
    slug: 'hydroponic-rations',
    name: 'Hydroponic Spirulina Rations',
    category: 'life_support',
    icon: '🥗',
    basePrice: 30,
    description: 'Nutrient-rich algae nutrient block that stabilizes crew psychological stress.',
    effectSummary: '+15% Morale Boost',
  },
  'hull-plating': {
    slug: 'hull-plating',
    name: 'Titanium-AeroGel Hull Plating',
    category: 'hull_shielding',
    icon: '🛡️',
    basePrice: 65,
    description: 'Impact-absorbing composite armor against micrometeorite collisions.',
    effectSummary: '+25% Hull Integrity',
  },
  'rad-shielding': {
    slug: 'rad-shielding',
    name: 'Borated Polyethylene Shield Pack',
    category: 'hull_shielding',
    icon: '🧲',
    basePrice: 80,
    description: 'Heavy hydrogenous polymer lining engineered to stop solar flare protons.',
    effectSummary: '+30% Radiation Deflection',
  },
  'solar-concentrator': {
    slug: 'solar-concentrator',
    name: 'Fresnel Solar Concentrator',
    category: 'rare_tech',
    icon: '☀️',
    basePrice: 150,
    description: 'Precision optical lens module that doubles photovoltaic yield during dust storms.',
    effectSummary: 'Passive: +10% Solar Efficiency',
  },
  'emergency-scrubber': {
    slug: 'emergency-scrubber',
    name: 'Lithium Hydroxide Quick-Scrubber',
    category: 'rare_tech',
    icon: '🧪',
    basePrice: 140,
    description: 'Instant chemical CO₂ absorption kit for sudden life support failures.',
    effectSummary: 'Emergency: Zero O₂ depletion for 3 Sols',
  },
  'telemetry-decoy': {
    slug: 'telemetry-decoy',
    name: 'Radio-Frequency Telemetry Decoy',
    category: 'rare_tech',
    icon: '📡',
    basePrice: 120,
    description: 'Broadband transponder spoofing rival sensor arrays in squad race heats.',
    effectSummary: 'Tactical: Jam rival telemetry pings',
  },
};
