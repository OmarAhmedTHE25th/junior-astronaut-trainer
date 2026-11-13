// ─── Junior Astronaut Mission Trainer – Type Definitions ───
// Pure TypeScript types. No React, no DOM.

// ── Resource & Phase Enums ──────────────────────────────────

export type ResourceType = 'power' | 'oxygen' | 'shielding';

export type GamePhase =
  | 'briefing'
  | 'action'
  | 'event'
  | 'result'
  | 'gameover'
  | 'victory';

export type Difficulty = 'cadet' | 'commander' | 'pioneer';

// ── Actions ─────────────────────────────────────────────────

export interface PlayerAction {
  id: string;
  name: string;
  description: string;
  effects: Record<ResourceType, number>;
  /** Bonus / penalty to morale when chosen */
  moraleEffect?: number;
  /** Bonus / penalty to score when chosen */
  scoreEffect?: number;
  /** Emoji shown on the button */
  icon: string;
}

// ── Events & Choices ────────────────────────────────────────

export interface EventChoice {
  id: string;
  text: string;
  effects: Record<ResourceType, number>;
  moraleEffect?: number;
  scoreEffect?: number;
  outcome: string;
  /** Optional real NASA science fact shown after choosing */
  scienceFact?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  /** 1 = minor, 2 = moderate, 3 = severe */
  severity: 1 | 2 | 3;
  choices: EventChoice[];
  /** Real NASA data source attribution */
  nasaSource: string;
  /** Emoji icon for the event card */
  icon?: string;
}

// ── Mission Log ─────────────────────────────────────────────

export type LogEntryType = 'action' | 'event' | 'depletion' | 'system';

export interface LogEntry {
  sol: number;
  type: LogEntryType;
  title: string;
  description: string;
  resourceChanges: Partial<Record<ResourceType, number>>;
  moraleChange?: number;
  icon?: string;
}

// ── Game State ──────────────────────────────────────────────

export interface GameState {
  /** Current sol (Martian day), starts at 1 */
  sol: number;
  /** Mission length in sols */
  maxSol: number;

  // Resources (all clamped 0-100)
  power: number;
  oxygen: number;
  shielding: number;
  morale: number;

  phase: GamePhase;
  log: LogEntry[];

  /** Currently active random event, if any */
  activeEvent: GameEvent | null;

  /** Cumulative mission score */
  score: number;
  /** Set of event IDs already used so they don't repeat */
  usedEventIds: string[];
  /** Chosen difficulty */
  difficulty: Difficulty;
}

// ── Reducer Actions ─────────────────────────────────────────

export type GameAction =
  | { type: 'START_MISSION'; difficulty: Difficulty }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'PERFORM_ACTION'; action?: PlayerAction; payload?: PlayerAction }
  | { type: 'TRIGGER_EVENT'; event: GameEvent }
  | { type: 'RESOLVE_EVENT'; choiceId?: string; payload?: EventChoice }
  | { type: 'ADVANCE_SOL' }
  | { type: 'END_TURN' }
  | { type: 'NEXT_SOL' }
  | { type: 'RESET' }
  | { type: 'RESTART' };

// ── Cadet Profiles & Badges ─────────────────────────────────

export type BadgeId =
  | 'solar_storm_survivor'
  | 'veteran_30_sols'
  | 'mars_pioneer'
  | 'chief_scientist'
  | 'iron_dome';

export interface CadetBadge {
  id: BadgeId;
  name: string;
  icon: string;
  description: string;
  requirement: string;
}

export interface CadetProfile {
  cadetId: string;
  callsign: string;
  avatar: string;
  createdAt: string;
  missionsPlayed: number;
  missionsWon: number;
  totalSolsSurvived: number;
  highestScore: number;
  badges: BadgeId[];
}

// ── Global Leaderboard ──────────────────────────────────────

export interface LeaderboardEntry {
  rank?: number;
  cadetId: string;
  callsign: string;
  avatar: string;
  difficulty: Difficulty;
  solsSurvived: number;
  score: number;
  badgesCount: number;
  timestamp: number;
  verified: boolean;
}

