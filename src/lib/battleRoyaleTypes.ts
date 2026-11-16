// ─── Junior Astronaut Mission Trainer – Battle Royale & Pet Types ───
// Strict TypeScript types for Drop Zone: Olympus, Companion Pets, Boosts & ELO Ranks.

export type RankTier =
  | 'dust_walker'
  | 'crater_scout'
  | 'phobos_vanguard'
  | 'ares_tactician'
  | 'red_planet_sovereign'
  | 'olympus_conqueror';

export interface RankMeta {
  tier: RankTier;
  title: string;
  badge: string;
  crest: string;
  color: string;
  minRP: number;
  maxRP: number;
}

export const RANK_TIERS: Record<RankTier, RankMeta> = {
  dust_walker: {
    tier: 'dust_walker',
    title: 'Dust Walker',
    badge: '🥉',
    crest: '🪨',
    color: '#B45309',
    minRP: 0,
    maxRP: 499,
  },
  crater_scout: {
    tier: 'crater_scout',
    title: 'Crater Scout',
    badge: '🥈',
    crest: '🔍',
    color: '#94A3B8',
    minRP: 500,
    maxRP: 999,
  },
  phobos_vanguard: {
    tier: 'phobos_vanguard',
    title: 'Phobos Vanguard',
    badge: '🥇',
    crest: '⚔️',
    color: '#F59E0B',
    minRP: 1000,
    maxRP: 1499,
  },
  ares_tactician: {
    tier: 'ares_tactician',
    title: 'Ares Tactician',
    badge: '💠',
    crest: '🛡️',
    color: '#06B6D4',
    minRP: 1500,
    maxRP: 1999,
  },
  red_planet_sovereign: {
    tier: 'red_planet_sovereign',
    title: 'Red Planet Sovereign',
    badge: '💎',
    crest: '👑',
    color: '#A855F7',
    minRP: 2000,
    maxRP: 2499,
  },
  olympus_conqueror: {
    tier: 'olympus_conqueror',
    title: 'Olympus Conqueror',
    badge: '🔥',
    crest: '🏆',
    color: '#EF4444',
    minRP: 2500,
    maxRP: 99999,
  },
};

export type PetRarity = 'common' | 'rare' | 'epic' | 'mythic';

export type PetPerkType =
  | 'o2_scavenge'
  | 'storm_early_warning'
  | 'solar_efficiency'
  | 'water_recycle'
  | 'hull_autorepair';

export interface PetCatalogItem {
  slug: string;
  name: string;
  avatar: string;
  defaultRarity: PetRarity;
  perkType: PetPerkType;
  perkLabel: string;
  perkDescription: string;
  basePrice: number;
}

export const PET_CATALOG: Record<string, PetCatalogItem> = {
  'rover-cat': {
    slug: 'rover-cat',
    name: 'Rover-Cat Unit',
    avatar: '🐱',
    defaultRarity: 'rare',
    perkType: 'o2_scavenge',
    perkLabel: '+15% O₂ Scavenging',
    perkDescription: 'Cybernetic feline that detects sealed oxygen vents and micro-caches.',
    basePrice: 350,
  },
  'tardigrade-scout': {
    slug: 'tardigrade-scout',
    name: 'Tardigrade Scout',
    avatar: '🐛',
    defaultRarity: 'epic',
    perkType: 'storm_early_warning',
    perkLabel: 'Flare Pre-Warning & +20% Rad Resist',
    perkDescription: 'Bio-engineered extremophile sensing radiation spikes 30s before storm impacts.',
    basePrice: 600,
  },
  'solar-falcon': {
    slug: 'solar-falcon',
    name: 'Solar Falcon Drone',
    avatar: '🦅',
    defaultRarity: 'mythic',
    perkType: 'solar_efficiency',
    perkLabel: '+25% Solar Yield & Supply Radar',
    perkDescription: 'High-altitude autonomous glider beaming orbital supply drop telemetry.',
    basePrice: 1200,
  },
  'cryo-gecko': {
    slug: 'cryo-gecko',
    name: 'Cryo-Gecko',
    avatar: '🦎',
    defaultRarity: 'common',
    perkType: 'hull_autorepair',
    perkLabel: '+10% Hull Patching & Thermal Shield',
    perkDescription: 'Martian subterranean lizard secreting sealant foam on damaged airlocks.',
    basePrice: 200,
  },
};

export interface PlayerPet {
  id: string;
  ownerId: string;
  petSlug: string;
  nickname: string;
  rarity: PetRarity;
  level: number;
  xp: number;
  perkType: PetPerkType;
  perkValue: number;
  isListedOnMarket: boolean;
  avatar?: string;
  createdAt?: string;
}

export type BoostSlug =
  | 'cryo-o2-stim'
  | 'lead-lined-nanogel'
  | 'overclock-capacitor'
  | 'emp-jammer';

export interface BoostDef {
  slug: BoostSlug;
  name: string;
  icon: string;
  durationSols: number;
  description: string;
  tacticalEffect: string;
  price: number;
}

export const BOOST_CATALOG: Record<BoostSlug, BoostDef> = {
  'cryo-o2-stim': {
    slug: 'cryo-o2-stim',
    name: 'Cryo-O₂ Stimulant',
    icon: '🧪',
    durationSols: 3,
    description: 'Slows metabolic burn, reducing oxygen consumption by 50% for 3 Sols.',
    tacticalEffect: '-50% O₂ Consumption',
    price: 80,
  },
  'lead-lined-nanogel': {
    slug: 'lead-lined-nanogel',
    name: 'Lead-Lined Nanogel',
    icon: '🛡️',
    durationSols: 2,
    description: 'Injects heavy protective nanites, granting complete radiation immunity.',
    tacticalEffect: '100% Radiation Immunity',
    price: 120,
  },
  'overclock-capacitor': {
    slug: 'overclock-capacitor',
    name: 'Overclock Capacitor',
    icon: '⚡',
    durationSols: 2,
    description: 'Overclocks scavenge servos to yield double sector loot drops.',
    tacticalEffect: '2x Scavenge Yield (+10% Power Drain)',
    price: 90,
  },
  'emp-jammer': {
    slug: 'emp-jammer',
    name: 'EMP Sector Jammer',
    icon: '📡',
    durationSols: 2,
    description: 'Scrambles competitor radar and sensor beacons across adjacent sectors.',
    tacticalEffect: 'Jams Adjacent Enemy Radar',
    price: 110,
  },
};

export interface PlayerBoostInventory {
  id: string;
  playerId: string;
  boostSlug: BoostSlug;
  quantity: number;
}

export type BRMatchStatus = 'lobby' | 'dropping' | 'active' | 'completed';
export type BRPlayerStatus = 'alive' | 'eliminated';

export interface BRSector {
  x: number;
  y: number;
  name: string;
  elevation: string;
  lootTier: 'low' | 'medium' | 'high' | 'supply_drop';
  hasSupplyDrop: boolean;
  isStormZone: boolean;
  radiationLevel: number;
}

export interface BRMatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  username: string;
  avatar: string;
  sectorX: number;
  sectorY: number;
  power: number;
  oxygen: number;
  shielding: number;
  hull: number;
  placement: number | null;
  status: BRPlayerStatus;
  kills: number;
  isBot: boolean;
  activeBoosts: BoostSlug[];
  equippedPet: PlayerPet | null;
}

export interface BRMatch {
  id: string;
  status: BRMatchStatus;
  currentZoneRadius: number; // in grid sector units (e.g. 3.5 -> 2.5 -> 1.5 -> 0.8)
  stormCenterX: number;
  stormCenterY: number;
  shrinkStage: number; // 0, 1, 2, 3, 4 (Final Circle)
  nextShrinkAt: number; // timestamp
  aliveCount: number;
  totalPlayers: number;
  winnerPlayerId: string | null;
  winnerUsername: string | null;
  createdAt: string;
  sectors: BRSector[];
  players: BRMatchPlayer[];
  arenaTheme?: BRArenaTheme;
}

export type BRArenaTheme = 'mars' | 'venus' | 'saturn' | 'planet_x';

export interface BRArenaMeta {
  id: BRArenaTheme;
  name: string;
  subtitle: string;
  icon: string;
  stormName: string;
  stormHazard: string;
  bgGradient: string;
  borderColor: string;
  accentColor: string;
}

export const BR_ARENAS: Record<BRArenaTheme, BRArenaMeta> = {
  mars: {
    id: 'mars',
    name: 'Olympus Mons Outpost',
    subtitle: 'Mars Red Planet Caldera',
    icon: '🪐',
    stormName: 'Global Regolith Dust Storm',
    stormHazard: 'Atmospheric particulate abrasion',
    bgGradient: 'from-orange-950/40 via-slate-950 to-black',
    borderColor: 'border-orange-500/40',
    accentColor: 'text-orange-400',
  },
  venus: {
    id: 'venus',
    name: 'HAVOC Cloud Deck',
    subtitle: 'Venus Super-Rotation Zone',
    icon: '☁️',
    stormName: 'Sulfuric Acid Vortices',
    stormHazard: '464°C thermal wave & acid precipitation',
    bgGradient: 'from-amber-950/40 via-yellow-950/30 to-black',
    borderColor: 'border-amber-400/40',
    accentColor: 'text-amber-300',
  },
  saturn: {
    id: 'saturn',
    name: 'Cassini Ring Sector',
    subtitle: 'Saturn B-Ring Debris Field',
    icon: '💍',
    stormName: 'Ice B-Ring Shrapnel Front',
    stormHazard: 'High-velocity water-ice micro-impacts',
    bgGradient: 'from-yellow-950/40 via-slate-950 to-black',
    borderColor: 'border-yellow-500/40',
    accentColor: 'text-yellow-300',
  },
  planet_x: {
    id: 'planet_x',
    name: 'Oort Void Singularity',
    subtitle: 'Planet X Deep Gravitational Well',
    icon: '🌌',
    stormName: 'Quantum Entropic Collapse',
    stormHazard: 'Tidal distortion & telemetry corruption',
    bgGradient: 'from-purple-950/40 via-slate-950 to-black',
    borderColor: 'border-purple-500/40',
    accentColor: 'text-purple-300',
  },
};

export interface CommanderProfile {
  playerId: string;
  username: string;
  avatar: string;
  specialty?: string;
  rankTier: RankTier;
  rankPoints: number;
  rankMeta: RankMeta;
  matchesPlayed: number;
  wins: number;
  winRate: number;
  bestSols: number;
  equippedPet: PlayerPet | null;
  pets: PlayerPet[];
  boosts: PlayerBoostInventory[];
  marketplaceNetWorth: number;
  recentMatches: {
    matchId: string;
    placement: number;
    rpChange: number;
    kills: number;
    timestamp: string;
  }[];
}
