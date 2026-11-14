// ─── Junior Astronaut Mission Trainer – Storage Adapter ───
// Neon Serverless Postgres (@neondatabase/serverless) with graceful
// in-memory server fallback and client localStorage mirroring.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import type {
  CadetProfile,
  LeaderboardEntry,
  GameState,
  Difficulty,
  SquadRoom,
  SquadCadetState,
  SquadRoomStatus,
  LandingSiteId,
} from './types';

// Default legendary historical astronaut entries
const DEFAULT_LEADERBOARD_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    cadetId: 'legend-armstrong',
    callsign: 'CDR-ARMSTRONG',
    avatar: '👨‍🚀',
    difficulty: 'commander',
    solsSurvived: 30,
    score: 1480,
    badgesCount: 5,
    timestamp: Date.now() - 86400000 * 3,
    verified: true,
  },
  {
    rank: 2,
    cadetId: 'legend-ride',
    callsign: 'CDR-RIDE',
    avatar: '👩‍🚀',
    difficulty: 'pioneer',
    solsSurvived: 30,
    score: 1395,
    badgesCount: 4,
    timestamp: Date.now() - 86400000 * 2,
    verified: true,
  },
  {
    rank: 3,
    cadetId: 'legend-glenn',
    callsign: 'CDR-GLENN',
    avatar: '🚀',
    difficulty: 'commander',
    solsSurvived: 30,
    score: 1270,
    badgesCount: 3,
    timestamp: Date.now() - 86400000 * 4,
    verified: true,
  },
  {
    rank: 4,
    cadetId: 'legend-chawla',
    callsign: 'CDR-CHAWLA',
    avatar: '👩‍🚀',
    difficulty: 'commander',
    solsSurvived: 30,
    score: 1190,
    badgesCount: 4,
    timestamp: Date.now() - 86400000 * 1,
    verified: true,
  },
  {
    rank: 5,
    cadetId: 'legend-aldrin',
    callsign: 'CDR-ALDRIN',
    avatar: '🪐',
    difficulty: 'cadet',
    solsSurvived: 30,
    score: 1050,
    badgesCount: 2,
    timestamp: Date.now() - 86400000 * 5,
    verified: true,
  },
  {
    rank: 6,
    cadetId: 'legend-collins',
    callsign: 'CDR-COLLINS',
    avatar: '🛸',
    difficulty: 'commander',
    solsSurvived: 28,
    score: 960,
    badgesCount: 2,
    timestamp: Date.now() - 86400000 * 6,
    verified: true,
  },
  {
    rank: 7,
    cadetId: 'legend-orion',
    callsign: 'CADET-ORION',
    avatar: '🛰️',
    difficulty: 'cadet',
    solsSurvived: 24,
    score: 820,
    badgesCount: 1,
    timestamp: Date.now() - 86400000 * 7,
    verified: true,
  },
];

// In-Memory Global Fallback Store on Server
interface ServerMemoryStore {
  profiles: Map<string, CadetProfile>;
  saves: Map<string, GameState>;
  leaderboard: LeaderboardEntry[];
  squadRooms: Map<string, SquadRoom>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_store__: ServerMemoryStore | undefined;
  // eslint-disable-next-line no-var
  var __jat_neon_schema_ready__: boolean | undefined;
}

function getMemoryStore(): ServerMemoryStore {
  if (!globalThis.__jat_store__) {
    globalThis.__jat_store__ = {
      profiles: new Map<string, CadetProfile>(),
      saves: new Map<string, GameState>(),
      leaderboard: [...DEFAULT_LEADERBOARD_ENTRIES],
      squadRooms: new Map<string, SquadRoom>(),
    };
  }
  if (!globalThis.__jat_store__.squadRooms) {
    globalThis.__jat_store__.squadRooms = new Map<string, SquadRoom>();
  }
  return globalThis.__jat_store__;
}

/** Check if Neon Postgres connection string is present */
export function getConnectionString(): string | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url && url.trim().length > 0 ? url.trim() : null;
}

export function isCloudStorageConfigured(): boolean {
  return Boolean(getConnectionString());
}

export function isNeonConfigured(): boolean {
  return isCloudStorageConfigured();
}

/** Idempotent schema initialization for Neon Serverless Postgres */
async function ensureSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_neon_schema_ready__) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cadet_profiles (
        cadet_id TEXT PRIMARY KEY,
        callsign TEXT NOT NULL,
        avatar TEXT NOT NULL,
        specialty TEXT DEFAULT 'commander',
        missions_played INT DEFAULT 0,
        missions_won INT DEFAULT 0,
        total_sols INT DEFAULT 0,
        highest_score INT DEFAULT 0,
        badges JSONB DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE cadet_profiles ADD COLUMN IF NOT EXISTS specialty TEXT DEFAULT 'commander';
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS active_saves (
        cadet_id TEXT PRIMARY KEY,
        game_state JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id SERIAL PRIMARY KEY,
        cadet_id TEXT NOT NULL,
        callsign TEXT NOT NULL,
        avatar TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        sols_survived INT NOT NULL,
        score INT NOT NULL,
        is_victory BOOLEAN NOT NULL,
        badges_count INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_score_created
      ON leaderboard_entries (score DESC, created_at ASC);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS squad_rooms (
        room_code VARCHAR(6) PRIMARY KEY,
        landing_zone VARCHAR(32) NOT NULL,
        weather_seed INTEGER NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'LOBBY',
        cadets JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_squad_rooms_status
      ON squad_rooms (status, created_at DESC);
    `;

    globalThis.__jat_neon_schema_ready__ = true;
  } catch (err) {
    console.error('Failed to run ensureSchema on Neon Postgres:', err);
  }
}

/** Lazily get authenticated Neon SQL client with schema verification */
async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;

  try {
    const sql = neon(connStr);
    await ensureSchema(sql);
    return sql;
  } catch (err) {
    console.error('Failed to initialize Neon client:', err);
    return null;
  }
}

// ── Storage Operations ───────────────────────────────────────

/** Fetch global leaderboard entries */
export async function getLeaderboard(
  difficulty: string = 'all',
  limit: number = 25
): Promise<{ entries: LeaderboardEntry[]; isCloudStorage: boolean; storageType: 'neon' | 'local' }> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      type DbRow = {
        cadet_id: string;
        callsign: string;
        avatar: string;
        difficulty: string;
        sols_survived: number;
        score: number;
        is_victory: boolean;
        badges_count: number;
        created_at: string;
      };

      let rows: DbRow[];
      if (difficulty && difficulty !== 'all') {
        rows = (await sql`
          SELECT cadet_id, callsign, avatar, difficulty, sols_survived, score, is_victory, badges_count, created_at
          FROM leaderboard_entries
          WHERE LOWER(difficulty) = LOWER(${difficulty})
          ORDER BY score DESC, created_at ASC
          LIMIT ${limit};
        `) as unknown as DbRow[];
      } else {
        rows = (await sql`
          SELECT cadet_id, callsign, avatar, difficulty, sols_survived, score, is_victory, badges_count, created_at
          FROM leaderboard_entries
          ORDER BY score DESC, created_at ASC
          LIMIT ${limit};
        `) as unknown as DbRow[];
      }

      if (rows && rows.length > 0) {
        const entries: LeaderboardEntry[] = rows.map((r, idx) => ({
          rank: idx + 1,
          cadetId: r.cadet_id,
          callsign: r.callsign,
          avatar: r.avatar,
          difficulty: r.difficulty as Difficulty,
          solsSurvived: r.sols_survived,
          score: r.score,
          badgesCount: r.badges_count || 0,
          timestamp: new Date(r.created_at).getTime(),
          verified: true,
        }));
        return { entries, isCloudStorage: true, storageType: 'neon' };
      }
    } catch (err) {
      console.error('Neon getLeaderboard error:', err);
    }
  }

  // Fallback to in-memory store
  const store = getMemoryStore();
  let filtered = [...store.leaderboard];

  if (difficulty && difficulty !== 'all') {
    filtered = filtered.filter((e) => e.difficulty.toLowerCase() === difficulty.toLowerCase());
  }

  filtered.sort((a, b) => b.score - a.score);
  const sliced = filtered.slice(0, limit).map((e, idx) => ({ ...e, rank: idx + 1 }));

  return { entries: sliced, isCloudStorage: false, storageType: 'local' };
}

/** Save an authoritative leaderboard entry */
export async function saveLeaderboardEntry(
  entry: LeaderboardEntry
): Promise<{ rank: number; isCloudStorage: boolean; storageType: 'neon' | 'local' }> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      const isVictory = entry.solsSurvived >= 30;
      const createdAt = new Date(entry.timestamp).toISOString();

      await sql`
        INSERT INTO leaderboard_entries 
          (cadet_id, callsign, avatar, difficulty, sols_survived, score, is_victory, badges_count, created_at)
        VALUES 
          (${entry.cadetId}, ${entry.callsign}, ${entry.avatar}, ${entry.difficulty}, ${entry.solsSurvived}, ${entry.score}, ${isVictory}, ${entry.badgesCount}, ${createdAt});
      `;

      type CountRow = { higher_count: string | number };
      const countRows = (await sql`
        SELECT COUNT(*) as higher_count
        FROM leaderboard_entries
        WHERE score > ${entry.score} 
           OR (score = ${entry.score} AND created_at < ${createdAt});
      `) as unknown as CountRow[];

      const rank = countRows && countRows[0] ? Number(countRows[0].higher_count) + 1 : 1;
      return { rank, isCloudStorage: true, storageType: 'neon' };
    } catch (err) {
      console.error('Neon saveLeaderboardEntry error:', err);
    }
  }

  // Fallback to in-memory
  const store = getMemoryStore();
  store.leaderboard.push(entry);
  store.leaderboard.sort((a, b) => b.score - a.score);

  const foundIndex = store.leaderboard.findIndex(
    (e) => e.cadetId === entry.cadetId && e.timestamp === entry.timestamp
  );
  const rank = foundIndex >= 0 ? foundIndex + 1 : 1;

  return { rank, isCloudStorage: false, storageType: 'local' };
}

/** Save active mission state */
export async function saveActiveMission(cadetId: string, state: GameState): Promise<void> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      const jsonState = JSON.stringify(state);
      await sql`
        INSERT INTO active_saves (cadet_id, game_state, updated_at)
        VALUES (${cadetId}, ${jsonState}::jsonb, NOW())
        ON CONFLICT (cadet_id) 
        DO UPDATE SET game_state = EXCLUDED.game_state, updated_at = NOW();
      `;
      return;
    } catch (err) {
      console.error('Neon saveActiveMission error:', err);
    }
  }

  const store = getMemoryStore();
  store.saves.set(cadetId, state);
}

/** Fetch active mission state */
export async function getActiveMission(cadetId: string): Promise<GameState | null> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      type SaveRow = { game_state: unknown };
      const rows = (await sql`
        SELECT game_state FROM active_saves WHERE cadet_id = ${cadetId} LIMIT 1;
      `) as unknown as SaveRow[];

      if (rows && rows.length > 0) {
        const gs = rows[0].game_state;
        return typeof gs === 'string' ? JSON.parse(gs) : (gs as GameState);
      }
      return null;
    } catch (err) {
      console.error('Neon getActiveMission error:', err);
    }
  }

  const store = getMemoryStore();
  return store.saves.get(cadetId) || null;
}

/** Delete active mission state (on completion/game over) */
export async function deleteActiveMission(cadetId: string): Promise<void> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      await sql`
        DELETE FROM active_saves WHERE cadet_id = ${cadetId};
      `;
      return;
    } catch (err) {
      console.error('Neon deleteActiveMission error:', err);
    }
  }

  const store = getMemoryStore();
  store.saves.delete(cadetId);
}

/** Save cadet profile to cloud or fallback */
export async function saveCloudProfile(profile: CadetProfile): Promise<void> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      const badgesJson = JSON.stringify(profile.badges || []);
      const specialty = profile.specialty || 'commander';
      await sql`
        INSERT INTO cadet_profiles 
          (cadet_id, callsign, avatar, specialty, missions_played, missions_won, total_sols, highest_score, badges, updated_at)
        VALUES 
          (${profile.cadetId}, ${profile.callsign}, ${profile.avatar}, ${specialty}, ${profile.missionsPlayed}, ${profile.missionsWon}, ${profile.totalSolsSurvived}, ${profile.highestScore}, ${badgesJson}::jsonb, NOW())
        ON CONFLICT (cadet_id) 
        DO UPDATE SET 
          callsign = EXCLUDED.callsign,
          avatar = EXCLUDED.avatar,
          specialty = EXCLUDED.specialty,
          missions_played = EXCLUDED.missions_played,
          missions_won = EXCLUDED.missions_won,
          total_sols = EXCLUDED.total_sols,
          highest_score = EXCLUDED.highest_score,
          badges = EXCLUDED.badges,
          updated_at = NOW();
      `;
      return;
    } catch (err) {
      console.error('Neon saveCloudProfile error:', err);
    }
  }

  const store = getMemoryStore();
  store.profiles.set(profile.cadetId, profile);
}

/** Fetch cadet profile from cloud or fallback */
export async function getCloudProfile(cadetId: string): Promise<CadetProfile | null> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      type ProfileRow = {
        cadet_id: string;
        callsign: string;
        avatar: string;
        specialty?: string;
        missions_played: number;
        missions_won: number;
        total_sols: number;
        highest_score: number;
        badges: unknown;
        updated_at: string;
      };

      const rows = (await sql`
        SELECT cadet_id, callsign, avatar, specialty, missions_played, missions_won, total_sols, highest_score, badges, updated_at
        FROM cadet_profiles 
        WHERE cadet_id = ${cadetId} 
        LIMIT 1;
      `) as unknown as ProfileRow[];

      if (rows && rows.length > 0) {
        const r = rows[0];
        const badges = typeof r.badges === 'string' ? JSON.parse(r.badges) : r.badges;
        return {
          cadetId: r.cadet_id,
          callsign: r.callsign,
          avatar: r.avatar,
          specialty: (r.specialty as any) || 'commander',
          createdAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
          missionsPlayed: r.missions_played,
          missionsWon: r.missions_won,
          totalSolsSurvived: r.total_sols,
          highestScore: r.highest_score,
          badges: Array.isArray(badges) ? badges : [],
        };
      }
      return null;
    } catch (err) {
      console.error('Neon getCloudProfile error:', err);
    }
  }

  const store = getMemoryStore();
  return store.profiles.get(cadetId) || null;
}

/** Permanently purge cadet profile, active saves, and leaderboard records from cloud & fallback */
export async function deleteCadetCloudData(cadetId: string): Promise<boolean> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      await sql`DELETE FROM cadet_profiles WHERE cadet_id = ${cadetId};`;
      await sql`DELETE FROM active_saves WHERE cadet_id = ${cadetId};`;
      await sql`DELETE FROM leaderboard_entries WHERE cadet_id = ${cadetId};`;
      return true;
    } catch (err) {
      console.error('Neon deleteCadetCloudData error:', err);
    }
  }

  const store = getMemoryStore();
  store.profiles.delete(cadetId);
  store.saves.delete(cadetId);
  store.leaderboard = store.leaderboard.filter((entry) => entry.cadetId !== cadetId);
  return true;
}

// ── Competitive Squad Operations ─────────────────────────────

export function sortSquadCadets(cadets: SquadCadetState[]): SquadCadetState[] {
  return [...cadets].sort((a, b) => {
    // 1. Alive status first
    if (a.alive !== b.alive) {
      return a.alive ? -1 : 1;
    }
    // 2. Score descending
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 3. Sols survived descending
    return b.sol - a.sol;
  });
}

type SquadRoomRow = {
  room_code: string;
  landing_zone: string;
  weather_seed: number;
  status: string;
  cadets: unknown;
  created_at: string;
};

function formatSquadRoom(r: SquadRoomRow): SquadRoom {
  const cadetsRaw = typeof r.cadets === 'string' ? JSON.parse(r.cadets) : r.cadets;
  return {
    roomCode: r.room_code,
    landingZone: (r.landing_zone as LandingSiteId) || 'jezero',
    weatherSeed: Number(r.weather_seed),
    status: (r.status as SquadRoomStatus) || 'LOBBY',
    cadets: Array.isArray(cadetsRaw) ? sortSquadCadets(cadetsRaw) : [],
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function createSquadRoom(
  roomCode: string,
  landingZone: LandingSiteId,
  weatherSeed: number,
  hostCadet: SquadCadetState
): Promise<SquadRoom | null> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const initialCadets = [hostCadet];

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO squad_rooms (room_code, landing_zone, weather_seed, status, cadets, created_at)
        VALUES (
          ${normalizedCode},
          ${landingZone},
          ${weatherSeed},
          'LOBBY',
          ${JSON.stringify(initialCadets)}::jsonb,
          NOW()
        )
        ON CONFLICT (room_code) DO UPDATE
        SET landing_zone = EXCLUDED.landing_zone,
            weather_seed = EXCLUDED.weather_seed,
            status = 'LOBBY',
            cadets = EXCLUDED.cadets,
            created_at = NOW();
      `;

      return {
        roomCode: normalizedCode,
        landingZone,
        weatherSeed,
        status: 'LOBBY',
        cadets: initialCadets,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Neon createSquadRoom error:', err);
    }
  }

  const store = getMemoryStore();
  const room: SquadRoom = {
    roomCode: normalizedCode,
    landingZone,
    weatherSeed,
    status: 'LOBBY',
    cadets: initialCadets,
    createdAt: new Date().toISOString(),
  };
  store.squadRooms.set(normalizedCode, room);
  return room;
}

export async function getSquadRoom(roomCode: string): Promise<SquadRoom | null> {
  const normalizedCode = roomCode.trim().toUpperCase();

  const sql = await getSqlClient();
  if (sql) {
    try {
      const rows = (await sql`
        SELECT room_code, landing_zone, weather_seed, status, cadets, created_at
        FROM squad_rooms
        WHERE room_code = ${normalizedCode}
        LIMIT 1;
      `) as unknown as SquadRoomRow[];

      if (rows && rows.length > 0) {
        return formatSquadRoom(rows[0]);
      }
      return null;
    } catch (err) {
      console.error('Neon getSquadRoom error:', err);
    }
  }

  const store = getMemoryStore();
  const room = store.squadRooms.get(normalizedCode);
  if (room) {
    return {
      ...room,
      cadets: sortSquadCadets(room.cadets),
    };
  }
  return null;
}

export async function joinSquadRoom(
  roomCode: string,
  cadet: SquadCadetState
): Promise<{ room: SquadRoom | null; error?: string }> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const existing = await getSquadRoom(normalizedCode);

  if (!existing) {
    return { room: null, error: 'Squad room not found. Check frequency code.' };
  }

  // Check if cadet already in squad
  const existingIndex = existing.cadets.findIndex(
    (c) => c.cadetId === cadet.cadetId || c.callsign.toLowerCase() === cadet.callsign.toLowerCase()
  );

  if (existing.status !== 'LOBBY' && existingIndex === -1) {
    return { room: null, error: 'Mission already launched. Cannot join active squad.' };
  }

  if (existing.cadets.length >= 4 && existingIndex === -1) {
    return { room: null, error: 'Squad frequency full (maximum 4 cadets).' };
  }

  let updatedCadets: SquadCadetState[];
  if (existingIndex >= 0) {
    updatedCadets = [...existing.cadets];
    updatedCadets[existingIndex] = { ...updatedCadets[existingIndex], ...cadet, updatedAt: Date.now() };
  } else {
    updatedCadets = [...existing.cadets, { ...cadet, updatedAt: Date.now() }];
  }

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        UPDATE squad_rooms
        SET cadets = ${JSON.stringify(updatedCadets)}::jsonb
        WHERE room_code = ${normalizedCode};
      `;

      return {
        room: {
          ...existing,
          cadets: sortSquadCadets(updatedCadets),
        },
      };
    } catch (err) {
      console.error('Neon joinSquadRoom error:', err);
    }
  }

  const store = getMemoryStore();
  const updatedRoom: SquadRoom = {
    ...existing,
    cadets: sortSquadCadets(updatedCadets),
  };
  store.squadRooms.set(normalizedCode, updatedRoom);
  return { room: updatedRoom };
}

export async function startSquadRoom(roomCode: string): Promise<SquadRoom | null> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const existing = await getSquadRoom(normalizedCode);
  if (!existing) return null;

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        UPDATE squad_rooms
        SET status = 'ACTIVE'
        WHERE room_code = ${normalizedCode};
      `;

      return {
        ...existing,
        status: 'ACTIVE',
      };
    } catch (err) {
      console.error('Neon startSquadRoom error:', err);
    }
  }

  const store = getMemoryStore();
  const updatedRoom: SquadRoom = {
    ...existing,
    status: 'ACTIVE',
  };
  store.squadRooms.set(normalizedCode, updatedRoom);
  return updatedRoom;
}

export async function syncSquadCadet(
  roomCode: string,
  cadet: SquadCadetState
): Promise<SquadRoom | null> {
  const normalizedCode = roomCode.trim().toUpperCase();
  const existing = await getSquadRoom(normalizedCode);
  if (!existing) return null;

  const idx = existing.cadets.findIndex(
    (c) => c.cadetId === cadet.cadetId || c.callsign.toLowerCase() === cadet.callsign.toLowerCase()
  );

  let updatedCadets: SquadCadetState[];
  if (idx >= 0) {
    updatedCadets = [...existing.cadets];
    updatedCadets[idx] = {
      ...updatedCadets[idx],
      sol: cadet.sol,
      power: cadet.power,
      oxygen: cadet.oxygen,
      shielding: cadet.shielding,
      morale: cadet.morale,
      score: cadet.score,
      alive: cadet.alive,
      avatar: cadet.avatar || updatedCadets[idx].avatar,
      specialty: cadet.specialty || updatedCadets[idx].specialty,
      updatedAt: Date.now(),
    };
  } else if (existing.cadets.length < 4) {
    updatedCadets = [...existing.cadets, { ...cadet, updatedAt: Date.now() }];
  } else {
    updatedCadets = existing.cadets;
  }

  // Check if room should be marked FINISHED (all finished sol 30 or all dead)
  const allFinished = updatedCadets.length > 0 && updatedCadets.every((c) => !c.alive || c.sol >= 30);
  const nextStatus: SquadRoomStatus = allFinished ? 'FINISHED' : existing.status;

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        UPDATE squad_rooms
        SET cadets = ${JSON.stringify(updatedCadets)}::jsonb,
            status = ${nextStatus}
        WHERE room_code = ${normalizedCode};
      `;

      return {
        ...existing,
        status: nextStatus,
        cadets: sortSquadCadets(updatedCadets),
      };
    } catch (err) {
      console.error('Neon syncSquadCadet error:', err);
    }
  }

  const store = getMemoryStore();
  const updatedRoom: SquadRoom = {
    ...existing,
    status: nextStatus,
    cadets: sortSquadCadets(updatedCadets),
  };
  store.squadRooms.set(normalizedCode, updatedRoom);
  return updatedRoom;
}
