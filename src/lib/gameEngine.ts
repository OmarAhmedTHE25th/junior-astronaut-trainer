// ─── Junior Astronaut Mission Trainer – Game Engine (Pure Reducer) ───
// Pure functions. No React, no DOM.

import type {
  GameState,
  GameAction,
  GameEvent,
  Difficulty,
  CadetSpecialty,
  LandingSiteId,
  TelemetryPoint,
  LogEntry,
  ResourceType,
} from './types';
import {
  type PlanetId,
  getPlanetCartridge,
  PLANET_CARTRIDGES,
} from './planetCartridges';
import {
  INITIAL_RESOURCES,
  SOL_DEPLETION,
  MISSION_LENGTH,
  RESOURCE_MIN,
  RESOURCE_MAX,
  DIFFICULTY_SETTINGS,
  SCORE_PER_SOL,
  HEALTHY_RESOURCE_BONUS,
  MORALE_SCORE_FACTOR,
  STAR_THRESHOLDS,
  LANDING_SITES,
} from './constants';
import { generateEvent } from './events';
import {
  getEndlessDepletionMultiplier,
  getCompoundingWearMultiplier,
  calculateTournamentScore,
} from './survivalEngine';
import {
  drawSolOperations,
  resolveOperation,
  OPERATIONS_CATALOG,
} from './operationsDeck';

// ── Helpers ─────────────────────────────────────────────────

/** Clamp a number between RESOURCE_MIN and RESOURCE_MAX. */
function clamp(value: number, min = RESOURCE_MIN, max = RESOURCE_MAX): number {
  return Math.max(min, Math.min(max, value));
}

/** Apply a Record<ResourceType, number> delta to the state, returning a new state. */
function applyEffects(
  state: GameState,
  effects: Partial<Record<ResourceType, number>>,
  moraleEffect = 0,
  scoreEffect = 0,
): GameState {
  return {
    ...state,
    power: clamp(state.power + (effects.power ?? 0)),
    oxygen: clamp(state.oxygen + (effects.oxygen ?? 0)),
    shielding: clamp(state.shielding + (effects.shielding ?? 0)),
    morale: clamp(state.morale + moraleEffect),
    score: Math.max(0, state.score + scoreEffect),
  };
}

// ── Public Pure Functions ───────────────────────────────────

/**
 * Create the initial game state for a given difficulty, specialty, and landing site.
 */
export function createInitialState(
  difficulty: Difficulty = 'commander',
  specialty: CadetSpecialty = 'commander',
  landingSite: LandingSiteId = 'jezero',
  cadet?: { cadetId?: string; callsign?: string; avatar?: string },
  squad?: { squadCode?: string; weatherSeed?: number },
  isTimedMode?: boolean,
  tournament?: {
    tournamentId?: string;
    matchId?: string;
    rngSeed?: number;
    rivalCallsign?: string;
    rivalAvatar?: string;
  },
  battlePass?: {
    isFiveStarGeneral?: boolean;
    retriesRemaining?: number;
  },
  guild?: {
    guildId?: string;
    tag?: string;
    buffLevel?: number;
    name?: string;
  } | null,
  planetId: PlanetId = 'mars'
): GameState {
  const isEndless = Boolean(tournament?.tournamentId);
  const cartridge = getPlanetCartridge(planetId);
  const location = cartridge.locations.find((l) => l.id === landingSite) || cartridge.locations[0];

  let startPower: number = INITIAL_RESOURCES.power + (location?.bonusStats?.power ?? 0);
  let startOxygen: number = INITIAL_RESOURCES.oxygen + (location?.bonusStats?.oxygen ?? 0);
  let startShielding: number = INITIAL_RESOURCES.shielding + (location?.bonusStats?.shielding ?? 0);
  let startMorale: number = INITIAL_RESOURCES.morale;

  const initialPlanetMetrics: Record<string, number> = {};
  for (const m of cartridge.customMetrics) {
    let val = m.defaultValue;
    if (location?.bonusStats?.metricBonus?.[m.key] !== undefined) {
      val = Math.max(m.min, Math.min(m.max, val + (location.bonusStats.metricBonus[m.key] ?? 0)));
    }
    initialPlanetMetrics[m.key] = val;
  }

  const buffLevel = guild?.buffLevel || 0;
  if (buffLevel === 1) {
    startPower = Math.min(100, Math.round(startPower * 1.02));
    startOxygen = Math.min(100, Math.round(startOxygen * 1.02));
  } else if (buffLevel === 2) {
    startPower = Math.min(100, Math.round(startPower * 1.05));
    startOxygen = Math.min(100, Math.round(startOxygen * 1.05));
    startShielding = Math.min(100, Math.round(startShielding * 1.05));
    startMorale = Math.min(100, Math.round(startMorale * 1.05));
  } else if (buffLevel === 3) {
    startPower = Math.min(100, Math.round(startPower * 1.08));
    startOxygen = Math.min(100, Math.round(startOxygen * 1.08));
    startShielding = Math.min(100, Math.round(startShielding * 1.08));
    startMorale = Math.min(100, Math.round(startMorale * 1.08));
  } else if (buffLevel === 4) {
    startPower = Math.min(100, Math.round(startPower * 1.12));
    startOxygen = Math.min(100, Math.round(startOxygen * 1.12));
    startShielding = Math.min(100, Math.round(startShielding * 1.12));
    startMorale = Math.min(100, Math.round(startMorale * 1.12));
  } else if (buffLevel >= 5) {
    startPower = Math.min(100, Math.round(startPower * 1.15));
    startOxygen = Math.min(100, Math.round(startOxygen * 1.15));
    startShielding = Math.min(100, Math.round(startShielding * 1.15));
    startMorale = Math.min(100, Math.round(startMorale * 1.15));
  }

  const initialPoint: TelemetryPoint = {
    sol: 1,
    power: startPower,
    oxygen: startOxygen,
    shielding: startShielding,
    morale: startMorale,
  };

  const formattedCallsign =
    guild?.tag && cadet?.callsign && !cadet.callsign.startsWith(`[${guild.tag}]`)
      ? `[${guild.tag}] ${cadet.callsign}`
      : cadet?.callsign;

  return {
    sol: 1,
    maxSol: isEndless ? 999999 : MISSION_LENGTH,
    power: startPower,
    oxygen: startOxygen,
    shielding: startShielding,
    morale: startMorale,
    phase: 'action',
    log: [],
    activeEvent: null,
    score: 0,
    usedEventIds: [],
    difficulty,
    specialty,
    landingSite,
    telemetryHistory: [initialPoint],
    cadetId: cadet?.cadetId,
    callsign: formattedCallsign,
    avatar: cadet?.avatar,
    guild: guild?.guildId && guild?.tag ? {
      guildId: guild.guildId,
      tag: guild.tag,
      buffLevel: guild.buffLevel || 1,
      name: guild.name,
    } : null,
    squadCode: squad?.squadCode,
    weatherSeed: squad?.weatherSeed,
    isTimedMode: Boolean(isTimedMode),
    missionTimeSeconds: 0,
    rapidResponseBonus: 0,
    isEndlessTournament: isEndless,
    tournamentId: tournament?.tournamentId,
    tournamentMatchId: tournament?.matchId,
    tournamentRngSeed: tournament?.rngSeed,
    rivalCallsign: tournament?.rivalCallsign,
    rivalAvatar: tournament?.rivalAvatar,
    activeHand: drawSolOperations(
      {
        sol: 1,
        maxSol: isEndless ? 999999 : MISSION_LENGTH,
        power: INITIAL_RESOURCES.power,
        oxygen: INITIAL_RESOURCES.oxygen,
        shielding: INITIAL_RESOURCES.shielding,
        morale: INITIAL_RESOURCES.morale,
        phase: 'action',
        log: [],
        activeEvent: null,
        score: 0,
        usedEventIds: [],
        difficulty,
        specialty,
        landingSite,
        weatherSeed: squad?.weatherSeed,
        tournamentRngSeed: tournament?.rngSeed,
      } as GameState,
      tournament?.rngSeed || squad?.weatherSeed || 424242
    ).hand.map((c) => c.id),
    operationCooldowns: {},
    commandOverrides: 1,
    lastDrawnSol: 1,
    totalOverridesUsed: 0,
    activeDebuffs: {
      empJammedSols: 0,
      solarBlindedSols: 0,
      spoofedAlertActive: false,
    },
    sabotageCooldowns: {},
    isFiveStarGeneral: battlePass?.isFiveStarGeneral,
    retriesRemaining: battlePass?.retriesRemaining ?? (battlePass?.isFiveStarGeneral ? 3 : 0),
    planetId,
    planetMetrics: initialPlanetMetrics,
    frozenActions: [],
    isGlitchedEntropy: false,
  };
}

/**
 * Compute a morale modifier that scales effects.
 * High morale → slight bonus; low morale → slight penalty.
 */
export function getMoraleModifier(morale: number): number {
  if (morale >= 80) return 1.15;
  if (morale >= 60) return 1.05;
  if (morale >= 40) return 1.0;
  if (morale >= 20) return 0.9;
  return 0.75;
}

/**
 * Check if the game is lost (any vital resource hits 0).
 */
export function checkGameOver(state: GameState): boolean {
  return state.power <= 0 || state.oxygen <= 0 || state.shielding <= 0;
}

/**
 * If the player has Five-Star General emergency retries remaining,
 * restore vitals to 45% and continue the mission instead of game over.
 */
export function applyRetryOrGameOver(state: GameState, reason?: string): GameState {
  if ((state.retriesRemaining ?? 0) > 0) {
    const remaining = (state.retriesRemaining ?? 0) - 1;
    const retryLog: LogEntry = {
      sol: state.sol,
      type: 'system',
      title: '★★★★★ FIVE-STAR GENERAL OVERRIDE',
      description: `★★★★★ FIVE-STAR GENERAL OVERRIDE: Emergency Life-Support Retry Activated! Critical outpost systems restored to 45% (${remaining} retries remaining).`,
      resourceChanges: {
        power: Math.max(0, 45 - state.power),
        oxygen: Math.max(0, 45 - state.oxygen),
        shielding: Math.max(0, 45 - state.shielding),
      },
      moraleChange: Math.max(0, 45 - state.morale),
      icon: '🔄',
    };
    return {
      ...state,
      power: 45,
      oxygen: 45,
      shielding: 45,
      morale: Math.max(state.morale, 45),
      retriesRemaining: remaining,
      phase: 'action',
      log: [...state.log, retryLog],
    };
  }
  return {
    ...state,
    phase: 'gameover',
    gameOverReason: reason ?? state.gameOverReason,
    score: calculateScore(state),
  };
}

/**
 * Check if the mission is won (survived all sols with resources > 0).
 */
export function checkVictory(state: GameState): boolean {
  return state.sol > state.maxSol && !checkGameOver(state);
}

/**
 * Calculate the final score at mission end.
 */
export function calculateScore(state: GameState): number {
  if (state.isEndlessTournament) {
    const hours = Math.floor((state.missionTimeSeconds || 0) / 3600) || Math.min(23, state.sol % 24);
    return calculateTournamentScore(state.sol, hours, {
      power: state.power,
      oxygen: state.oxygen,
      shielding: state.shielding,
      morale: state.morale,
    });
  }

  const diff = DIFFICULTY_SETTINGS[state.difficulty];
  let score = state.score;

  // Per-sol survival bonus
  score += Math.min(state.sol - 1, state.maxSol) * SCORE_PER_SOL;

  // Resource health bonuses
  if (state.power > 50) score += HEALTHY_RESOURCE_BONUS;
  if (state.oxygen > 50) score += HEALTHY_RESOURCE_BONUS;
  if (state.shielding > 50) score += HEALTHY_RESOURCE_BONUS;

  // Morale bonus
  score += Math.max(0, state.morale - 50) * MORALE_SCORE_FACTOR;

  // Difficulty multiplier
  score = Math.round(score * diff.scoreMultiplier);

  return score;
}

/**
 * Convert a final score to a 1-3 star rating.
 */
export function getStarRating(score: number): 1 | 2 | 3 {
  if (score >= STAR_THRESHOLDS.threeStar) return 3;
  if (score >= STAR_THRESHOLDS.twoStar) return 2;
  return 1;
}

// ── Sol Depletion (passive drain each turn) ─────────────────

function applySolDepletion(state: GameState): GameState {
  const diff = DIFFICULTY_SETTINGS[state.difficulty];
  const mult = diff.depletionMultiplier;
  const moraleModifier = getMoraleModifier(state.morale);

  const siteId = state.landingSite || 'jezero';
  const site = LANDING_SITES[siteId] || LANDING_SITES.jezero;

  // Endless compounding decay multiplier beyond Sol 30
  const endlessMultiplier = state.isEndlessTournament
    ? getEndlessDepletionMultiplier(state.sol)
    : 1.0;

  // Higher morale slightly reduces depletion; lower morale worsens it
  const effectiveMult = (mult * endlessMultiplier) / moraleModifier;

  const depletionEffects: Record<ResourceType, number> = {
    power: Math.round(SOL_DEPLETION.power * effectiveMult * site.powerDepletionMod),
    oxygen: Math.round(SOL_DEPLETION.oxygen * effectiveMult * site.oxygenDepletionMod),
    shielding: Math.round(SOL_DEPLETION.shielding * effectiveMult * site.shieldDepletionMod),
  };

  // Companion Pet o2_scavenge perk reduces natural oxygen depletion
  if (state.equippedPet?.perkType === 'o2_scavenge') {
    const o2Discount = Math.min(0.5, (state.equippedPet.perkValue || 15) / 100);
    depletionEffects.oxygen = Math.round(depletionEffects.oxygen * (1 - o2Discount));
  }

  // Tactical Stim: cryo-o2-stim cuts oxygen depletion in half
  if (state.activeBoostTimers?.['cryo-o2-stim'] && state.activeBoostTimers['cryo-o2-stim'] > 0) {
    depletionEffects.oxygen = Math.round(depletionEffects.oxygen * 0.5);
  }

  // Tactical Stim: overclock-capacitor adds +10 extra power drain per sol
  if (state.activeBoostTimers?.['overclock-capacitor'] && state.activeBoostTimers['overclock-capacitor'] > 0) {
    depletionEffects.power = (depletionEffects.power || 0) - 10;
  }

  const newState = applyEffects(state, depletionEffects, -1); // morale ticks down slightly

  const logEntry: LogEntry = {
    sol: state.sol,
    type: 'depletion',
    title: state.isEndlessTournament && state.sol > 30 ? '⚠️ Escalating Endless Decay' : 'Sol Depletion',
    description: state.isEndlessTournament && state.sol > 30
      ? `Compounding environmental degradation (${endlessMultiplier.toFixed(2)}x rate) stresses outpost life support.`
      : `Mars atmospheric conditions at ${site.name} take their toll.`,
    resourceChanges: depletionEffects,
    moraleChange: -1,
  };

  return { ...newState, log: [...newState.log, logEntry] };
}

// ── Planetary Signature Mechanics (Per-World Environmental Dynamics) ──

export function applyPlanetarySignatureMechanic(state: GameState): GameState {
  const planetId = state.planetId || 'mars';
  const cartridge = getPlanetCartridge(planetId);
  const metrics = { ...(state.planetMetrics || {}) };
  const logs: LogEntry[] = [];
  let nextPower = state.power;
  let nextOxygen = state.oxygen;
  let nextShielding = state.shielding;
  let nextMorale = state.morale;
  let frozenActions = [...(state.frozenActions || [])];
  let isGlitchedEntropy = state.isGlitchedEntropy || false;

  switch (planetId) {
    case 'mars': {
      // Dust storm buildup (5-8% per sol)
      const currentDust = metrics['dustAccumulation'] ?? 15;
      const nextDust = Math.min(100, currentDust + 6);
      metrics['dustAccumulation'] = nextDust;
      if (nextDust > 75) {
        nextPower = clamp(nextPower - 6);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🌪️ Martian Dust Storm Choking Solar Arrays',
          description: `Severe regolith accumulation (${nextDust}%). Solar intake choked (-6 Power). Deploy Dust Scrubber!`,
          resourceChanges: { power: -6 },
          icon: '🌪️',
        });
      }
      break;
    }
    case 'earth': {
      // Orbital debris & radar lock
      const debris = Math.min(100, (metrics['orbitalDebris'] ?? 25) + 4);
      metrics['orbitalDebris'] = debris;
      if (debris > 75) {
        nextShielding = clamp(nextShielding - 8);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🛰️ Low Earth Orbit Debris Collision',
          description: `Dense debris belt (${debris}%) impact on orbital hull (-8 Shielding).`,
          resourceChanges: { shielding: -8 },
          icon: '🛰️',
        });
      }
      const radar = Math.min(100, (metrics['radarLock'] ?? 10) + 3);
      metrics['radarLock'] = radar;
      if (radar > 80) {
        logs.push({
          sol: state.sol,
          type: 'system',
          title: '📡 Ground Station Radar Lock Active',
          description: `Telemetry jammed by orbital tracking radar (${radar}%). Electronic countermeasures advised.`,
          resourceChanges: {},
          icon: '📡',
        });
      }
      break;
    }
    case 'venus': {
      // Aerostat altitude drift (base 52 km) & sulfuric acid corrosion
      const drift = Math.sin(state.sol) * 3;
      const currentAlt = metrics['altitude'] ?? 52;
      const nextAlt = Math.max(10, Math.min(90, Math.round(currentAlt + drift)));
      metrics['altitude'] = nextAlt;

      const corrosion = Math.min(100, (metrics['acidCorrosion'] ?? 10) + 3);
      metrics['acidCorrosion'] = corrosion;

      if (nextAlt < 35) {
        nextShielding = clamp(nextShielding - 12);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '☁️ Venus Crushing Atmospheric Pressure',
          description: `Aerostat dropped to ${nextAlt} km! 90 atm sulfuric pressure crushing habitat envelope (-12 Shielding).`,
          resourceChanges: { shielding: -12 },
          icon: '☁️',
        });
      } else if (nextAlt > 65) {
        nextOxygen = clamp(nextOxygen - 8);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '☀️ Upper Venusian Ionosphere Degradation',
          description: `Aerostat rose to ${nextAlt} km. Extreme solar UV and solar winds scouring envelope (-8 O₂).`,
          resourceChanges: { oxygen: -8 },
          icon: '☀️',
        });
      }

      if (corrosion > 60) {
        nextShielding = clamp(nextShielding - 5);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🧪 Sulfuric Acid Aerosol Pitting',
          description: `Atmospheric acid corrosion at ${corrosion}%. Eating outer heat shielding (-5 Shielding).`,
          resourceChanges: { shielding: -5 },
          icon: '🧪',
        });
      }
      break;
    }
    case 'mercury': {
      // Day/Night thermal swing: crawlerOffset stabilizes temperature
      const offset = metrics['crawlerOffset'] ?? 50;
      const driftFactor = (offset - 50) / 10;
      const temp = Math.max(0, Math.min(100, (metrics['coreTemp'] ?? 45) + driftFactor));
      metrics['coreTemp'] = Math.round(temp);

      if (temp > 80) {
        nextPower = clamp(nextPower - 10);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🔥 Mercury Daylight Overheat Wave',
          description: `Core radiator temperature hit ${temp}°C! Conduits melting in direct solar radiation (-10 Power).`,
          resourceChanges: { power: -10 },
          icon: '🔥',
        });
      } else if (temp < 20) {
        nextOxygen = clamp(nextOxygen - 10);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '❄️ Mercury Deep Shadow Freeze',
          description: `Core radiator temperature dropped to ${temp}°C! Liquid oxygen valves freezing solid (-10 O₂).`,
          resourceChanges: { oxygen: -10 },
          icon: '❄️',
        });
      }
      break;
    }
    case 'jupiter': {
      // Flux voltage accumulation
      const flux = Math.min(100, (metrics['fluxCharge'] ?? 20) + 10);
      metrics['fluxCharge'] = flux;
      if (flux > 85) {
        nextPower = clamp(nextPower - 18);
        nextShielding = clamp(nextShielding - 10);
        metrics['fluxCharge'] = 25; // Discharged
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '⚡ Jovian Megavolt Arc-Flash Discharge!',
          description: `Jovian radiation belt overloaded capacitors! Explosive arc flash ripped through conduits (-18 Power, -10 Shielding).`,
          resourceChanges: { power: -18, shielding: -10 },
          icon: '⚡',
        });
      }
      break;
    }
    case 'saturn': {
      // Ring particle shear
      const shear = Math.min(100, (metrics['ringShear'] ?? 20) + 6);
      metrics['ringShear'] = shear;
      if (shear > 80) {
        nextShielding = clamp(nextShielding - 12);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🪐 Saturn Ring Particle Shear Exceeded',
          description: `Hypervelocity ring ice boulders gouging habitat radiators (${shear}% shear, -12 Shielding).`,
          resourceChanges: { shielding: -12 },
          icon: '🪐',
        });
      }
      break;
    }
    case 'uranus': {
      // Cryogenic hydraulics degradation
      const hydro = Math.max(0, (metrics['hydraulics'] ?? 85) - 8);
      metrics['hydraulics'] = hydro;
      if (hydro < 30) {
        const planetActions = cartridge.actions.map((a) => a.id);
        const randomAction = planetActions[Math.floor(Math.random() * planetActions.length)];
        if (!frozenActions.includes(randomAction)) {
          frozenActions.push(randomAction);
        }
        logs.push({
          sol: state.sol,
          type: 'system',
          title: '❄️ Cryogenic Hydraulic Lockout!',
          description: `Hydraulic pressure fell to ${hydro}%. Actuator frozen! Control action locked until thawed.`,
          resourceChanges: {},
          icon: '❄️',
        });
      } else {
        frozenActions = [];
      }
      break;
    }
    case 'neptune': {
      // Supersonic wind shear
      const gust = (state.sol * 7) % 25;
      const shear = Math.min(100, Math.max(20, 45 + gust));
      metrics['windShear'] = shear;
      if (shear > 80) {
        nextShielding = clamp(nextShielding - 12);
        logs.push({
          sol: state.sol,
          type: 'depletion',
          title: '🌪️ Supersonic 2,100 km/h Neptune Wind Shear',
          description: `Violent wind shear (${shear}%) overstressing atmospheric anchor tether (-12 Shielding).`,
          resourceChanges: { shielding: -12 },
          icon: '🌪️',
        });
      }
      break;
    }
    case 'planet_x': {
      // Quantum decoherence / entropy
      const entropy = Math.min(100, (metrics['entropy'] ?? 15) + 7);
      metrics['entropy'] = entropy;
      if (entropy > 70) {
        isGlitchedEntropy = true;
        nextMorale = clamp(nextMorale - 5);
        logs.push({
          sol: state.sol,
          type: 'system',
          title: '👁️ Quantum Decoherence Cascade (Entropy > 70%)',
          description: `Spacetime coordinate collapse outside Kuiper Cliff! HUD telemetry scrambling. Pulse Quantum Anchor immediately!`,
          resourceChanges: {},
          moraleChange: -5,
          icon: '👁️',
        });
      } else {
        isGlitchedEntropy = false;
      }
      break;
    }
  }

  return {
    ...state,
    power: nextPower,
    oxygen: nextOxygen,
    shielding: nextShielding,
    morale: nextMorale,
    planetMetrics: metrics,
    frozenActions,
    isGlitchedEntropy,
    log: [...state.log, ...logs],
  };
}

// ── The Pure Reducer ────────────────────────────────────────

/**
 * Pure game reducer — the single source of truth for state transitions.
 * Every game mutation goes through here.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    // ── Start a new mission ───────────────────────────────
    case 'START_MISSION': {
      const initial = createInitialState(
        action.difficulty,
        action.specialty || 'commander',
        action.landingSite || 'jezero',
        action.cadet,
        action.squad,
        action.isTimedMode,
        undefined,
        {
          isFiveStarGeneral: state.isFiveStarGeneral,
          retriesRemaining: state.retriesRemaining,
        },
        state.guild,
        action.planetId || state.planetId || 'mars'
      );
      return { ...initial, phase: 'action' };
    }

    // ── Load a saved mission ──────────────────────────────
    case 'LOAD_STATE': {
      const gs = action.state;
      const activeHand =
        gs.activeHand && gs.activeHand.length >= 5
          ? gs.activeHand
          : drawSolOperations(gs).hand.map((c) => c.id);

      return {
        ...gs,
        planetId: gs.planetId || 'mars',
        planetMetrics: gs.planetMetrics || {},
        frozenActions: gs.frozenActions || [],
        isGlitchedEntropy: Boolean(gs.isGlitchedEntropy),
        activeHand,
        operationCooldowns: gs.operationCooldowns || {},
        commandOverrides: gs.commandOverrides ?? 1,
        lastDrawnSol: gs.lastDrawnSol || gs.sol,
        totalOverridesUsed: gs.totalOverridesUsed || 0,
        landingSite: gs.landingSite || 'jezero',
        squadCode: gs.squadCode,
        weatherSeed: gs.weatherSeed,
        isTimedMode: gs.isTimedMode,
        isFiveStarGeneral: gs.isFiveStarGeneral,
        retriesRemaining: gs.retriesRemaining,
        gameOverReason: gs.gameOverReason,
        missionTimeSeconds: gs.missionTimeSeconds ?? 0,
        rapidResponseBonus: gs.rapidResponseBonus ?? 0,
        telemetryHistory:
          gs.telemetryHistory && gs.telemetryHistory.length > 0
            ? gs.telemetryHistory
            : [
                {
                  sol: gs.sol,
                  power: gs.power,
                  oxygen: gs.oxygen,
                  shielding: gs.shielding,
                  morale: gs.morale,
                },
              ],
      };
    }

    // ── Player performs an action ─────────────────────────
    case 'PERFORM_ACTION': {
      if (state.phase !== 'action') return state;

      const playerAction = ('action' in action && action.action ? action.action : action.payload);
      if (!playerAction) return state;

      const moraleModifier = getMoraleModifier(state.morale);
      const specialty = state.specialty || 'commander';
      const siteId = state.landingSite || 'jezero';
      const site = LANDING_SITES[siteId] || LANDING_SITES.jezero;

      let basePower = playerAction.effects.power;
      let baseOxygen = playerAction.effects.oxygen;
      let baseShielding = playerAction.effects.shielding;
      let baseMorale = playerAction.moraleEffect ?? 0;
      let baseScore = playerAction.scoreEffect ?? 0;

      // Astronaut Specialty Action Perks
      if (specialty === 'engineer' && (playerAction.id === 'solar-panel-repair' || playerAction.id === 'conserve-resources')) {
        if (basePower > 0) basePower = Math.round(basePower * 1.20);
      } else if (specialty === 'biologist' && (playerAction.id === 'run-o2-generators' || playerAction.id === 'grow-food')) {
        if (baseOxygen > 0) baseOxygen = Math.round(baseOxygen * 1.25);
        if (baseMorale > 0) baseMorale = Math.round(baseMorale * 1.25);
      } else if (specialty === 'physicist' && playerAction.id === 'boost-shields') {
        if (baseShielding > 0) baseShielding = Math.round(baseShielding * 1.20);
      } else if (specialty === 'commander' && playerAction.id === 'research-mission') {
        if (baseScore > 0) baseScore = Math.round(baseScore * 1.15);
      }

      // Landing Site Perks
      if (basePower > 0 && site.powerGainMod !== 1.0) {
        basePower = Math.round(basePower * site.powerGainMod);
      }
      if (playerAction.id === 'research-mission' && site.researchScoreBonus > 0) {
        baseScore = Math.round(baseScore * (1 + site.researchScoreBonus));
      }

      // Scale positive effects by morale modifier
      const scaledEffects: Record<ResourceType, number> = {
        power: basePower > 0
          ? Math.round(basePower * moraleModifier)
          : basePower,
        oxygen: baseOxygen > 0
          ? Math.round(baseOxygen * moraleModifier)
          : baseOxygen,
        shielding: baseShielding > 0
          ? Math.round(baseShielding * moraleModifier)
          : baseShielding,
      };

      let newState = applyEffects(
        state,
        scaledEffects,
        baseMorale,
        baseScore,
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'action',
        title: playerAction.name,
        description: playerAction.description,
        resourceChanges: scaledEffects,
        moraleChange: baseMorale,
        icon: playerAction.icon,
      };

      newState = { ...newState, log: [...newState.log, logEntry] };

      // Check for game over after action
      if (checkGameOver(newState)) {
        return applyRetryOrGameOver(newState, 'depletion');
      }

      // Move to the END_TURN phase (which handles depletion + events)
      return { ...newState, phase: 'result' };
    }

    // ── Execute an operation from the dynamic 5-card hand ───
    case 'PERFORM_OPERATION': {
      if (state.phase !== 'action') return state;

      const { operationId, activePetId, activeBoosts } = action;
      const roll = resolveOperation(
        state,
        operationId,
        state.tournamentRngSeed || state.weatherSeed,
        activePetId,
        activeBoosts
      );

      // Multi-Sol Cooldown: Card locked until state.sol + cooldownSols
      const nextCooldowns = { ...(state.operationCooldowns || {}) };
      if (roll.card.cooldownSols > 0) {
        nextCooldowns[operationId] = state.sol + roll.card.cooldownSols;
      }

      // If solar arrays are blinded by hostile sabotage, reduce positive power yield by 35%
      let effectivePowerDelta = roll.netDeltas.power ?? 0;
      if (effectivePowerDelta > 0 && (state.activeDebuffs?.solarBlindedSols || 0) > 0) {
        effectivePowerDelta = Math.round(effectivePowerDelta * 0.65);
      }

      let newState = applyEffects(
        state,
        {
          power: effectivePowerDelta,
          oxygen: roll.netDeltas.oxygen,
          shielding: roll.netDeltas.shielding,
        },
        roll.moraleChange,
        roll.scoreChange
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'action',
        title: roll.logTitle,
        description: roll.logDescription,
        resourceChanges: {
          power: effectivePowerDelta,
          oxygen: roll.netDeltas.oxygen,
          shielding: roll.netDeltas.shielding,
        },
        moraleChange: roll.moraleChange,
        icon: roll.card.icon,
      };

      newState = {
        ...newState,
        operationCooldowns: nextCooldowns,
        log: [...newState.log, logEntry],
      };

      if (checkGameOver(newState)) {
        return applyRetryOrGameOver(newState, 'depletion');
      }

      return { ...newState, phase: 'result' };
    }

    // ── Execute an exclusive planetary signature action ────
    case 'EXECUTE_PLANET_ACTION': {
      if (state.phase !== 'action') return state;
      const { actionId } = action;
      const planetId = state.planetId || 'mars';
      const cartridge = getPlanetCartridge(planetId);
      const actionDef = cartridge.actions.find((a) => a.id === actionId);
      if (!actionDef) return state;

      // Check if action is frozen (e.g. by Uranus cryogenic hydraulics)
      if (state.frozenActions?.includes(actionId)) return state;

      // Check cooldown
      const currentCooldown = state.operationCooldowns?.[actionId] || 0;
      if (currentCooldown > state.sol) return state;

      // Check resource costs
      const costs = actionDef.resourceCosts || {};
      if (costs.power && state.power < costs.power) return state;
      if (costs.oxygen && state.oxygen < costs.oxygen) return state;
      if (costs.shielding && state.shielding < costs.shielding) return state;

      // Check custom metric costs
      const metrics = { ...(state.planetMetrics || {}) };
      if (costs.customMetricCost) {
        for (const [mKey, mCost] of Object.entries(costs.customMetricCost)) {
          if ((metrics[mKey] ?? 0) < mCost) return state;
        }
        for (const [mKey, mCost] of Object.entries(costs.customMetricCost)) {
          metrics[mKey] -= mCost;
        }
      }

      // Deduct costs
      let nextPower = clamp(state.power - (costs.power ?? 0));
      let nextOxygen = clamp(state.oxygen - (costs.oxygen ?? 0));
      let nextShielding = clamp(state.shielding - (costs.shielding ?? 0));
      let nextMorale = state.morale;
      let nextScore = state.score;

      // Apply guaranteed effects
      const eff = actionDef.guaranteedEffects;
      if (eff.power) nextPower = clamp(nextPower + eff.power);
      if (eff.oxygen) nextOxygen = clamp(nextOxygen + eff.oxygen);
      if (eff.shielding) nextShielding = clamp(nextShielding + eff.shielding);
      if (eff.morale) nextMorale = clamp(nextMorale + eff.morale);
      if (eff.score) nextScore = Math.max(0, nextScore + eff.score);

      // Apply custom metric deltas
      if (eff.customMetricDelta) {
        for (const [mKey, delta] of Object.entries(eff.customMetricDelta)) {
          const mDef = cartridge.customMetrics.find((m) => m.key === mKey);
          const current = metrics[mKey] ?? (mDef ? mDef.defaultValue : 0);
          const min = mDef ? mDef.min : 0;
          const max = mDef ? mDef.max : 100;
          metrics[mKey] = Math.max(min, Math.min(max, current + delta));
        }
      }

      // Planetary specific mechanical overrides
      let frozenActions = [...(state.frozenActions || [])];
      let isGlitchedEntropy = state.isGlitchedEntropy;

      if (actionId === 'uranus_cryo_thaw') {
        metrics['hydraulics'] = 80;
        frozenActions = [];
      } else if (actionId === 'planet_x_quantum_anchor') {
        metrics['entropy'] = 10;
        metrics['anchorResonance'] = 90;
        isGlitchedEntropy = false;
      } else if (actionId === 'saturn_ice_processing') {
        const iceCargo = metrics['iceCargo'] || 0;
        if (iceCargo > 0) {
          nextOxygen = clamp(nextOxygen + 25);
          nextPower = clamp(nextPower + 20);
          metrics['iceCargo'] = 0;
        }
      } else if (actionId === 'neptune_diamond_harvest') {
        nextScore += 250;
      }

      // Multi-Sol Cooldown
      const nextCooldowns = { ...(state.operationCooldowns || {}) };
      if (actionDef.cooldownSols > 0) {
        nextCooldowns[actionId] = state.sol + actionDef.cooldownSols;
      }

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'action',
        title: `${actionDef.icon} ${actionDef.title}`,
        description: actionDef.description + (actionDef.mechanicNote ? ` (${actionDef.mechanicNote})` : ''),
        resourceChanges: {
          power: (eff.power ?? 0) - (costs.power ?? 0),
          oxygen: (eff.oxygen ?? 0) - (costs.oxygen ?? 0),
          shielding: (eff.shielding ?? 0) - (costs.shielding ?? 0),
        },
        moraleChange: eff.morale,
        scoreEffect: eff.score,
        icon: actionDef.icon,
      };

      const newState: GameState = {
        ...state,
        power: nextPower,
        oxygen: nextOxygen,
        shielding: nextShielding,
        morale: nextMorale,
        score: nextScore,
        planetMetrics: metrics,
        frozenActions,
        isGlitchedEntropy,
        operationCooldowns: nextCooldowns,
        log: [...state.log, logEntry],
      };

      if (checkGameOver(newState)) {
        return applyRetryOrGameOver(newState, 'depletion');
      }

      return { ...newState, phase: 'result' };
    }

    // ── Command Override (Deck Re-Roll) ───────────────────
    case 'COMMAND_OVERRIDE': {
      if (state.phase !== 'action') return state;
      // EMP Jam disables Command Override re-roll
      if ((state.activeDebuffs?.empJammedSols || 0) > 0) {
        const jammedLog: LogEntry = {
          sol: state.sol,
          type: 'system',
          title: '⚡ Command Override Jammed (EMP Active)',
          description: 'Hostile microwave interference has locked the deck control bus. Re-roll unavailable this Sol.',
          resourceChanges: {},
          icon: '⚡',
        };
        return {
          ...state,
          log: [...state.log, jammedLog],
        };
      }

      const currentOverrides = state.commandOverrides ?? 1;
      if (currentOverrides <= 0) return state;

      const overrideCount = (state.totalOverridesUsed || 0) + 1;
      const drawResult = drawSolOperations(
        state,
        state.tournamentRngSeed || state.weatherSeed,
        overrideCount
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: '🔄 Command Override Deployed',
        description: 'Tactical re-roll executed. Operations deck redealt under emergency command authority.',
        resourceChanges: {},
        icon: '🔄',
      };

      return {
        ...state,
        activeHand: drawResult.hand.map((c) => c.id),
        hasEmergencyDraw: drawResult.hasEmergencyDraw,
        commandOverrides: currentOverrides - 1,
        totalOverridesUsed: overrideCount,
        log: [...state.log, logEntry],
      };
    }

    // ── Activate a Slotted Tactical Stim ──────────────────
    case 'ACTIVATE_BOOST': {
      if (state.phase !== 'action') return state;
      const { boostSlug } = action;
      const duration = boostSlug === 'cryo-o2-stim' ? 3 : 2;

      const nextTimers = { ...(state.activeBoostTimers || {}), [boostSlug]: duration };
      let scoreBonus = 0;
      if (boostSlug === 'emp-jammer') {
        scoreBonus = 150;
      }

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: `💉 Tactical Stim Activated: ${boostSlug.replace(/-/g, ' ').toUpperCase()}`,
        description: `Stimulant online for ${duration} Sols. Performance parameters augmented.`,
        resourceChanges: {},
        scoreEffect: scoreBonus,
        icon: '💉',
      };

      return {
        ...state,
        activeBoostTimers: nextTimers,
        score: state.score + scoreBonus,
        log: [...state.log, logEntry],
      };
    }

    // ── Deploy an Emergency Marketplace Consumable ─────────
    case 'DEPLOY_SUPPLY': {
      if (state.phase !== 'action') return state;
      const { itemSlug } = action;
      const inv = { ...(state.combatInventory || {}) };
      if (!inv[itemSlug] || inv[itemSlug] <= 0) return state;

      inv[itemSlug] -= 1;
      let effects: Partial<Record<ResourceType, number>> = {};
      let moraleGain = 0;
      let itemName = itemSlug;

      if (itemSlug === 'oxygen-canister') {
        effects = { oxygen: 25 };
        itemName = 'Oxygen Canister (+25% O₂)';
      } else if (itemSlug === 'fuel-cell') {
        effects = { power: 25 };
        itemName = 'Hydrogen Fuel Cell (+25% Power)';
      } else if (itemSlug === 'rad-shielding' || itemSlug === 'hull-plating') {
        effects = { shielding: 25 };
        itemName = 'Radiation Shielding (+25% Shield)';
      } else if (itemSlug === 'hydroponic-rations') {
        moraleGain = 20;
        itemName = 'Hydroponic Rations (+20 Morale)';
      } else if (itemSlug === 'emergency-scrubber') {
        effects = { oxygen: 15, shielding: 10 };
        itemName = 'Emergency Scrubber (+15% O₂, +10% Shield)';
      }

      let newState = applyEffects(state, effects, moraleGain);

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: `📦 Emergency Supply Deployed`,
        description: `Consumed ${itemName} directly from Mars Marketplace inventory. Reserves replenished.`,
        resourceChanges: effects,
        moraleChange: moraleGain,
        icon: '📦',
      };

      return {
        ...newState,
        combatInventory: inv,
        log: [...newState.log, logEntry],
      };
    }

    // ── Synchronize loadout from client / APIs ─────────────
    case 'SYNC_LOADOUT': {
      return {
        ...state,
        equippedPet: action.equippedPet !== undefined ? action.equippedPet : state.equippedPet,
        slottedBoosts: action.slottedBoosts !== undefined ? action.slottedBoosts : state.slottedBoosts,
        combatInventory: action.combatInventory !== undefined ? action.combatInventory : state.combatInventory,
      };
    }

    // ── Launch Tactical Sabotage / EW ─────────────────────
    case 'TRIGGER_SABOTAGE': {
      const { slug, paymentType, powerCost = 0, stolenO2 = 0, stolenPower = 0, targetName } = action;
      const cooldownSols = slug === 'supply-intercept' || slug === 'solar-blind' ? 4 : 3;
      const nextCooldowns = { ...(state.sabotageCooldowns || {}) };
      nextCooldowns[slug] = state.sol + cooldownSols;

      let nextPower = state.power;
      if (paymentType === 'power' && powerCost > 0) {
        nextPower = clamp(state.power - powerCost);
      }

      // Supply Intercept siphon bonus: attacker receives +6% O2 and +5% Power
      let nextOxygen = state.oxygen;
      if (slug === 'supply-intercept') {
        nextOxygen = clamp(state.oxygen + (stolenO2 || 6));
        nextPower = clamp(nextPower + (stolenPower || 5));
      }

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'action',
        title: `🛰️ Electronic Warfare Launched: ${slug.toUpperCase()}`,
        description: `Offensive cyber-operation deployed against ${targetName || 'rival outpost'}${
          slug === 'supply-intercept' ? ' (+6% O₂, +5% Power siphoned)' : ''
        }.${paymentType === 'power' ? ` Cost: ${powerCost}⚡` : ' Paid with Mars Credits.'}`,
        resourceChanges: {
          power: slug === 'supply-intercept' ? (paymentType === 'power' ? -powerCost + 5 : 5) : (paymentType === 'power' ? -powerCost : 0),
          oxygen: slug === 'supply-intercept' ? 6 : 0,
        },
        icon: '⚡',
      };

      return {
        ...state,
        power: nextPower,
        oxygen: nextOxygen,
        sabotageCooldowns: nextCooldowns,
        log: [...state.log, logEntry],
      };
    }

    // ── Receive Incoming Hostile Sabotage / EW ─────────────
    case 'RECEIVE_SABOTAGE': {
      const { event } = action;
      const attacker = event.attackerName || 'Rival Commander';
      const debuffs = {
        empJammedSols: state.activeDebuffs?.empJammedSols || 0,
        solarBlindedSols: state.activeDebuffs?.solarBlindedSols || 0,
        spoofedAlertActive: state.activeDebuffs?.spoofedAlertActive || false,
      };

      let newPower = state.power;
      let newOxygen = state.oxygen;
      let newMorale = state.morale;
      let newOverrides = state.commandOverrides ?? 1;
      let injectedEvent = state.activeEvent;

      let logTitle = `🚨 INCOMING HOSTILE OPERATION: ${event.sabotageSlug.toUpperCase()}`;
      let logDesc = `Rival outpost ${attacker} initiated hostile countermeasures.`;
      const resChanges: Partial<Record<ResourceType, number>> = {};

      if (event.sabotageSlug === 'emp-jam') {
        debuffs.empJammedSols = 2;
        newOverrides = 0; // disables command override for 1 Sol
        logTitle = `🚨 EMP TELEMETRY JAM INFLICTED BY ${attacker.toUpperCase()}`;
        logDesc = 'Vital telemetry readouts scrambled with corrupted noise for 2 Sols. Command Override deck re-roll locked for 1 Sol!';
      } else if (event.sabotageSlug === 'supply-intercept') {
        const drainO2 = event.payloadJson?.stolenO2 || 12;
        const drainPower = event.payloadJson?.stolenPower || 10;
        newOxygen = clamp(state.oxygen - drainO2);
        newPower = clamp(state.power - drainPower);
        resChanges.oxygen = -drainO2;
        resChanges.power = -drainPower;
        logTitle = `🚨 ORBITAL SUPPLY INTERCEPT BY ${attacker.toUpperCase()}`;
        logDesc = `Rival drone hacked our supply intake! Siphoned -${drainO2}% Oxygen and -${drainPower}% Power directly from reserves.`;
      } else if (event.sabotageSlug === 'comms-spoof') {
        debuffs.spoofedAlertActive = true;
        newMorale = clamp(state.morale - 10);
        logTitle = `🚨 COMMS SPOOF INCOMING FROM ${attacker.toUpperCase()}`;
        logDesc = 'False NASA DONKI telemetry packet injected into outpost warning systems (-10% Morale).';
        injectedEvent = {
          id: `spoof_${Date.now()}`,
          title: '⚠️ SPOOFED TELEMETRY: Phantom CME Detected',
          description: 'Emergency sirens warning of an extreme X-Class Solar Flare! However, spectral signatures appear artificially spoofed by rival electronic warfare.',
          severity: 3,
          nasaSource: 'FORGED DONKI FEED (HOSTILE COUNTERMEASURE)',
          icon: '📡',
          choices: [
            {
              id: 'fall_for_decoy',
              text: 'Divert Emergency Power to Shields (Fall for Decoy)',
              effects: { power: -15, oxygen: 0, shielding: -5 },
              moraleEffect: -5,
              outcome: 'Shield arrays pulsed uselessly against empty space. Power and capacitors drained by the decoy flare!',
              scienceFact: 'Hostile ECM spoofing exploits radio-frequency vulnerabilities.',
            },
            {
              id: 'identify_spoof',
              text: 'Run Diagnostic & Ignore Decoy (Clear Decoy Alert)',
              effects: { power: 0, oxygen: 0, shielding: 0 },
              moraleEffect: 3,
              outcome: 'Diagnostic confirmed fake magnetic pulse. Alarm silenced and decoy discarded safely.',
              scienceFact: 'Cryptographic authentication prevents telemetry spoofing.',
            },
          ],
        };
      } else if (event.sabotageSlug === 'solar-blind') {
        debuffs.solarBlindedSols = 2;
        logTitle = `🚨 REGOLITH DUST BLIND INFLICTED BY ${attacker.toUpperCase()}`;
        logDesc = 'Laser sweep and rover dust plume coated solar arrays in regolith! Solar power generation reduced by -35% for 2 Sols.';
      }

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: logTitle,
        description: logDesc,
        resourceChanges: resChanges,
        icon: '🚨',
      };

      const candidateState: GameState = {
        ...state,
        power: newPower,
        oxygen: newOxygen,
        morale: newMorale,
        commandOverrides: newOverrides,
        activeDebuffs: debuffs,
        activeEvent: injectedEvent,
        log: [...state.log, logEntry],
      };

      if (checkGameOver(candidateState)) {
        return applyRetryOrGameOver(candidateState, 'sabotage');
      }

      return candidateState;
    }

    case 'CLEAR_SPOOFED_ALERT': {
      return {
        ...state,
        activeDebuffs: {
          ...(state.activeDebuffs || { empJammedSols: 0, solarBlindedSols: 0, spoofedAlertActive: false }),
          spoofedAlertActive: false,
        },
      };
    }

    // ── Trigger a random event ────────────────────────────
    case 'TRIGGER_EVENT': {
      const event: GameEvent = action.event;
      return {
        ...state,
        phase: 'event',
        activeEvent: event,
        usedEventIds: [...state.usedEventIds, event.id],
      };
    }

    // ── Player resolves an event choice ───────────────────
    case 'RESOLVE_EVENT': {
      if (state.phase !== 'event' || !state.activeEvent) return state;

      const choiceId = ('choiceId' in action && action.choiceId ? action.choiceId : action.payload?.id);
      const choice = state.activeEvent.choices.find(
        (c) => c.id === choiceId,
      );
      if (!choice) return state;

      const specialty = state.specialty || 'commander';
      const resolvedEffects = { ...choice.effects };

      // Radiation Physicist perk: -25% shield damage from solar events
      const isSolarEvent = state.activeEvent.id.includes('solar') || state.activeEvent.title.includes('Solar');
      if (specialty === 'physicist' && isSolarEvent && resolvedEffects.shielding < 0) {
        resolvedEffects.shielding = Math.round(resolvedEffects.shielding * 0.75);
      }

      // Lead-Lined Nanogel Stim: 100% radiation / shield damage immunity
      if (isSolarEvent && state.activeBoostTimers?.['lead-lined-nanogel'] && state.activeBoostTimers['lead-lined-nanogel'] > 0) {
        if (resolvedEffects.shielding < 0) resolvedEffects.shielding = 0;
      }

      // Companion Pet flare_warning / storm_early_warning perk: reduces solar radiation damage
      if (isSolarEvent && state.equippedPet?.perkType === 'storm_early_warning' && resolvedEffects.shielding < 0) {
        const radDiscount = Math.min(0.6, (state.equippedPet.perkValue || 20) / 100);
        resolvedEffects.shielding = Math.round(resolvedEffects.shielding * (1 - radDiscount));
      }

      let newState = applyEffects(
        state,
        resolvedEffects,
        choice.moraleEffect ?? 0,
        choice.scoreEffect ?? 0,
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'event',
        title: state.activeEvent.title,
        description: `${choice.text} — ${choice.outcome}`,
        resourceChanges: resolvedEffects,
        moraleChange: choice.moraleEffect,
        icon: state.activeEvent.icon,
      };

      const history = [...(state.telemetryHistory || [])];
      if (history.length > 0) {
        history[history.length - 1] = {
          ...history[history.length - 1],
          eventTitle: state.activeEvent.title,
          eventSeverity: state.activeEvent.severity,
          power: newState.power,
          oxygen: newState.oxygen,
          shielding: newState.shielding,
          morale: newState.morale,
        };
      }

      newState = {
        ...newState,
        log: [...newState.log, logEntry],
        telemetryHistory: history,
        activeEvent: null,
        phase: 'result',
      };

      if (checkGameOver(newState)) {
        return applyRetryOrGameOver(newState, 'depletion');
      }

      return newState;
    }

    // ── Decision window expired: immediate loss in Timed Mode ──
    case 'TRIGGER_TIMEOUT_GAMEOVER': {
      if ((state.retriesRemaining ?? 0) > 0) {
        return applyRetryOrGameOver(state, 'timeout');
      }

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: '⏱️ Decision Window Expired',
        description:
          'Critical life-support collapse: Decision timer hit 0s before countermeasures could be committed. Outpost systems flatlined.',
        resourceChanges: {
          power: -state.power,
          oxygen: -state.oxygen,
          shielding: -state.shielding,
        },
        moraleChange: -state.morale,
        icon: '💥',
      };

      const finalState: GameState = {
        ...state,
        power: 0,
        oxygen: 0,
        shielding: 0,
        morale: 0,
        phase: 'gameover',
        gameOverReason: 'timeout',
        log: [...state.log, logEntry],
      };

      return {
        ...finalState,
        score: calculateScore(finalState),
      };
    }

    // ── Record Rapid Response Bonus for Timed Mode ────────
    case 'RECORD_TIMED_BONUS': {
      return {
        ...state,
        rapidResponseBonus: (state.rapidResponseBonus || 0) + action.bonusPoints,
        score: state.score + action.bonusPoints,
      };
    }

    // ── Update total mission elapsed time ─────────────────
    case 'UPDATE_MISSION_TIME': {
      return {
        ...state,
        missionTimeSeconds: (state.missionTimeSeconds || 0) + action.seconds,
      };
    }

    // ── End the current turn: deplete, maybe event, advance sol ──
    case 'NEXT_SOL':
    case 'END_TURN': {
      if (state.phase !== 'result') return state;

      // 1. Apply passive sol depletion
      let newState = applySolDepletion(state);

      // 2. Check for game over after depletion
      if (checkGameOver(newState)) {
        return applyRetryOrGameOver(newState, 'depletion');
      }

      // 3. Maybe trigger a random event
      const event = generateEvent(newState);
      if (event) {
        return gameReducer(newState, { type: 'TRIGGER_EVENT', event });
      }

      // 4. Advance to next sol
      return gameReducer(newState, { type: 'ADVANCE_SOL' });
    }

    // ── Advance to the next sol ───────────────────────────
    case 'ADVANCE_SOL': {
      const nextSol = state.sol + 1;

      // Check victory (survived past maxSol in standard mission; endless tournament runs until failure)
      if (!state.isEndlessTournament && nextSol > state.maxSol) {
        const finalScore = calculateScore({ ...state, sol: nextSol });
        return {
          ...state,
          sol: nextSol,
          phase: 'victory',
          score: finalScore,
        };
      }

      // Mission Commander perk: +2 morale boost every 5 sols survived
      let moraleBonus = 0;
      let logs = [...state.log];
      if (state.specialty === 'commander' && (nextSol - 1) % 5 === 0 && (nextSol - 1) > 0) {
        moraleBonus = 2;
        logs.push({
          sol: nextSol,
          type: 'system',
          title: '🎖️ Commander Leadership',
          description: `Sol ${nextSol - 1} milestone reached! Commander leadership rallied crew (+2 Morale).`,
          resourceChanges: {},
          moraleChange: 2,
          icon: '🎖️',
        });
      }

      // Companion Pet hull_autorepair perk: Regenerates +2 to +4 Shielding every Sol
      let hullRepairBonus = 0;
      if (state.equippedPet?.perkType === 'hull_autorepair') {
        hullRepairBonus = Math.max(2, Math.min(6, Math.round((state.equippedPet.perkValue || 10) / 3)));
        logs.push({
          sol: nextSol,
          type: 'system',
          title: `🦎 Pet Autorepair: ${state.equippedPet.name || 'Cryo-Gecko'}`,
          description: `Martian bio-sealant foam auto-patched habitat micro-fractures (+${hullRepairBonus} Shielding).`,
          resourceChanges: { shielding: hullRepairBonus },
          icon: state.equippedPet.avatar || '🦎',
        });
      }

      // Companion Pet storm_early_warning perk: Predicts solar flare 1 Sol in advance
      let flareWarningActive = false;
      if (state.equippedPet?.perkType === 'storm_early_warning') {
        const nextSeed = (state.weatherSeed || 424242) + nextSol;
        if (nextSeed % 3 === 0 || nextSol % 4 === 0) {
          flareWarningActive = true;
          logs.push({
            sol: nextSol,
            type: 'system',
            title: `🐛 Tardigrade Bio-Sensor Warning`,
            description: `Severe NASA DONKI solar storm / CME detected incoming at Sol ${nextSol + 1}! Prepare shields.`,
            resourceChanges: {},
            icon: '🐛',
          });
        }
      }

      // Decrement Active Tactical Boost Timers
      const nextBoostTimers: Record<string, number> = {};
      if (state.activeBoostTimers) {
        for (const [slug, rem] of Object.entries(state.activeBoostTimers)) {
          if (rem > 1) {
            nextBoostTimers[slug] = rem - 1;
          } else {
            logs.push({
              sol: nextSol,
              type: 'system',
              title: `💉 Tactical Stim Expired: ${slug.replace(/-/g, ' ').toUpperCase()}`,
              description: `Combat stimulant duration finished. Performance returned to baseline.`,
              resourceChanges: {},
              icon: '⏳',
            });
          }
        }
      }

      // Accrue Pet XP (+15 XP per survived Sol)
      const nextPetXpEarned = (state.petXpEarned || 0) + 15;
      let nextEquippedPet = state.equippedPet
        ? { ...state.equippedPet, xp: (state.equippedPet.xp || 0) + 15 }
        : state.equippedPet;

      const updatedMorale = clamp(state.morale + moraleBonus);
      const updatedShielding = clamp(state.shielding + hullRepairBonus);

      // Decrement Active Debuffs
      const currentEmp = state.activeDebuffs?.empJammedSols || 0;
      const currentBlind = state.activeDebuffs?.solarBlindedSols || 0;
      const nextEmp = Math.max(0, currentEmp - 1);
      const nextBlind = Math.max(0, currentBlind - 1);

      if (currentEmp > 0 && nextEmp === 0) {
        logs.push({
          sol: nextSol,
          type: 'system',
          title: '⚡ EMP Microwave Interference Cleared',
          description: 'Sensor arrays recalibrated. Vital HUD telemetry fully restored and Command Override unlocked.',
          resourceChanges: {},
          icon: '✅',
        });
      }

      if (currentBlind > 0 && nextBlind === 0) {
        logs.push({
          sol: nextSol,
          type: 'system',
          title: '🌪️ Regolith Dust Blown Clear',
          description: 'Atmospheric winds swept dust off solar collectors. Full solar array efficiency restored.',
          resourceChanges: {},
          icon: '☀️',
        });
      }

      // Clean up expired sabotage cooldowns
      const nextSabotageCooldowns: Record<string, number> = {};
      if (state.sabotageCooldowns) {
        for (const [slug, availSol] of Object.entries(state.sabotageCooldowns)) {
          if (availSol > nextSol) {
            nextSabotageCooldowns[slug] = availSol;
          }
        }
      }

      // 1. Clean up expired operation cooldowns
      const nextCooldowns: Record<string, number> = {};
      if (state.operationCooldowns) {
        for (const [opId, expireSol] of Object.entries(state.operationCooldowns)) {
          if (expireSol > nextSol) {
            nextCooldowns[opId] = expireSol;
          }
        }
      }

      // 2. Award 1 Command Override re-roll every 5 Sols survived
      let nextOverrides = state.commandOverrides ?? 1;
      if (nextSol % 5 === 0) {
        nextOverrides += 1;
        logs.push({
          sol: nextSol,
          type: 'system',
          title: '🔄 Command Override Granted',
          description: `Sol ${nextSol} milestone unlocked +1 tactical operations deck re-roll.`,
          resourceChanges: {},
          icon: '🔄',
        });
      }

      // 2b. Apply planetary signature mechanic
      const stateWithPlanetMechanic = applyPlanetarySignatureMechanic({
        ...state,
        sol: nextSol,
        shielding: updatedShielding,
        morale: updatedMorale,
      });

      if (checkGameOver(stateWithPlanetMechanic)) {
        return applyRetryOrGameOver(stateWithPlanetMechanic, 'depletion');
      }

      const mergedLogs = [...logs, ...stateWithPlanetMechanic.log.slice(state.log.length)];
      const finalPower = stateWithPlanetMechanic.power;
      const finalOxygen = stateWithPlanetMechanic.oxygen;
      const finalShielding = stateWithPlanetMechanic.shielding;
      const finalMorale = stateWithPlanetMechanic.morale;

      const newPoint: TelemetryPoint = {
        sol: nextSol,
        power: finalPower,
        oxygen: finalOxygen,
        shielding: finalShielding,
        morale: finalMorale,
      };

      // 3. Draw fresh 5 operations for nextSol
      const candidateNextState: GameState = {
        ...state,
        sol: nextSol,
        power: finalPower,
        oxygen: finalOxygen,
        shielding: finalShielding,
        morale: finalMorale,
        planetMetrics: stateWithPlanetMechanic.planetMetrics,
        frozenActions: stateWithPlanetMechanic.frozenActions,
        isGlitchedEntropy: stateWithPlanetMechanic.isGlitchedEntropy,
        operationCooldowns: nextCooldowns,
        activeBoostTimers: nextBoostTimers,
        equippedPet: nextEquippedPet,
        activeDebuffs: {
          empJammedSols: nextEmp,
          solarBlindedSols: nextBlind,
          spoofedAlertActive: false,
        },
        sabotageCooldowns: nextSabotageCooldowns,
      };
      const drawResult = drawSolOperations(candidateNextState);

      return {
        ...state,
        sol: nextSol,
        power: finalPower,
        oxygen: finalOxygen,
        shielding: finalShielding,
        morale: finalMorale,
        planetMetrics: stateWithPlanetMechanic.planetMetrics,
        frozenActions: stateWithPlanetMechanic.frozenActions,
        isGlitchedEntropy: stateWithPlanetMechanic.isGlitchedEntropy,
        log: mergedLogs,
        telemetryHistory: [...(state.telemetryHistory || []), newPoint],
        phase: 'action',
        operationCooldowns: nextCooldowns,
        activeHand: drawResult.hand.map((c) => c.id),
        hasEmergencyDraw: drawResult.hasEmergencyDraw,
        commandOverrides: nextOverrides,
        lastDrawnSol: nextSol,
        activeBoostTimers: nextBoostTimers,
        equippedPet: nextEquippedPet,
        petXpEarned: nextPetXpEarned,
        solarFlareWarningActive: flareWarningActive,
        activeDebuffs: {
          empJammedSols: nextEmp,
          solarBlindedSols: nextBlind,
          spoofedAlertActive: false,
        },
        sabotageCooldowns: nextSabotageCooldowns,
      };
    }

    case 'SET_BATTLEPASS_ENTITLEMENTS': {
      return {
        ...state,
        isFiveStarGeneral: action.isFiveStarGeneral,
        retriesRemaining: action.retriesRemaining,
      };
    }

    // ── Emergency Sponsor Rations Relief ───────────────────
    case 'APPLY_SPONSOR_RELIEF': {
      if (state.hasUsedSponsorRation) {
        return state;
      }
      const newPower = Math.min(100, state.power + 20);
      const newOxygen = Math.min(100, state.oxygen + 20);
      const newShielding = Math.min(100, state.shielding + 20);

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'system',
        title: '🍔 ARES SPONSOR OVERRIDE',
        description: '🍔 ARES SPONSOR OVERRIDE: Emergency rations delivered courtesy of BK Orbital.',
        resourceChanges: {
          power: newPower - state.power,
          oxygen: newOxygen - state.oxygen,
          shielding: newShielding - state.shielding,
        },
        icon: '🍔',
      };

      const updatedHistory = state.telemetryHistory ? [...state.telemetryHistory] : [];
      if (updatedHistory.length > 0) {
        const lastIdx = updatedHistory.length - 1;
        updatedHistory[lastIdx] = {
          ...updatedHistory[lastIdx],
          power: newPower,
          oxygen: newOxygen,
          shielding: newShielding,
        };
      }

      return {
        ...state,
        power: newPower,
        oxygen: newOxygen,
        shielding: newShielding,
        hasUsedSponsorRation: true,
        log: [logEntry, ...state.log],
        telemetryHistory: updatedHistory,
      };
    }

    // ── Mission voluntarily aborted from Pause Menu ──────────
    case 'ABORT_MISSION': {
      return {
        ...state,
        phase: 'gameover',
        gameOverReason: 'aborted',
      };
    }

    // ── Full reset ────────────────────────────────────────
    case 'RESTART':
    case 'RESET': {
      return createInitialState(
        state.difficulty,
        state.specialty || 'commander',
        state.landingSite || 'jezero',
        {
          cadetId: state.cadetId,
          callsign: state.callsign,
          avatar: state.avatar,
        },
        {
          squadCode: state.squadCode,
          weatherSeed: state.weatherSeed,
        },
        state.isTimedMode,
        undefined,
        {
          isFiveStarGeneral: state.isFiveStarGeneral,
          retriesRemaining: state.isFiveStarGeneral ? 3 : 0,
        },
        state.guild
      );
    }

    default:
      return state;
  }
}
