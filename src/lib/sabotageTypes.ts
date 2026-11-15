// ─── Junior Astronaut Mission Trainer – Sabotage & EW Types ───
// Definitions for PvP Electronic Warfare & Sabotage mechanics in
// Endless Tournaments and Mars Battle Royale.

export type SabotageSlug = 'emp-jam' | 'supply-intercept' | 'comms-spoof' | 'solar-blind';

export type SabotageContextType = 'tournament' | 'battle_royale';

export type SabotagePaymentType = 'power' | 'mc';

export interface SabotageDef {
  slug: SabotageSlug;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  powerCost: number;
  mcCost: number;
  cooldownSols: number;
  targetEffectDesc: string;
  attackerBenefitDesc?: string;
  battleRoyaleEffectDesc?: string;
}

export const SABOTAGE_CATALOG: Record<SabotageSlug, SabotageDef> = {
  'emp-jam': {
    slug: 'emp-jam',
    name: 'EMP Telemetry Jam',
    tagline: 'HUD Scramble & Deck Lock',
    description: 'Blasts rival outpost telemetry with microwave radiation, scrambling gauges and disabling tactical deck re-rolls.',
    icon: '⚡',
    powerCost: 15,
    mcCost: 75,
    cooldownSols: 3,
    targetEffectDesc: 'Scrambles HUD telemetry for 2 Sols and locks Command Override for 1 Sol.',
    battleRoyaleEffectDesc: 'Blinds rival radar and disrupts equipment sensors.',
  },
  'supply-intercept': {
    slug: 'supply-intercept',
    name: 'Orbital Supply Intercept',
    tagline: 'Life-Support Siphon',
    description: 'Deploys an orbital drone hack that hijacks a rival supply drop or habitat reserves, stealing O2 and Power.',
    icon: '🛰️',
    powerCost: 20,
    mcCost: 120,
    cooldownSols: 4,
    targetEffectDesc: 'Drains -12% O2 and -10% Power from rival habitat.',
    attackerBenefitDesc: 'Transfers +6% O2 and +5% Power to your outpost.',
    battleRoyaleEffectDesc: 'Siphons resources and cargo from target commander.',
  },
  'comms-spoof': {
    slug: 'comms-spoof',
    name: 'Comms Spoofing',
    tagline: 'Phantom Flare & Morale Shock',
    description: 'Broadcasts a falsified deep-space DONKI solar flare telemetry packet, creating panic and psychological strain.',
    icon: '📡',
    powerCost: 12,
    mcCost: 90,
    cooldownSols: 3,
    targetEffectDesc: 'Injects deceptive Phantom CME warning and inflicts -10% Crew Morale.',
    battleRoyaleEffectDesc: 'Transmits decoy radar signatures to confuse enemy scanners.',
  },
  'solar-blind': {
    slug: 'solar-blind',
    name: 'Regolith Dust Kickup',
    tagline: 'Array Blinding & Hull Abrasion',
    description: 'Directs laser sweeps and rover thrusters to blanket rival solar arrays in high-albedo Martian dust.',
    icon: '🌪️',
    powerCost: 18,
    mcCost: 110,
    cooldownSols: 4,
    targetEffectDesc: 'Degrades solar power yield by -35% for 2 Sols.',
    battleRoyaleEffectDesc: 'Deals 15 Hull Damage to rivals in sector.',
  },
};

export interface ActiveDebuffs {
  empJammedSols: number;
  solarBlindedSols: number;
  spoofedAlertActive: boolean;
}

export interface SabotageEvent {
  id: string;
  contextType: SabotageContextType;
  contextId: string;
  attackerId: string;
  attackerName: string;
  attackerAvatar?: string;
  targetId: string;
  targetName?: string;
  sabotageSlug: SabotageSlug;
  paymentType: SabotagePaymentType;
  payloadJson: {
    powerCost?: number;
    mcCost?: number;
    stolenO2?: number;
    stolenPower?: number;
    damage?: number;
    customNote?: string;
  };
  status: 'pending' | 'applied';
  createdAt: string;
}

export interface TriggerSabotageRequest {
  contextType: SabotageContextType;
  contextId: string;
  attackerId: string;
  attackerName: string;
  attackerAvatar?: string;
  targetId: string;
  targetName?: string;
  sabotageSlug: SabotageSlug;
  paymentType: SabotagePaymentType;
  isBotTarget?: boolean;
  currentSol?: number;
}

export interface TriggerSabotageResponse {
  success: boolean;
  event?: SabotageEvent;
  counterAttack?: SabotageEvent | null;
  remainingCredits?: number;
  powerDeduction?: number;
  error?: string;
}

export interface PollSabotageResponse {
  success: boolean;
  events: SabotageEvent[];
}
