import type { PlanetId } from './planetCartridges';

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
  scoreEffect?: number;
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
  /** Chosen astronaut specialty */
  specialty?: CadetSpecialty;
  /** Chosen landing site on Mars */
  landingSite?: LandingSiteId;
  /** Sol-by-sol telemetry history for analytics curves */
  telemetryHistory?: TelemetryPoint[];
  /** Cadet who owns this mission run */
  cadetId?: string;
  callsign?: string;
  avatar?: string;
  /** Active Competitive Squad Room code (if in squad race) */
  squadCode?: string;
  /** Deterministic weather seed for synchronized DONKI events across squad */
  weatherSeed?: number;
  /** Whether Timed Crisis Mode is active (15s decision countdown per Sol) */
  isTimedMode?: boolean;
  /** Active mission elapsed time in seconds */
  missionTimeSeconds?: number;
  /** Accumulated Rapid Response Bonus points from fast decisions */
  rapidResponseBonus?: number;
  /** Reason for game over if defeated */
  gameOverReason?: 'timeout' | 'depletion' | 'aborted' | string;
  /** Whether Endless Survival Tournament Mode is active (no 30-sol cap) */
  isEndlessTournament?: boolean;
  /** Active tournament bracket and match identifiers */
  tournamentId?: string;
  tournamentMatchId?: string;
  tournamentRngSeed?: number;
  rivalCallsign?: string;
  rivalAvatar?: string;
  /** Active 5-card operations hand for the current sol */
  activeHand?: string[];
  /** Sols at which used operations become available again: { [operationId]: availableSol } */
  operationCooldowns?: Record<string, number>;
  /** Remaining Command Override re-rolls */
  commandOverrides?: number;
  /** Sol on which the hand was last drawn */
  lastDrawnSol?: number;
  /** Whether the current hand includes an emergency crisis draw */
  hasEmergencyDraw?: boolean;
  /** Total command overrides used in this run */
  totalOverridesUsed?: number;
  /** Active equipped Companion Pet snapshot */
  equippedPet?: {
    id: string;
    petSlug: string;
    nickname?: string;
    name: string;
    avatar: string;
    level: number;
    xp: number;
    perkType: string;
    perkValue: number;
  } | null;
  /** Slotted pre-drop tactical stim boosts (up to 3) */
  slottedBoosts?: string[];
  /** Active boost timers: { [boostSlug]: solsRemaining } */
  activeBoostTimers?: Record<string, number>;
  /** Marketplace consumable inventory: { [itemSlug]: quantity } */
  combatInventory?: Record<string, number>;
  /** Accumulated Pet XP earned during this mission */
  petXpEarned?: number;
  /** Mars Credits awarded at end of mission */
  marsCreditsEarned?: number;
  /** Whether a solar flare pre-warning is active from pet */
  solarFlareWarningActive?: boolean;
  /** Active debuffs inflicted by rival electronic warfare or sabotage */
  activeDebuffs?: {
    empJammedSols: number;
    solarBlindedSols: number;
    spoofedAlertActive: boolean;
  };
  /** Sabotage operation cooldown availability sols: { [sabotageSlug]: availableSol } */
  sabotageCooldowns?: Record<string, number>;
  /** Five-Star General VIP status */
  isFiveStarGeneral?: boolean;
  /** Emergency Life-Support retries remaining for this mission (max 3 for Five-Star General) */
  retriesRemaining?: number;
  /** Active Orbital Guild & Alliance information */
  guild?: {
    guildId: string;
    tag: string;
    buffLevel: number;
    name?: string;
  } | null;
  /** Whether emergency sponsor rations were consumed during this mission (max 1 use) */
  hasUsedSponsorRation?: boolean;
  /** Active planetary cartridge */
  planetId?: PlanetId;
  /** Custom dynamic planetary metrics for slots 3 & 4 (e.g. altitude, coreTemp, radLoad, etc.) */
  planetMetrics?: Record<string, number>;
  /** Frozen action IDs (e.g. Uranus cryo-hydraulics freeze mechanic) */
  frozenActions?: string[];
  /** Whether HUD display text / metrics are glitched by high quantum entropy (Planet X) */
  isGlitchedEntropy?: boolean;
}

export * from './planetCartridges';
export * from './tournamentTypes';
export * from './marketplaceTypes';
export * from './battleRoyaleTypes';
export * from './sabotageTypes';

// ── Reducer Actions ─────────────────────────────────────────

export type GameAction =
  | {
      type: 'START_MISSION';
      difficulty: Difficulty;
      specialty?: CadetSpecialty;
      landingSite?: LandingSiteId;
      planetId?: PlanetId;
      cadet?: { cadetId?: string; callsign?: string; avatar?: string };
      squad?: { squadCode?: string; weatherSeed?: number };
      isTimedMode?: boolean;
    }
  | { type: 'LOAD_STATE'; state: GameState }
  | { type: 'PERFORM_ACTION'; action?: PlayerAction; payload?: PlayerAction }
  | { type: 'EXECUTE_PLANET_ACTION'; actionId: string }
  | {
      type: 'PERFORM_OPERATION';
      operationId: string;
      activePetId?: string;
      activeBoosts?: string[];
    }
  | { type: 'COMMAND_OVERRIDE' }
  | { type: 'ACTIVATE_BOOST'; boostSlug: string }
  | { type: 'DEPLOY_SUPPLY'; itemSlug: string }
  | {
      type: 'SYNC_LOADOUT';
      equippedPet?: GameState['equippedPet'];
      slottedBoosts?: string[];
      combatInventory?: Record<string, number>;
    }
  | {
      type: 'TRIGGER_SABOTAGE';
      slug: string;
      paymentType: 'power' | 'mc';
      powerCost?: number;
      stolenO2?: number;
      stolenPower?: number;
      targetName?: string;
    }
  | {
      type: 'RECEIVE_SABOTAGE';
      event: {
        id: string;
        attackerName: string;
        attackerAvatar?: string;
        sabotageSlug: string;
        payloadJson?: {
          stolenO2?: number;
          stolenPower?: number;
          damage?: number;
          customNote?: string;
        };
      };
    }
  | { type: 'CLEAR_SPOOFED_ALERT' }
  | { type: 'TRIGGER_EVENT'; event: GameEvent }
  | { type: 'RESOLVE_EVENT'; choiceId?: string; payload?: EventChoice }
  | { type: 'TRIGGER_TIMEOUT_GAMEOVER' }
  | { type: 'RECORD_TIMED_BONUS'; bonusPoints: number }
  | { type: 'UPDATE_MISSION_TIME'; seconds: number }
  | { type: 'ADVANCE_SOL' }
  | {
      type: 'SET_BATTLEPASS_ENTITLEMENTS';
      isFiveStarGeneral: boolean;
      retriesRemaining: number;
    }
  | { type: 'END_TURN' }
  | { type: 'NEXT_SOL' }
  | { type: 'RESET' }
  | { type: 'RESTART' }
  | { type: 'ABORT_MISSION' }
  | { type: 'APPLY_SPONSOR_RELIEF' }
  | {
      type: 'COMPLETE_MINIGAME';
      victory: boolean;
      score: number;
      solsCompleted?: number;
      summaryLog?: string;
    };

// ── Martian & Planetary Landing Sites ───────────────────────

export type LandingSiteId = 'jezero' | 'gale' | 'olympus' | (string & {});

export interface LandingSite {
  id: LandingSiteId;
  name: string;
  roverMission: string;
  lat: number;
  lon: number;
  elevation: string;
  description: string;
  perksSummary: string;
  powerGainMod: number;
  powerDepletionMod: number;
  oxygenDepletionMod: number;
  shieldDepletionMod: number;
  researchScoreBonus: number;
  pinColor: string;
}

// ── Sol Telemetry History ───────────────────────────────────

export interface TelemetryPoint {
  sol: number;
  power: number;
  oxygen: number;
  shielding: number;
  morale: number;
  eventTitle?: string;
  eventSeverity?: number;
}

// ── Live NASA Space Weather ─────────────────────────────────

export interface LiveSpaceWeatherEvent {
  id: string;
  type: 'FLARE' | 'CME';
  classType: string;
  peakTime: string;
  sourceLocation: string;
  intensity: number;
  summary: string;
  link: string;
  isLive: boolean;
  radiationImpact?: string;
}

// ── Cadet Profiles, Specialties & Badges ────────────────────

export type CadetSpecialty = 'engineer' | 'biologist' | 'physicist' | 'commander';

export interface SpecialtyMeta {
  id: CadetSpecialty;
  name: string;
  icon: string;
  title: string;
  perkDescription: string;
  badge: string;
  color: string;
}

export const SPECIALTY_METAS: SpecialtyMeta[] = [
  {
    id: 'engineer',
    name: 'Systems Engineer',
    icon: '🔧',
    title: 'Systems & Power Specialist',
    perkDescription: '+20% power gain from Solar Panel Repair & Resource Conservation',
    badge: 'Power Tech',
    color: 'bg-slate-900 border-amber-500/40 text-amber-300'
  },
  {
    id: 'biologist',
    name: 'Astrobiologist',
    icon: '🌱',
    title: 'Life Support & Ecology Lead',
    perkDescription: '+25% oxygen and morale recovery from O₂ Generators & Hydroponics',
    badge: 'Bio Lead',
    color: 'bg-slate-900 border-emerald-500/40 text-emerald-300'
  },
  {
    id: 'physicist',
    name: 'Radiation Physicist',
    icon: '🛡️',
    title: 'Magnetosphere & Defense Officer',
    perkDescription: '+20% shielding boost from Boost Shields & -25% shield damage from solar storms',
    badge: 'Shield Officer',
    color: 'bg-slate-900 border-cyan-500/40 text-cyan-300'
  },
  {
    id: 'commander',
    name: 'Mission Commander',
    icon: '🎖️',
    title: 'Expedition Commander',
    perkDescription: '+15% science score bonus on Research Missions & +2 morale every 5 sols survived',
    badge: 'Commander',
    color: 'bg-slate-900 border-cyan-400/50 text-cyan-200'
  }
];

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
  specialty: CadetSpecialty;
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

// ── Competitive Squad Race Mode ─────────────────────────────

export interface SquadCadetState {
  cadetId: string;
  callsign: string;
  avatar?: string;
  specialty?: CadetSpecialty;
  sol: number;
  power: number;
  oxygen: number;
  shielding: number;
  morale: number;
  score: number;
  alive: boolean;
  updatedAt: number;
}

export type SquadRoomStatus = 'LOBBY' | 'ACTIVE' | 'FINISHED';

export interface SquadRoom {
  roomCode: string;
  landingZone: LandingSiteId;
  weatherSeed: number;
  status: SquadRoomStatus;
  cadets: SquadCadetState[];
  createdAt: string;
  isTimedMode?: boolean;
}

export * from './matchmakingTypes';


