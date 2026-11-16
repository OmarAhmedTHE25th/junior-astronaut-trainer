// ─── Junior Astronaut Mission Trainer – Tournament Bracket Engine ───
// Neon Serverless PostgreSQL with atomic bracket generation, single-elimination progression,
// and in-memory fallback for local/offline environments.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getConnectionString } from './storageAdapter';
import type {
  Tournament,
  TournamentParticipant,
  TournamentBracketMatch,
  TournamentDetails,
  TournamentMode,
} from './tournamentTypes';
import { calculateTournamentScore } from './survivalEngine';

// NASA AI Bots Pool for tournament backfill
const NASA_TOURNAMENT_BOTS = [
  { id: 'bot-perseverance', name: 'BOT-PERSEVERANCE', avatar: '🤖' },
  { id: 'bot-ingenuity', name: 'BOT-INGENUITY', avatar: '🚁' },
  { id: 'bot-curiosity', name: 'BOT-CURIOSITY', avatar: '📡' },
  { id: 'bot-opportunity', name: 'BOT-OPPORTUNITY', avatar: '☀️' },
  { id: 'bot-spirit', name: 'BOT-SPIRIT', avatar: '🧗' },
  { id: 'bot-sojourner', name: 'BOT-SOJOURNER', avatar: '🚙' },
  { id: 'bot-viking', name: 'BOT-VIKING-1', avatar: '🛰️' },
  { id: 'bot-pathfinder', name: 'BOT-PATHFINDER', avatar: '🚀' },
  { id: 'bot-odyssey', name: 'BOT-ODYSSEY', avatar: '🔭' },
  { id: 'bot-mro', name: 'BOT-MRO', avatar: '🛰️' },
  { id: 'bot-maven', name: 'BOT-MAVEN', avatar: '🪐' },
  { id: 'bot-phoenix', name: 'BOT-PHOENIX', avatar: '❄️' },
  { id: 'bot-insight', name: 'BOT-INSIGHT', avatar: ' seism' },
  { id: 'bot-mariner', name: 'BOT-MARINER', avatar: '🛸' },
  { id: 'bot-artemis', name: 'BOT-ARTEMIS', avatar: '🌙' },
  { id: 'bot-orion', name: 'BOT-ORION', avatar: '👨‍🚀' },
];

// In-Memory Fallback Store (when DATABASE_URL is not set)
interface MemoryTournamentStore {
  tournaments: Map<string, Tournament>;
  participants: Map<string, TournamentParticipant[]>;
  matches: Map<string, TournamentBracketMatch[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_tournament_store__: MemoryTournamentStore | undefined;
  // eslint-disable-next-line no-var
  var __jat_tournament_schema_ready__: boolean | undefined;
}

function getMemoryStore(): MemoryTournamentStore {
  if (!globalThis.__jat_tournament_store__) {
    globalThis.__jat_tournament_store__ = {
      tournaments: new Map(),
      participants: new Map(),
      matches: new Map(),
    };
  }
  return globalThis.__jat_tournament_store__;
}

async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;

  try {
    const sql = neon(connStr);
    await ensureTournamentSchema(sql);
    return sql;
  } catch (err) {
    console.warn('PostgreSQL unavailable, falling back to memory tournament store:', err);
    return null;
  }
}

/**
 * Idempotent Neon PostgreSQL schema migration for Tournament Brackets.
 */
export async function ensureTournamentSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_tournament_schema_ready__) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR(64) PRIMARY KEY,
        title TEXT NOT NULL,
        mode VARCHAR(16) NOT NULL DEFAULT 'solo',
        max_entrants INT NOT NULL DEFAULT 8,
        status VARCHAR(16) NOT NULL DEFAULT 'registration',
        current_round INT NOT NULL DEFAULT 1,
        total_rounds INT NOT NULL DEFAULT 3,
        rng_seed INT NOT NULL,
        champion_id TEXT,
        champion_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id VARCHAR(64) PRIMARY KEY,
        tournament_id VARCHAR(64) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        entrant_id TEXT NOT NULL,
        entrant_name TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '👨‍🚀',
        seed_number INT NOT NULL,
        eliminated_in_round INT,
        best_sols_survived INT NOT NULL DEFAULT 0,
        best_hours_survived INT NOT NULL DEFAULT 0,
        total_score INT NOT NULL DEFAULT 0,
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS tournament_bracket_matches (
        id VARCHAR(64) PRIMARY KEY,
        tournament_id VARCHAR(64) NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
        round_number INT NOT NULL,
        round_name TEXT NOT NULL,
        match_index INT NOT NULL,
        entrant_a_id TEXT,
        entrant_b_id TEXT,
        entrant_a_name TEXT,
        entrant_b_name TEXT,
        entrant_a_avatar TEXT,
        entrant_b_avatar TEXT,
        entrant_a_sols INT NOT NULL DEFAULT 0,
        entrant_b_sols INT NOT NULL DEFAULT 0,
        entrant_a_hours INT NOT NULL DEFAULT 0,
        entrant_b_hours INT NOT NULL DEFAULT 0,
        entrant_a_score INT NOT NULL DEFAULT 0,
        entrant_b_score INT NOT NULL DEFAULT 0,
        winner_entrant_id TEXT,
        rng_seed INT NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tournament_matches ON tournament_bracket_matches(tournament_id, round_number);
    `;

    globalThis.__jat_tournament_schema_ready__ = true;
  } catch (err) {
    console.error('Failed to create tournament tables in Neon PostgreSQL:', err);
    throw err;
  }
}

/**
 * Standard Single-Elimination Seed Pairings:
 * 4 entrants:  [1, 4], [2, 3]
 * 8 entrants:  [1, 8], [4, 5], [2, 7], [3, 6]
 * 16 entrants: [1, 16], [8, 9], [4, 13], [5, 12], [2, 15], [7, 10], [3, 14], [6, 11]
 */
function getSeedPairings(size: 4 | 8 | 16): [number, number][] {
  if (size === 4) {
    return [
      [1, 4],
      [2, 3],
    ];
  }
  if (size === 8) {
    return [
      [1, 8],
      [4, 5],
      [2, 7],
      [3, 6],
    ];
  }
  return [
    [1, 16],
    [8, 9],
    [4, 13],
    [5, 12],
    [2, 15],
    [7, 10],
    [3, 14],
    [6, 11],
  ];
}

function getRoundName(roundNumber: number, totalRounds: number): string {
  const remaining = totalRounds - roundNumber + 1;
  if (remaining === 1) return 'Championship Final';
  if (remaining === 2) return 'Semifinals';
  if (remaining === 3) return 'Quarterfinals';
  if (remaining === 4) return 'Round of 16';
  return `Round ${roundNumber}`;
}

/**
 * 1. Create a New Tournament
 */
export async function createTournament(options: {
  title: string;
  mode?: TournamentMode;
  maxEntrants?: 4 | 8 | 16;
  creatorId: string;
  creatorName: string;
  creatorAvatar?: string;
}): Promise<TournamentDetails> {
  const id = `tourn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const title = options.title.trim() || 'Mars Endurance Championship 2026';
  const mode: TournamentMode = options.mode || 'solo';
  const maxEntrants: 4 | 8 | 16 = options.maxEntrants || 8;
  const totalRounds = Math.log2(maxEntrants);
  const rngSeed = Math.floor(Math.random() * 900000) + 100000;
  const createdAt = new Date().toISOString();

  const tournament: Tournament = {
    id,
    title,
    mode,
    maxEntrants,
    status: 'registration',
    currentRound: 1,
    totalRounds,
    rngSeed,
    createdAt,
  };

  const creatorParticipant: TournamentParticipant = {
    id: `tp-${Date.now()}-1`,
    tournamentId: id,
    entrantId: options.creatorId,
    entrantName: options.creatorName,
    avatar: options.creatorAvatar || '👨‍🚀',
    seedNumber: 1,
    eliminatedInRound: null,
    bestSolsSurvived: 0,
    bestHoursSurvived: 0,
    totalScore: 0,
    isBot: false,
  };

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      INSERT INTO tournaments (
        id, title, mode, max_entrants, status, current_round, total_rounds, rng_seed, created_at
      ) VALUES (
        ${tournament.id}, ${tournament.title}, ${tournament.mode}, ${tournament.maxEntrants},
        ${tournament.status}, ${tournament.currentRound}, ${tournament.totalRounds}, ${tournament.rngSeed},
        ${tournament.createdAt}
      );
    `;

    await sql`
      INSERT INTO tournament_participants (
        id, tournament_id, entrant_id, entrant_name, avatar, seed_number, is_bot
      ) VALUES (
        ${creatorParticipant.id}, ${creatorParticipant.tournamentId}, ${creatorParticipant.entrantId},
        ${creatorParticipant.entrantName}, ${creatorParticipant.avatar}, ${creatorParticipant.seedNumber},
        ${creatorParticipant.isBot}
      );
    `;
  } else {
    const mem = getMemoryStore();
    mem.tournaments.set(id, tournament);
    mem.participants.set(id, [creatorParticipant]);
    mem.matches.set(id, []);
  }

  return getTournamentDetails(id);
}

/**
 * 2. Join a Tournament
 */
export async function joinTournament(
  tournamentId: string,
  entrant: {
    entrantId: string;
    entrantName: string;
    avatar?: string;
  }
): Promise<TournamentDetails> {
  const details = await getTournamentDetails(tournamentId);
  if (!details) throw new Error('Tournament not found');

  if (details.tournament.status !== 'registration') {
    throw new Error('Tournament is no longer accepting registrations');
  }

  // Check if entrant is already registered
  const existing = details.participants.find((p) => p.entrantId === entrant.entrantId);
  if (existing) {
    return details;
  }

  if (details.participants.length >= details.tournament.maxEntrants) {
    throw new Error('Tournament roster is full');
  }

  const nextSeed = details.participants.length + 1;
  const participant: TournamentParticipant = {
    id: `tp-${Date.now()}-${nextSeed}`,
    tournamentId,
    entrantId: entrant.entrantId,
    entrantName: entrant.entrantName,
    avatar: entrant.avatar || '👨‍🚀',
    seedNumber: nextSeed,
    eliminatedInRound: null,
    bestSolsSurvived: 0,
    bestHoursSurvived: 0,
    totalScore: 0,
    isBot: false,
  };

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      INSERT INTO tournament_participants (
        id, tournament_id, entrant_id, entrant_name, avatar, seed_number, is_bot
      ) VALUES (
        ${participant.id}, ${participant.tournamentId}, ${participant.entrantId},
        ${participant.entrantName}, ${participant.avatar}, ${participant.seedNumber},
        ${participant.isBot}
      );
    `;
  } else {
    const mem = getMemoryStore();
    const list = mem.participants.get(tournamentId) || [];
    list.push(participant);
    mem.participants.set(tournamentId, list);
  }

  // If now reached capacity, auto-start
  if (details.participants.length + 1 >= details.tournament.maxEntrants) {
    await startTournament(tournamentId);
  }

  return getTournamentDetails(tournamentId);
}

/**
 * 3. Start Tournament (Backfills remaining slots with NASA Bots and generates bracket tree)
 */
export async function startTournament(tournamentId: string): Promise<TournamentDetails> {
  const details = await getTournamentDetails(tournamentId);
  if (!details) throw new Error('Tournament not found');

  let participants = [...details.participants];
  const max = details.tournament.maxEntrants;

  // Backfill with AI Bots if starting under-capacity
  if (participants.length < max) {
    let botIndex = 0;
    while (participants.length < max) {
      const bot = NASA_TOURNAMENT_BOTS[botIndex % NASA_TOURNAMENT_BOTS.length];
      botIndex++;
      const nextSeed = participants.length + 1;
      const botParticipant: TournamentParticipant = {
        id: `tp-bot-${Date.now()}-${nextSeed}`,
        tournamentId,
        entrantId: `${bot.id}-${nextSeed}`,
        entrantName: bot.name,
        avatar: bot.avatar,
        seedNumber: nextSeed,
        eliminatedInRound: null,
        bestSolsSurvived: 0,
        bestHoursSurvived: 0,
        totalScore: 0,
        isBot: true,
      };
      participants.push(botParticipant);
    }

    const sql = await getSqlClient();
    if (sql) {
      for (const p of participants) {
        if (p.isBot) {
          await sql`
            INSERT INTO tournament_participants (
              id, tournament_id, entrant_id, entrant_name, avatar, seed_number, is_bot
            ) VALUES (
              ${p.id}, ${p.tournamentId}, ${p.entrantId}, ${p.entrantName},
              ${p.avatar}, ${p.seedNumber}, TRUE
            );
          `;
        }
      }
    }
  }

  // Generate Bracket Tree
  const totalRounds = details.tournament.totalRounds;
  const matches: TournamentBracketMatch[] = [];
  const pairings = getSeedPairings(max);

  // Round 1 Matches
  for (let mIdx = 0; mIdx < pairings.length; mIdx++) {
    const [seedA, seedB] = pairings[mIdx];
    const pA = participants.find((p) => p.seedNumber === seedA);
    const pB = participants.find((p) => p.seedNumber === seedB);

    const matchId = `match-r1-m${mIdx}-${tournamentId.slice(-6)}`;
    const roundSeed = (details.tournament.rngSeed + 100 * 1 + mIdx * 17) & 0x7fffffff;

    matches.push({
      id: matchId,
      tournamentId,
      roundNumber: 1,
      roundName: getRoundName(1, totalRounds),
      matchIndex: mIdx,
      entrantAId: pA ? pA.entrantId : null,
      entrantBId: pB ? pB.entrantId : null,
      entrantAName: pA ? pA.entrantName : null,
      entrantBName: pB ? pB.entrantName : null,
      entrantAAvatar: pA ? pA.avatar : null,
      entrantBAvatar: pB ? pB.avatar : null,
      entrantASols: 0,
      entrantBSols: 0,
      entrantAHours: 0,
      entrantBHours: 0,
      entrantAScore: 0,
      entrantBScore: 0,
      winnerEntrantId: null,
      rngSeed: roundSeed,
      status: 'live',
    });
  }

  // Subsequent Placeholder Rounds (Round 2 to Final)
  let prevRoundMatchesCount = pairings.length;
  for (let r = 2; r <= totalRounds; r++) {
    const currentRoundMatchesCount = prevRoundMatchesCount / 2;
    for (let mIdx = 0; mIdx < currentRoundMatchesCount; mIdx++) {
      const matchId = `match-r${r}-m${mIdx}-${tournamentId.slice(-6)}`;
      const roundSeed = (details.tournament.rngSeed + 100 * r + mIdx * 23) & 0x7fffffff;

      matches.push({
        id: matchId,
        tournamentId,
        roundNumber: r,
        roundName: getRoundName(r, totalRounds),
        matchIndex: mIdx,
        entrantAId: null,
        entrantBId: null,
        entrantAName: null,
        entrantBName: null,
        entrantAAvatar: null,
        entrantBAvatar: null,
        entrantASols: 0,
        entrantBSols: 0,
        entrantAHours: 0,
        entrantBHours: 0,
        entrantAScore: 0,
        entrantBScore: 0,
        winnerEntrantId: null,
        rngSeed: roundSeed,
        status: 'pending',
      });
    }
    prevRoundMatchesCount = currentRoundMatchesCount;
  }

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      UPDATE tournaments
      SET status = 'active', current_round = 1
      WHERE id = ${tournamentId};
    `;

    for (const m of matches) {
      await sql`
        INSERT INTO tournament_bracket_matches (
          id, tournament_id, round_number, round_name, match_index,
          entrant_a_id, entrant_b_id, entrant_a_name, entrant_b_name,
          entrant_a_avatar, entrant_b_avatar, winner_entrant_id,
          rng_seed, status
        ) VALUES (
          ${m.id}, ${m.tournamentId}, ${m.roundNumber}, ${m.roundName}, ${m.matchIndex},
          ${m.entrantAId}, ${m.entrantBId}, ${m.entrantAName}, ${m.entrantBName},
          ${m.entrantAAvatar}, ${m.entrantBAvatar}, ${m.winnerEntrantId},
          ${m.rngSeed}, ${m.status}
        );
      `;
    }
  } else {
    const mem = getMemoryStore();
    const t = mem.tournaments.get(tournamentId);
    if (t) {
      t.status = 'active';
      t.currentRound = 1;
      mem.tournaments.set(tournamentId, t);
    }
    mem.participants.set(tournamentId, participants);
    mem.matches.set(tournamentId, matches);
  }

  return getTournamentDetails(tournamentId);
}

/**
 * 4. Report Match Result & Advance Bracket
 */
export async function reportMatchResult(options: {
  tournamentId: string;
  matchId: string;
  entrantId: string;
  solsSurvived: number;
  hoursSurvived: number;
  resources: { power: number; oxygen: number; shielding: number; morale: number };
}): Promise<TournamentDetails> {
  const details = await getTournamentDetails(options.tournamentId);
  if (!details) throw new Error('Tournament not found');

  const match = details.matches.find((m) => m.id === options.matchId);
  if (!match) throw new Error('Match not found');

  const isEntrantA = match.entrantAId === options.entrantId;
  const isEntrantB = match.entrantBId === options.entrantId;
  if (!isEntrantA && !isEntrantB) {
    throw new Error('Entrant is not part of this match');
  }

  const score = calculateTournamentScore(
    options.solsSurvived,
    options.hoursSurvived,
    options.resources
  );

  // If opponent is a bot and hasn't played, auto-simulate the bot's score using the match seed
  let bSols = match.entrantBSols;
  let bHours = match.entrantBHours;
  let bScore = match.entrantBScore;
  let aSols = match.entrantASols;
  let aHours = match.entrantAHours;
  let aScore = match.entrantAScore;

  if (isEntrantA) {
    aSols = options.solsSurvived;
    aHours = options.hoursSurvived;
    aScore = score;

    const opponent = details.participants.find((p) => p.entrantId === match.entrantBId);
    if (opponent && opponent.isBot && bSols === 0) {
      // Deterministic bot outcome
      const prng = (match.rngSeed * 9301 + 49297) % 233280;
      bSols = 32 + (prng % 35);
      bHours = prng % 24;
      bScore = calculateTournamentScore(bSols, bHours, {
        power: 10 + (prng % 30),
        oxygen: 8 + (prng % 25),
        shielding: 12 + (prng % 20),
        morale: 40,
      });
    }
  } else {
    bSols = options.solsSurvived;
    bHours = options.hoursSurvived;
    bScore = score;

    const opponent = details.participants.find((p) => p.entrantId === match.entrantAId);
    if (opponent && opponent.isBot && aSols === 0) {
      const prng = (match.rngSeed * 9301 + 49297) % 233280;
      aSols = 32 + (prng % 35);
      aHours = prng % 24;
      aScore = calculateTournamentScore(aSols, aHours, {
        power: 10 + (prng % 30),
        oxygen: 8 + (prng % 25),
        shielding: 12 + (prng % 20),
        morale: 40,
      });
    }
  }

  // Determine winner:
  // 1. Longest Sols
  // 2. Tiebreaker: Hours
  // 3. Tiebreaker: Score
  let winnerId: string | null = null;
  let loserId: string | null = null;

  if (aSols > 0 && bSols > 0) {
    if (aSols > bSols) {
      winnerId = match.entrantAId;
      loserId = match.entrantBId;
    } else if (bSols > aSols) {
      winnerId = match.entrantBId;
      loserId = match.entrantAId;
    } else if (aHours > bHours) {
      winnerId = match.entrantAId;
      loserId = match.entrantBId;
    } else if (bHours > aHours) {
      winnerId = match.entrantBId;
      loserId = match.entrantAId;
    } else {
      winnerId = aScore >= bScore ? match.entrantAId : match.entrantBId;
      loserId = winnerId === match.entrantAId ? match.entrantBId : match.entrantAId;
    }
  }

  const updatedStatus = winnerId ? 'completed' : 'live';

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      UPDATE tournament_bracket_matches
      SET
        entrant_a_sols = ${aSols},
        entrant_b_sols = ${bSols},
        entrant_a_hours = ${aHours},
        entrant_b_hours = ${bHours},
        entrant_a_score = ${aScore},
        entrant_b_score = ${bScore},
        winner_entrant_id = ${winnerId},
        status = ${updatedStatus}
      WHERE id = ${match.id};
    `;

    if (loserId) {
      await sql`
        UPDATE tournament_participants
        SET eliminated_in_round = ${match.roundNumber}
        WHERE tournament_id = ${options.tournamentId} AND entrant_id = ${loserId};
      `;
    }

    if (winnerId) {
      const winSols = winnerId === match.entrantAId ? aSols : bSols;
      const winHours = winnerId === match.entrantAId ? aHours : bHours;
      const winScore = winnerId === match.entrantAId ? aScore : bScore;
      await sql`
        UPDATE tournament_participants
        SET
          best_sols_survived = GREATEST(best_sols_survived, ${winSols}),
          best_hours_survived = GREATEST(best_hours_survived, ${winHours}),
          total_score = GREATEST(total_score, ${winScore})
        WHERE tournament_id = ${options.tournamentId} AND entrant_id = ${winnerId};
      `;
    }
  } else {
    const mem = getMemoryStore();
    const list = mem.matches.get(options.tournamentId) || [];
    const target = list.find((m) => m.id === match.id);
    if (target) {
      target.entrantASols = aSols;
      target.entrantBSols = bSols;
      target.entrantAHours = aHours;
      target.entrantBHours = bHours;
      target.entrantAScore = aScore;
      target.entrantBScore = bScore;
      target.winnerEntrantId = winnerId;
      target.status = updatedStatus;
    }
  }

  // Advance winner to next round or declare champion
  if (winnerId) {
    await advanceWinnerToNextRound(options.tournamentId, match, winnerId);
  }

  return getTournamentDetails(options.tournamentId);
}

/**
 * Advances a match winner to the next round of the bracket tree.
 */
async function advanceWinnerToNextRound(
  tournamentId: string,
  completedMatch: TournamentBracketMatch,
  winnerId: string
): Promise<void> {
  const details = await getTournamentDetails(tournamentId);
  if (!details) return;

  const winnerParticipant = details.participants.find((p) => p.entrantId === winnerId);
  const nextRoundNumber = completedMatch.roundNumber + 1;

  // If this was the Championship Final, tournament is completed!
  if (completedMatch.roundNumber === details.tournament.totalRounds) {
    const sql = await getSqlClient();
    if (sql) {
      await sql`
        UPDATE tournaments
        SET
          status = 'completed',
          champion_id = ${winnerId},
          champion_name = ${winnerParticipant ? winnerParticipant.entrantName : 'Survivor'}
        WHERE id = ${tournamentId};
      `;
    } else {
      const mem = getMemoryStore();
      const t = mem.tournaments.get(tournamentId);
      if (t) {
        t.status = 'completed';
        t.championId = winnerId;
        t.championName = winnerParticipant ? winnerParticipant.entrantName : 'Survivor';
      }
    }
    return;
  }

  // Target next round match
  const nextMatchIndex = Math.floor(completedMatch.matchIndex / 2);
  const isSlotA = completedMatch.matchIndex % 2 === 0;

  const targetNextMatch = details.matches.find(
    (m) => m.roundNumber === nextRoundNumber && m.matchIndex === nextMatchIndex
  );
  if (!targetNextMatch) return;

  const sql = await getSqlClient();
  if (sql) {
    if (isSlotA) {
      await sql`
        UPDATE tournament_bracket_matches
        SET
          entrant_a_id = ${winnerId},
          entrant_a_name = ${winnerParticipant ? winnerParticipant.entrantName : 'Winner'},
          entrant_a_avatar = ${winnerParticipant ? winnerParticipant.avatar : '👨‍🚀'},
          status = CASE WHEN entrant_b_id IS NOT NULL THEN 'live' ELSE status END
        WHERE id = ${targetNextMatch.id};
      `;
    } else {
      await sql`
        UPDATE tournament_bracket_matches
        SET
          entrant_b_id = ${winnerId},
          entrant_b_name = ${winnerParticipant ? winnerParticipant.entrantName : 'Winner'},
          entrant_b_avatar = ${winnerParticipant ? winnerParticipant.avatar : '👨‍🚀'},
          status = CASE WHEN entrant_a_id IS NOT NULL THEN 'live' ELSE status END
        WHERE id = ${targetNextMatch.id};
      `;
    }

    // Check if tournament current_round should increment
    const currentRoundMatches = details.matches.filter(
      (m) => m.roundNumber === completedMatch.roundNumber
    );
    const allCompleted = currentRoundMatches.every(
      (m) => (m.id === completedMatch.id ? true : m.status === 'completed')
    );
    if (allCompleted) {
      await sql`
        UPDATE tournaments
        SET current_round = ${nextRoundNumber}
        WHERE id = ${tournamentId};
      `;
    }
  } else {
    const mem = getMemoryStore();
    const list = mem.matches.get(tournamentId) || [];
    const nextM = list.find((m) => m.id === targetNextMatch.id);
    if (nextM && winnerParticipant) {
      if (isSlotA) {
        nextM.entrantAId = winnerId;
        nextM.entrantAName = winnerParticipant.entrantName;
        nextM.entrantAAvatar = winnerParticipant.avatar;
      } else {
        nextM.entrantBId = winnerId;
        nextM.entrantBName = winnerParticipant.entrantName;
        nextM.entrantBAvatar = winnerParticipant.avatar;
      }
      if (nextM.entrantAId && nextM.entrantBId) {
        nextM.status = 'live';
      }
    }
  }
}

/**
 * 5. Get Full Tournament Details with Hierarchical Bracket Structure
 */
export async function getTournamentDetails(tournamentId: string): Promise<TournamentDetails> {
  const sql = await getSqlClient();

  if (sql) {
    const tourRows = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId};`;
    if (!tourRows || tourRows.length === 0) {
      throw new Error('Tournament not found');
    }
    const t = tourRows[0];
    const tournament: Tournament = {
      id: t.id,
      title: t.title,
      mode: t.mode,
      maxEntrants: t.max_entrants,
      status: t.status,
      currentRound: t.current_round,
      totalRounds: t.total_rounds,
      rngSeed: t.rng_seed,
      createdAt: t.created_at,
      championId: t.champion_id,
      championName: t.champion_name,
    };

    const pRows = await sql`
      SELECT * FROM tournament_participants
      WHERE tournament_id = ${tournamentId}
      ORDER BY seed_number ASC;
    `;
    const participants: TournamentParticipant[] = pRows.map((p) => ({
      id: p.id,
      tournamentId: p.tournament_id,
      entrantId: p.entrant_id,
      entrantName: p.entrant_name,
      avatar: p.avatar,
      seedNumber: p.seed_number,
      eliminatedInRound: p.eliminated_in_round,
      bestSolsSurvived: p.best_sols_survived,
      bestHoursSurvived: p.best_hours_survived,
      totalScore: p.total_score,
      isBot: p.is_bot,
    }));

    const mRows = await sql`
      SELECT * FROM tournament_bracket_matches
      WHERE tournament_id = ${tournamentId}
      ORDER BY round_number ASC, match_index ASC;
    `;
    const matches: TournamentBracketMatch[] = mRows.map((m) => ({
      id: m.id,
      tournamentId: m.tournament_id,
      roundNumber: m.round_number,
      roundName: m.round_name,
      matchIndex: m.match_index,
      entrantAId: m.entrant_a_id,
      entrantBId: m.entrant_b_id,
      entrantAName: m.entrant_a_name,
      entrantBName: m.entrant_b_name,
      entrantAAvatar: m.entrant_a_avatar,
      entrantBAvatar: m.entrant_b_avatar,
      entrantASols: m.entrant_a_sols,
      entrantBSols: m.entrant_b_sols,
      entrantAHours: m.entrant_a_hours,
      entrantBHours: m.entrant_b_hours,
      entrantAScore: m.entrant_a_score,
      entrantBScore: m.entrant_b_score,
      winnerEntrantId: m.winner_entrant_id,
      rngSeed: m.rng_seed,
      status: m.status,
    }));

    // Group matches by round
    const rounds: TournamentDetails['rounds'] = [];
    for (let r = 1; r <= tournament.totalRounds; r++) {
      const roundMatches = matches.filter((m) => m.roundNumber === r);
      rounds.push({
        roundNumber: r,
        roundName: getRoundName(r, tournament.totalRounds),
        matches: roundMatches,
      });
    }

    return { tournament, participants, matches, rounds };
  }

  // Memory fallback
  const mem = getMemoryStore();
  const tournament = mem.tournaments.get(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  const participants = mem.participants.get(tournamentId) || [];
  const matches = mem.matches.get(tournamentId) || [];

  const rounds: TournamentDetails['rounds'] = [];
  for (let r = 1; r <= tournament.totalRounds; r++) {
    const roundMatches = matches.filter((m) => m.roundNumber === r);
    rounds.push({
      roundNumber: r,
      roundName: getRoundName(r, tournament.totalRounds),
      matches: roundMatches,
    });
  }

  return { tournament, participants, matches, rounds };
}

/**
 * 6. List Tournaments (Active, Registration, Completed)
 */
export async function listTournaments(): Promise<Tournament[]> {
  const sql = await getSqlClient();
  if (sql) {
    const rows = await sql`
      SELECT * FROM tournaments
      ORDER BY created_at DESC
      LIMIT 20;
    `;
    return rows.map((t) => ({
      id: t.id,
      title: t.title,
      mode: t.mode,
      maxEntrants: t.max_entrants,
      status: t.status,
      currentRound: t.current_round,
      totalRounds: t.total_rounds,
      rngSeed: t.rng_seed,
      createdAt: t.created_at,
      championId: t.champion_id,
      championName: t.champion_name,
    }));
  }

  const mem = getMemoryStore();
  return Array.from(mem.tournaments.values()).reverse();
}
