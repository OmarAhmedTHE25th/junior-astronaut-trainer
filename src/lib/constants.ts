// ─── Junior Astronaut Mission Trainer – Game Balance Constants ───
// Pure values. No React, no DOM.

import type { PlayerAction, Difficulty, LandingSiteId, LandingSite } from './types';

// ── Mission Parameters ──────────────────────────────────────

/** How many sols the mission lasts */
export const MISSION_LENGTH = 30;

/** Chance (0-1) of a random event each sol */
export const EVENT_CHANCE = 0.45;

/** Any resource at or below this value triggers a critical warning */
export const CRITICAL_THRESHOLD = 20;

/** Min/max clamp for every resource */
export const RESOURCE_MIN = 0;
export const RESOURCE_MAX = 100;

// ── Starting Resources ──────────────────────────────────────

export const INITIAL_RESOURCES = {
  power: 95,
  oxygen: 95,
  shielding: 90,
  morale: 75,
} as const;

// ── Per-Sol Passive Depletion ───────────────────────────────

export const SOL_DEPLETION = {
  power: -8,
  oxygen: -6,
  shielding: -3,
} as const;

// ── Difficulty Multipliers ──────────────────────────────────

export interface DifficultyConfig {
  label: string;
  depletionMultiplier: number;
  eventChanceMultiplier: number;
  scoreMultiplier: number;
  description: string;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  cadet: {
    label: 'Space Cadet',
    depletionMultiplier: 0.5,
    eventChanceMultiplier: 0.6,
    scoreMultiplier: 1.0,
    description: 'Easier resource drain — great for first-time astronauts!',
  },
  commander: {
    label: 'Mission Commander',
    depletionMultiplier: 1.0,
    eventChanceMultiplier: 1.0,
    scoreMultiplier: 1.5,
    description: 'Standard challenge — can you keep the crew alive?',
  },
  pioneer: {
    label: 'Mars Pioneer',
    depletionMultiplier: 1.4,
    eventChanceMultiplier: 1.2,
    scoreMultiplier: 2.0,
    description: 'Extreme conditions — only the best survive!',
  },
} as const;

// ── Available Player Actions ────────────────────────────────

export const AVAILABLE_ACTIONS: PlayerAction[] = [
  {
    id: 'run-o2-generators',
    name: 'Run O₂ Generators',
    description: 'Electrolyze water to produce breathable oxygen — uses a lot of power!',
    effects: { power: -10, oxygen: 15, shielding: 0 },
    moraleEffect: 0,
    icon: '🫁',
  },
  {
    id: 'boost-shields',
    name: 'Boost Shields',
    description: 'Reinforce the habitat radiation shielding using power and some oxygen reserves.',
    effects: { power: -12, oxygen: -5, shielding: 20 },
    moraleEffect: 0,
    icon: '🛡️',
  },
  {
    id: 'solar-panel-repair',
    name: 'Solar Panel Repair',
    description: 'Send a rover out to clean and repair solar panels — risky for shielding!',
    effects: { power: 18, oxygen: 0, shielding: -5 },
    moraleEffect: 0,
    icon: '🔧',
  },
  {
    id: 'conserve-resources',
    name: 'Conserve Resources',
    description: 'Reduce habitat activity to conserve a little of everything.',
    effects: { power: 5, oxygen: 5, shielding: 5 },
    moraleEffect: -3,
    icon: '♻️',
  },
  {
    id: 'research-mission',
    name: 'Research Mission',
    description: 'Explore Mars geology — uses power and oxygen but earns big science points!',
    effects: { power: -8, oxygen: -5, shielding: 0 },
    scoreEffect: 50,
    moraleEffect: 5,
    icon: '🔬',
  },
  {
    id: 'grow-food',
    name: 'Grow Food',
    description: 'Tend the greenhouse garden to keep the crew happy and well-fed.',
    effects: { power: -10, oxygen: -5, shielding: 0 },
    moraleEffect: 8,
    icon: '🌱',
  },
  {
    id: 'antenna-maintenance',
    name: 'Antenna Maintenance',
    description: 'Align the deep-space antenna for better Earth contact — great for morale!',
    effects: { power: -6, oxygen: 0, shielding: -3 },
    moraleEffect: 10,
    scoreEffect: 15,
    icon: '📡',
  },
  {
    id: 'emergency-drill',
    name: 'Emergency Drill',
    description: 'Practice emergency procedures — small resource cost, but the crew feels safer.',
    effects: { power: -4, oxygen: -3, shielding: 2 },
    moraleEffect: 5,
    scoreEffect: 10,
    icon: '🚨',
  },
];

// ── Score Thresholds ────────────────────────────────────────

export const STAR_THRESHOLDS = {
  oneStar: 200,
  twoStar: 500,
  threeStar: 900,
} as const;

/** Base points awarded per sol survived */
export const SCORE_PER_SOL = 15;

/** Bonus points for finishing with resources above 50 */
export const HEALTHY_RESOURCE_BONUS = 25;

/** Morale bonus per point above 50 at mission end */
export const MORALE_SCORE_FACTOR = 2;

// ── Martian Landing Sites Configuration ─────────────────────

export const LANDING_SITES: Record<LandingSiteId, LandingSite> = {
  jezero: {
    id: 'jezero',
    name: 'Jezero Crater',
    roverMission: 'Perseverance Rover Site (Mars 2020)',
    lat: 18.38,
    lon: 77.58,
    elevation: '-2.5 km (Ancient Lake Basin)',
    description: 'An ancient delta-lake system rich in phyllosilicates (clays) and microbial biosignature targets.',
    perksSummary: 'Balanced conditions • +10% Science & Research Mission Points',
    powerGainMod: 1.0,
    powerDepletionMod: 1.0,
    oxygenDepletionMod: 1.0,
    shieldDepletionMod: 1.0,
    researchScoreBonus: 0.10,
    pinColor: '#3B82F6',
  },
  gale: {
    id: 'gale',
    name: 'Gale Crater (Aeolis Palus)',
    roverMission: 'Curiosity MSL Site (Mars Science Laboratory)',
    lat: -5.4,
    lon: 137.8,
    elevation: '-4.5 km (Deep Lowland)',
    description: 'A deep impact crater with a thicker atmospheric column that mitigates solar radiation but traps atmospheric dust.',
    perksSummary: '-15% O₂ Drain • -10% Shield Drain • -10% Solar Power (Dust Attenuation)',
    powerGainMod: 0.90,
    powerDepletionMod: 1.0,
    oxygenDepletionMod: 0.85,
    shieldDepletionMod: 0.90,
    researchScoreBonus: 0.0,
    pinColor: '#22C55E',
  },
  olympus: {
    id: 'olympus',
    name: 'Olympus Mons Caldera',
    roverMission: 'High-Altitude Solar Observatory',
    lat: 18.65,
    lon: 226.2,
    elevation: '+21.3 km (Volcanic Summit)',
    description: 'The solar system’s tallest volcano. Soaring above 80% of Mars atmosphere, it captures intense, unfiltered sunlight but provides minimal atmospheric shielding.',
    perksSummary: '+25% Solar Power Gain • +20% O₂ Drain • +15% Shield Drain',
    powerGainMod: 1.25,
    powerDepletionMod: 1.0,
    oxygenDepletionMod: 1.20,
    shieldDepletionMod: 1.15,
    researchScoreBonus: 0.0,
    pinColor: '#E87040',
  },
};
