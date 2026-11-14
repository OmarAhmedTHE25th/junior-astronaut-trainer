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
  isTimedMode?: boolean
): GameState {
  const initialPoint: TelemetryPoint = {
    sol: 1,
    power: INITIAL_RESOURCES.power,
    oxygen: INITIAL_RESOURCES.oxygen,
    shielding: INITIAL_RESOURCES.shielding,
    morale: INITIAL_RESOURCES.morale,
  };

  return {
    sol: 1,
    maxSol: MISSION_LENGTH,
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
    telemetryHistory: [initialPoint],
    cadetId: cadet?.cadetId,
    callsign: cadet?.callsign,
    avatar: cadet?.avatar,
    squadCode: squad?.squadCode,
    weatherSeed: squad?.weatherSeed,
    isTimedMode: Boolean(isTimedMode),
    missionTimeSeconds: 0,
    rapidResponseBonus: 0,
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
 * Check if the mission is won (survived all sols with resources > 0).
 */
export function checkVictory(state: GameState): boolean {
  return state.sol > state.maxSol && !checkGameOver(state);
}

/**
 * Calculate the final score at mission end.
 */
export function calculateScore(state: GameState): number {
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

  // Higher morale slightly reduces depletion; lower morale worsens it
  const effectiveMult = mult / moraleModifier;

  const depletionEffects: Record<ResourceType, number> = {
    power: Math.round(SOL_DEPLETION.power * effectiveMult * site.powerDepletionMod),
    oxygen: Math.round(SOL_DEPLETION.oxygen * effectiveMult * site.oxygenDepletionMod),
    shielding: Math.round(SOL_DEPLETION.shielding * effectiveMult * site.shieldDepletionMod),
  };

  const newState = applyEffects(state, depletionEffects, -1); // morale ticks down slightly

  const logEntry: LogEntry = {
    sol: state.sol,
    type: 'depletion',
    title: 'Sol Depletion',
    description: `Mars atmospheric conditions at ${site.name} take their toll.`,
    resourceChanges: depletionEffects,
    moraleChange: -1,
  };

  return { ...newState, log: [...newState.log, logEntry] };
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
        action.isTimedMode
      );
      return { ...initial, phase: 'action' };
    }

    // ── Load a saved mission ──────────────────────────────
    case 'LOAD_STATE': {
      const gs = action.state;
      return {
        ...gs,
        landingSite: gs.landingSite || 'jezero',
        squadCode: gs.squadCode,
        weatherSeed: gs.weatherSeed,
        isTimedMode: gs.isTimedMode,
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
        return {
          ...newState,
          phase: 'gameover',
          score: calculateScore(newState),
        };
      }

      // Move to the END_TURN phase (which handles depletion + events)
      return { ...newState, phase: 'result' };
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
        return {
          ...newState,
          phase: 'gameover',
          score: calculateScore(newState),
        };
      }

      return newState;
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
        return {
          ...newState,
          phase: 'gameover',
          score: calculateScore(newState),
        };
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

      // Check victory (survived past maxSol)
      if (nextSol > state.maxSol) {
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

      const updatedMorale = clamp(state.morale + moraleBonus);
      const newPoint: TelemetryPoint = {
        sol: nextSol,
        power: state.power,
        oxygen: state.oxygen,
        shielding: state.shielding,
        morale: updatedMorale,
      };

      return {
        ...state,
        sol: nextSol,
        morale: updatedMorale,
        log: logs,
        telemetryHistory: [...(state.telemetryHistory || []), newPoint],
        phase: 'action',
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
        state.isTimedMode
      );
    }

    default:
      return state;
  }
}
