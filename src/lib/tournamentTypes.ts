// ─── Junior Astronaut Mission Trainer – Tournament Types ───
// Strict TypeScript types for Endless Survival Tournament Brackets.

export type TournamentMode = 'solo' | 'squad';
export type TournamentStatus = 'registration' | 'active' | 'completed';
export type MatchStatus = 'pending' | 'live' | 'completed';

export interface Tournament {
  id: string;
  title: string;
  mode: TournamentMode;
  maxEntrants: 4 | 8 | 16;
  status: TournamentStatus;
  currentRound: number;
  totalRounds: number;
  rngSeed: number;
  createdAt: string;
  championId?: string | null;
  championName?: string | null;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  entrantId: string;
  entrantName: string;
  avatar: string;
  seedNumber: number;
  eliminatedInRound: number | null;
  bestSolsSurvived: number;
  bestHoursSurvived: number;
  totalScore: number;
  isBot?: boolean;
}

export interface TournamentBracketMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  roundName: string; // 'Quarterfinals' | 'Semifinals' | 'Championship' etc.
  matchIndex: number;
  entrantAId: string | null;
  entrantBId: string | null;
  entrantAName: string | null;
  entrantBName: string | null;
  entrantAAvatar: string | null;
  entrantBAvatar: string | null;
  entrantASols: number;
  entrantBSols: number;
  entrantAHours: number;
  entrantBHours: number;
  entrantAScore: number;
  entrantBScore: number;
  winnerEntrantId: string | null;
  rngSeed: number;
  status: MatchStatus;
}

export interface RivalTelemetryUpdate {
  matchId: string;
  rivalId: string;
  rivalName: string;
  rivalAvatar: string;
  sol: number;
  hours: number;
  power: number;
  oxygen: number;
  shielding: number;
  morale: number;
  statusText: string;
  isAlive: boolean;
  timestamp: number;
}

export interface TournamentDetails {
  tournament: Tournament;
  participants: TournamentParticipant[];
  matches: TournamentBracketMatch[];
  rounds: {
    roundNumber: number;
    roundName: string;
    matches: TournamentBracketMatch[];
  }[];
}
