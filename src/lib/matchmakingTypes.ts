// ─── Junior Astronaut Mission Trainer – Real-Time Squad Matchmaking Types ───
// Strongly typed schema for multiplayer squad matches, matchmaking queue,
// role definitions, and tactical comms.

import type { LandingSiteId } from './types';

export type SquadRole = 'commander' | 'engineer' | 'medic' | 'resource_specialist';

export interface SquadRoleMeta {
  id: SquadRole;
  name: string;
  icon: string;
  badge: string;
  title: string;
  perkDescription: string;
  tacticalActionName: string;
  tacticalActionDescription: string;
  tacticalActionEffects: {
    power: number;
    oxygen: number;
    water: number;
    shielding: number;
    morale: number;
  };
  colorTheme: {
    badgeBg: string;
    badgeText: string;
    border: string;
    accent: string;
  };
}

export const SQUAD_ROLES: Record<SquadRole, SquadRoleMeta> = {
  commander: {
    id: 'commander',
    name: 'Expedition Commander',
    icon: '🎖️',
    badge: 'Commander',
    title: 'Mission Command & Morale',
    perkDescription: '+15% Tactical Morale recovery & -15% crew stress during solar crises',
    tacticalActionName: 'Rally Habitat & Emergency Protocol',
    tacticalActionDescription: 'Broadcast emergency command directives to rally the crew (+12 Morale, -5 Power).',
    tacticalActionEffects: { power: -5, oxygen: 0, water: 0, shielding: 0, morale: 12 },
    colorTheme: {
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-300',
      border: 'border-purple-500/40',
      accent: '#A855F7',
    },
  },
  engineer: {
    id: 'engineer',
    name: 'Systems Engineer',
    icon: '🔧',
    badge: 'Chief Engineer',
    title: 'Reactor & Solar Grid Specialist',
    perkDescription: '+25% Power generation from repairs and -20% power drain',
    tacticalActionName: 'Overcharge Solar Capacitors',
    tacticalActionDescription: 'Divert auxiliary battery banks into main habitat grid (+20 Power, -4 Hull).',
    tacticalActionEffects: { power: 20, oxygen: 0, water: 0, shielding: -4, morale: 0 },
    colorTheme: {
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-300',
      border: 'border-amber-500/40',
      accent: '#F59E0B',
    },
  },
  medic: {
    id: 'medic',
    name: 'Life Support / Medic',
    icon: '🫁',
    badge: 'Life Support',
    title: 'Atmospheric & Biological Lead',
    perkDescription: '+25% Oxygen output and -20% respiratory O₂ consumption',
    tacticalActionName: 'Purge & Scrub Atmospheric Loop',
    tacticalActionDescription: 'Cycle secondary catalytic scrubbers to boost habitat oxygen (+22 Oxygen, -8 Power).',
    tacticalActionEffects: { power: -8, oxygen: 22, water: 0, shielding: 0, morale: 2 },
    colorTheme: {
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-300',
      border: 'border-emerald-500/40',
      accent: '#10B981',
    },
  },
  resource_specialist: {
    id: 'resource_specialist',
    name: 'Resource Specialist',
    icon: '💧',
    badge: 'Resource Lead',
    title: 'Water Recycling & Hull Defenses',
    perkDescription: '+20% Water recycling rate and +25% Hull Shield fortification',
    tacticalActionName: 'Fortify Hull & Condense Water',
    tacticalActionDescription: 'Cycle closed-loop reclamation and polarize outer micrometeorite shielding (+18 Hull, +12 Water, -10 Power).',
    tacticalActionEffects: { power: -10, oxygen: 0, water: 12, shielding: 18, morale: 0 },
    colorTheme: {
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-300',
      border: 'border-cyan-500/40',
      accent: '#06B6D4',
    },
  },
};

export interface SharedHabitatResources {
  power: number;
  oxygen: number;
  water: number;
  shielding: number;
  morale: number;
}

export type QueuePlayerStatus = 'waiting' | 'matched' | 'cancelled';

export interface MatchmakingQueueEntry {
  id: string | number;
  playerId: string;
  playerName: string;
  avatar: string;
  preferredRole: SquadRole;
  status: QueuePlayerStatus;
  matchId?: string;
  joinedAt: number;
  lastPollAt: number;
}

export type SquadMatchStatus = 'waiting' | 'in_progress' | 'completed' | 'failed';

export interface SquadMember {
  id?: number | string;
  matchId: string;
  playerId: string;
  playerName: string;
  avatar: string;
  role: SquadRole;
  isReady: boolean;
  isAlive: boolean;
  isBot?: boolean;
  lastSeenAt: number;
  joinedAt: number;
  lastAction?: {
    actionName: string;
    timestamp: number;
    icon: string;
  };
}

export interface TacticalCommsMessage {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  role: SquadRole;
  avatar: string;
  text: string;
  isQuickPing?: boolean;
  createdAt: number;
}

export interface MatchEvent {
  id: string | number;
  matchId: string;
  playerId: string;
  eventType:
    | 'member_join'
    | 'member_leave'
    | 'role_change'
    | 'ready_toggle'
    | 'action_perform'
    | 'tactical_chat'
    | 'crisis_trigger'
    | 'crisis_resolve'
    | 'sol_advance'
    | 'match_start'
    | 'match_end';
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface SquadMatch {
  id: string;
  joinCode: string;
  status: SquadMatchStatus;
  currentSol: number;
  maxSol: number;
  sharedResources: SharedHabitatResources;
  activeEvent: {
    id: string;
    title: string;
    description: string;
    severity: 1 | 2 | 3;
    nasaSource?: string;
    choices?: Array<{
      id: string;
      text: string;
      outcome: string;
    }>;
  } | null;
  weatherSeed: number;
  landingZone: LandingSiteId;
  members: SquadMember[];
  events?: MatchEvent[];
  comms?: TacticalCommsMessage[];
  countdownStartedAt?: number | null;
  createdAt: string;
  updatedAt: string;
}
