// ─── Junior Astronaut Mission Trainer – Game Engine (Pure Reducer) ───
// Pure functions. No React, no DOM.

import type {
  GameState,
  GameAction,
  GameEvent,
  Difficulty,
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
 * Create the initial game state for a given difficulty.
 */
export function createInitialState(difficulty: Difficulty = 'commander'): GameState {
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

  // Higher morale slightly reduces depletion; lower morale worsens it
  const effectiveMult = mult / moraleModifier;

  const depletionEffects: Record<ResourceType, number> = {
    power: Math.round(SOL_DEPLETION.power * effectiveMult),
    oxygen: Math.round(SOL_DEPLETION.oxygen * effectiveMult),
    shielding: Math.round(SOL_DEPLETION.shielding * effectiveMult),
  };

  const newState = applyEffects(state, depletionEffects, -1); // morale ticks down slightly

  const logEntry: LogEntry = {
    sol: state.sol,
    type: 'depletion',
    title: 'Sol Depletion',
    description: 'Mars takes its toll — resources naturally deplete each sol.',
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
      const initial = createInitialState(action.difficulty);
      return { ...initial, phase: 'action' };
    }

    // ── Player performs an action ─────────────────────────
    case 'PERFORM_ACTION': {
      if (state.phase !== 'action') return state;

      const playerAction = ('action' in action && action.action ? action.action : action.payload);
      if (!playerAction) return state;

      const moraleModifier = getMoraleModifier(state.morale);

      // Scale positive effects by morale modifier
      const scaledEffects: Record<ResourceType, number> = {
        power: playerAction.effects.power > 0
          ? Math.round(playerAction.effects.power * moraleModifier)
          : playerAction.effects.power,
        oxygen: playerAction.effects.oxygen > 0
          ? Math.round(playerAction.effects.oxygen * moraleModifier)
          : playerAction.effects.oxygen,
        shielding: playerAction.effects.shielding > 0
          ? Math.round(playerAction.effects.shielding * moraleModifier)
          : playerAction.effects.shielding,
      };

      let newState = applyEffects(
        state,
        scaledEffects,
        playerAction.moraleEffect ?? 0,
        playerAction.scoreEffect ?? 0,
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'action',
        title: playerAction.name,
        description: playerAction.description,
        resourceChanges: scaledEffects,
        moraleChange: playerAction.moraleEffect,
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

      let newState = applyEffects(
        state,
        choice.effects,
        choice.moraleEffect ?? 0,
        choice.scoreEffect ?? 0,
      );

      const logEntry: LogEntry = {
        sol: state.sol,
        type: 'event',
        title: state.activeEvent.title,
        description: `${choice.text} — ${choice.outcome}`,
        resourceChanges: choice.effects,
        moraleChange: choice.moraleEffect,
      };

      newState = {
        ...newState,
        log: [...newState.log, logEntry],
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

      return {
        ...state,
        sol: nextSol,
        phase: 'action',
      };
    }

    // ── Full reset ────────────────────────────────────────
    case 'RESTART':
    case 'RESET': {
      return createInitialState(state.difficulty);
    }

    default:
      return state;
  }
}
