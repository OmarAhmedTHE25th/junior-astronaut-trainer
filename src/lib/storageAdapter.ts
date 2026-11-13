// ─── Junior Astronaut Mission Trainer – Storage Adapter ───
// Dual-tier architecture: Upstash Redis / Vercel KV REST in production,
// with graceful in-memory server fallback and client localStorage mirroring.

import type { CadetProfile, LeaderboardEntry, GameState, Difficulty } from './types';

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
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_store__: ServerMemoryStore | undefined;
}

function getMemoryStore(): ServerMemoryStore {
  if (!globalThis.__jat_store__) {
    globalThis.__jat_store__ = {
      profiles: new Map<string, CadetProfile>(),
      saves: new Map<string, GameState>(),
      leaderboard: [...DEFAULT_LEADERBOARD_ENTRIES],
    };
  }
  return globalThis.__jat_store__;
}

/** Check if Upstash Redis or Vercel KV environment variables are present */
export function isCloudStorageConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

/** Execute command against Upstash REST API using native fetch */
async function executeUpstashCommand<T = unknown>(command: (string | number)[]): Promise<T | null> {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  try {
    const res = await fetch(`${url}/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.result as T;
  } catch {
    return null;
  }
}

// ── Storage Operations ───────────────────────────────────────

/** Fetch global leaderboard entries */
export async function getLeaderboard(
  difficulty: string = 'all',
  limit: number = 25
): Promise<{ entries: LeaderboardEntry[]; isCloudStorage: boolean }> {
  const isCloud = isCloudStorageConfigured();

  if (isCloud) {
    const setKey = difficulty && difficulty !== 'all'
      ? `jat:lb:${difficulty}`
      : 'jat:lb:all';

    const rawList = await executeUpstashCommand<string[]>(['ZREVRANGE', setKey, 0, limit - 1]);

    if (rawList && rawList.length > 0) {
      const parsed: LeaderboardEntry[] = [];
      for (const item of rawList) {
        try {
          const entry = typeof item === 'string' ? JSON.parse(item) : item;
          parsed.push(entry);
        } catch {}
      }
      const ranked = parsed.map((e, idx) => ({ ...e, rank: idx + 1 }));
      return { entries: ranked, isCloudStorage: true };
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

  return { entries: sliced, isCloudStorage: isCloud };
}

/** Save an authoritative leaderboard entry */
export async function saveLeaderboardEntry(
  entry: LeaderboardEntry
): Promise<{ rank: number; isCloudStorage: boolean }> {
  const isCloud = isCloudStorageConfigured();
  const entryJson = JSON.stringify(entry);

  if (isCloud) {
    // Add to global set and difficulty-specific set
    await executeUpstashCommand(['ZADD', 'jat:lb:all', entry.score, entryJson]);
    await executeUpstashCommand(['ZADD', `jat:lb:${entry.difficulty}`, entry.score, entryJson]);

    // Query rank
    const rank0 = await executeUpstashCommand<number>(['ZREVRANK', 'jat:lb:all', entryJson]);
    const computedRank = rank0 !== null ? rank0 + 1 : 1;
    return { rank: computedRank, isCloudStorage: true };
  }

  // Fallback to in-memory
  const store = getMemoryStore();
  store.leaderboard.push(entry);
  store.leaderboard.sort((a, b) => b.score - a.score);

  const foundIndex = store.leaderboard.findIndex(
    (e) => e.cadetId === entry.cadetId && e.timestamp === entry.timestamp
  );
  const rank = foundIndex >= 0 ? foundIndex + 1 : 1;

  return { rank, isCloudStorage: false };
}

/** Save active mission state */
export async function saveActiveMission(cadetId: string, state: GameState): Promise<void> {
  const isCloud = isCloudStorageConfigured();
  const key = `jat:save:${cadetId}`;
  const json = JSON.stringify(state);

  if (isCloud) {
    // Save with 7-day TTL
    await executeUpstashCommand(['SET', key, json, 'EX', 604800]);
    return;
  }

  const store = getMemoryStore();
  store.saves.set(cadetId, state);
}

/** Fetch active mission state */
export async function getActiveMission(cadetId: string): Promise<GameState | null> {
  const isCloud = isCloudStorageConfigured();
  const key = `jat:save:${cadetId}`;

  if (isCloud) {
    const raw = await executeUpstashCommand<string>(['GET', key]);
    if (raw) {
      try {
        return JSON.parse(raw) as GameState;
      } catch {}
    }
    return null;
  }

  const store = getMemoryStore();
  return store.saves.get(cadetId) || null;
}

/** Delete active mission state (on completion/game over) */
export async function deleteActiveMission(cadetId: string): Promise<void> {
  const isCloud = isCloudStorageConfigured();
  const key = `jat:save:${cadetId}`;

  if (isCloud) {
    await executeUpstashCommand(['DEL', key]);
    return;
  }

  const store = getMemoryStore();
  store.saves.delete(cadetId);
}

/** Save cadet profile to cloud or fallback */
export async function saveCloudProfile(profile: CadetProfile): Promise<void> {
  const isCloud = isCloudStorageConfigured();
  const key = `jat:profile:${profile.cadetId}`;
  const json = JSON.stringify(profile);

  if (isCloud) {
    await executeUpstashCommand(['SET', key, json]);
    return;
  }

  const store = getMemoryStore();
  store.profiles.set(profile.cadetId, profile);
}

/** Fetch cadet profile from cloud or fallback */
export async function getCloudProfile(cadetId: string): Promise<CadetProfile | null> {
  const isCloud = isCloudStorageConfigured();
  const key = `jat:profile:${cadetId}`;

  if (isCloud) {
    const raw = await executeUpstashCommand<string>(['GET', key]);
    if (raw) {
      try {
        return JSON.parse(raw) as CadetProfile;
      } catch {}
    }
    return null;
  }

  const store = getMemoryStore();
  return store.profiles.get(cadetId) || null;
}
