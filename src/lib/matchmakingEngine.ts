// ─── Junior Astronaut Mission Trainer – Real-Time Matchmaking Engine ───
// Serverless-safe matchmaking, atomic locking with PostgreSQL FOR UPDATE SKIP LOCKED,
// and in-memory dual-layer store fallback when running without a remote database.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getConnectionString } from './storageAdapter';
import {
  SQUAD_ROLES,
  type SquadRole,
  type SquadMatch,
  type SquadMember,
  type MatchmakingQueueEntry,
  type MatchEvent,
  type TacticalCommsMessage,
  type SharedHabitatResources,
} from './matchmakingTypes';
import type { LandingSiteId } from './types';

// Generate clean 6-character room codes (no ambiguous 0/O, 1/I)
export function generateSquadCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In-Memory Fallback State (when DATABASE_URL is not set)
interface MemoryMatchmakingState {
  queue: Map<string, MatchmakingQueueEntry>;
  matches: Map<string, SquadMatch>;
  events: Map<string, MatchEvent[]>;
  comms: Map<string, TacticalCommsMessage[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_mm_store__: MemoryMatchmakingState | undefined;
  // eslint-disable-next-line no-var
  var __jat_mm_schema_ready__: boolean | undefined;
}

function getMemoryStore(): MemoryMatchmakingState {
  if (!globalThis.__jat_mm_store__) {
    globalThis.__jat_mm_store__ = {
      queue: new Map<string, MatchmakingQueueEntry>(),
      matches: new Map<string, SquadMatch>(),
      events: new Map<string, MatchEvent[]>(),
      comms: new Map<string, TacticalCommsMessage[]>(),
    };
  }
  return globalThis.__jat_mm_store__;
}

// Lazily initialize Neon SQL client with schema verification
async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;

  try {
    const sql = neon(connStr);
    await ensureMatchmakingSchema(sql);
    return sql;
  } catch (err) {
    console.error('Failed to initialize Neon matchmaking client:', err);
    return null;
  }
}

// Idempotent table creation
export async function ensureMatchmakingSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_mm_schema_ready__) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS matchmaking_queue (
        id SERIAL PRIMARY KEY,
        player_id VARCHAR(64) NOT NULL UNIQUE,
        player_name VARCHAR(64) NOT NULL,
        avatar VARCHAR(16) DEFAULT '👨‍🚀',
        preferred_role VARCHAR(32) DEFAULT 'commander',
        status VARCHAR(16) NOT NULL DEFAULT 'waiting',
        match_id VARCHAR(64),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_poll_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_mm_queue_status_poll
      ON matchmaking_queue (status, last_poll_at DESC, joined_at ASC);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS squad_matches (
        id VARCHAR(64) PRIMARY KEY,
        join_code VARCHAR(6) NOT NULL UNIQUE,
        status VARCHAR(16) NOT NULL DEFAULT 'waiting',
        current_sol INTEGER NOT NULL DEFAULT 1,
        shared_resources_json JSONB NOT NULL DEFAULT '{"power": 95, "oxygen": 95, "water": 90, "shielding": 90, "morale": 75}'::jsonb,
        active_event_json JSONB DEFAULT NULL,
        weather_seed INTEGER NOT NULL DEFAULT 424242,
        landing_zone VARCHAR(32) NOT NULL DEFAULT 'jezero',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS squad_members (
        id SERIAL PRIMARY KEY,
        match_id VARCHAR(64) NOT NULL REFERENCES squad_matches(id) ON DELETE CASCADE,
        player_id VARCHAR(64) NOT NULL,
        player_name VARCHAR(64) NOT NULL,
        avatar VARCHAR(16) DEFAULT '👨‍🚀',
        role VARCHAR(32) NOT NULL DEFAULT 'commander',
        is_ready BOOLEAN NOT NULL DEFAULT FALSE,
        is_alive BOOLEAN NOT NULL DEFAULT TRUE,
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_squad_member UNIQUE (match_id, player_id)
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_squad_members_match_id
      ON squad_members (match_id);
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS match_events (
        id SERIAL PRIMARY KEY,
        match_id VARCHAR(64) NOT NULL REFERENCES squad_matches(id) ON DELETE CASCADE,
        player_id VARCHAR(64) NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_match_events_match_time
      ON match_events (match_id, created_at ASC);
    `;

    globalThis.__jat_mm_schema_ready__ = true;
  } catch (err) {
    console.error('Failed to run ensureMatchmakingSchema:', err);
  }
}

// ── Distinct Role Distributor ─────────────────────────────
// Ensures a 4-player squad always has distinct roles:
// commander, engineer, medic, resource_specialist
export function assignDistinctRoles(
  players: Array<{ playerId: string; preferredRole?: SquadRole }>
): Record<string, SquadRole> {
  const allRoles: SquadRole[] = ['commander', 'engineer', 'medic', 'resource_specialist'];
  const assigned: Record<string, SquadRole> = {};
  const takenRoles = new Set<SquadRole>();

  // Pass 1: Assign preferred role if still available
  for (const p of players) {
    if (p.preferredRole && allRoles.includes(p.preferredRole) && !takenRoles.has(p.preferredRole)) {
      assigned[p.playerId] = p.preferredRole;
      takenRoles.add(p.preferredRole);
    }
  }

  // Pass 2: Assign first remaining available role for players without an assigned role
  for (const p of players) {
    if (!assigned[p.playerId]) {
      const remainingRole = allRoles.find((r) => !takenRoles.has(r)) || 'commander';
      assigned[p.playerId] = remainingRole;
      takenRoles.add(remainingRole);
    }
  }

  return assigned;
}

// Autonomous NASA AI Bot Profiles for filling lobbies
export const NASA_AI_BOTS: Array<{ name: string; avatar: string; role: SquadRole }> = [
  { name: 'BOT-PERSEVERANCE', avatar: '🤖', role: 'engineer' },
  { name: 'BOT-INGENUITY', avatar: '🛸', role: 'resource_specialist' },
  { name: 'BOT-CURIOSITY', avatar: '🛰️', role: 'medic' },
];

// Initial shared life-support resources
export function getInitialSharedResources(): SharedHabitatResources {
  return {
    power: 95,
    oxygen: 95,
    water: 90,
    shielding: 90,
    morale: 75,
  };
}

// ── 1. Enter Matchmaking Queue ─────────────────────────────
export async function joinMatchmakingQueue(player: {
  playerId: string;
  playerName: string;
  avatar?: string;
  preferredRole?: SquadRole;
}): Promise<{ status: 'waiting' | 'matched'; matchId?: string; queueCount: number }> {
  const cleanId = player.playerId.trim();
  const cleanName = player.playerName.trim().slice(0, 24) || 'ASTRONAUT';
  const cleanAvatar = player.avatar || '👨‍🚀';
  const cleanRole = player.preferredRole || 'commander';

  const sql = await getSqlClient();

  if (sql) {
    try {
      // Upsert into matchmaking queue
      await sql`
        INSERT INTO matchmaking_queue (player_id, player_name, avatar, preferred_role, status, joined_at, last_poll_at)
        VALUES (${cleanId}, ${cleanName}, ${cleanAvatar}, ${cleanRole}, 'waiting', NOW(), NOW())
        ON CONFLICT (player_id) DO UPDATE
        SET player_name = EXCLUDED.player_name,
            avatar = EXCLUDED.avatar,
            preferred_role = EXCLUDED.preferred_role,
            status = 'waiting',
            match_id = NULL,
            joined_at = NOW(),
            last_poll_at = NOW();
      `;

      // Trigger atomic matchmaking evaluation
      return await evaluateMatchmaking(cleanId);
    } catch (err) {
      console.error('Neon joinMatchmakingQueue error:', err);
    }
  }

  // In-Memory Fallback
  const store = getMemoryStore();
  store.queue.set(cleanId, {
    id: Date.now(),
    playerId: cleanId,
    playerName: cleanName,
    avatar: cleanAvatar,
    preferredRole: cleanRole,
    status: 'waiting',
    joinedAt: Date.now(),
    lastPollAt: Date.now(),
  });

  return await evaluateMemoryMatchmaking(cleanId);
}

// ── 2. Poll Matchmaking Status ─────────────────────────────
export async function checkMatchmakingStatus(playerId: string): Promise<{
  status: 'waiting' | 'matched' | 'not_in_queue';
  matchId?: string;
  queueCount: number;
  countdownSeconds: number | null;
}> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      // Update heartbeat
      await sql`
        UPDATE matchmaking_queue
        SET last_poll_at = NOW()
        WHERE player_id = ${playerId};
      `;

      const rows = (await sql`
        SELECT status, match_id, joined_at
        FROM matchmaking_queue
        WHERE player_id = ${playerId}
        LIMIT 1;
      `) as unknown as Array<{ status: string; match_id: string | null; joined_at: string }>;

      if (!rows || rows.length === 0) {
        return { status: 'not_in_queue', queueCount: 0, countdownSeconds: null };
      }

      if (rows[0].status === 'matched' && rows[0].match_id) {
        return {
          status: 'matched',
          matchId: rows[0].match_id,
          queueCount: 0,
          countdownSeconds: null,
        };
      }

      // Check current waiting pool
      return await evaluateMatchmaking(playerId);
    } catch (err) {
      console.error('Neon checkMatchmakingStatus error:', err);
    }
  }

  // In-Memory Fallback
  const store = getMemoryStore();
  const entry = store.queue.get(playerId);
  if (!entry) {
    return { status: 'not_in_queue', queueCount: 0, countdownSeconds: null };
  }

  entry.lastPollAt = Date.now();
  if (entry.status === 'matched' && entry.matchId) {
    return {
      status: 'matched',
      matchId: entry.matchId,
      queueCount: 0,
      countdownSeconds: null,
    };
  }

  return await evaluateMemoryMatchmaking(playerId);
}

// ── 3. Atomic Matchmaking Evaluation (Postgres FOR UPDATE SKIP LOCKED) ──
async function evaluateMatchmaking(playerId: string): Promise<{
  status: 'waiting' | 'matched';
  matchId?: string;
  queueCount: number;
  countdownSeconds: number | null;
}> {
  const sql = await getSqlClient();
  if (!sql) return { status: 'waiting', queueCount: 1, countdownSeconds: null };

  try {
    // Purge stale disconnected players (last poll > 35s)
    await sql`
      DELETE FROM matchmaking_queue
      WHERE status = 'waiting'
        AND last_poll_at < NOW() - INTERVAL '35 seconds';
    `;

    // Atomic race-safe lock on up to 4 queued players
    type CandidateRow = {
      id: number;
      player_id: string;
      player_name: string;
      avatar: string;
      preferred_role: string;
      joined_at: string;
    };

    const candidates = (await sql`
      SELECT id, player_id, player_name, avatar, preferred_role, joined_at
      FROM matchmaking_queue
      WHERE status = 'waiting'
        AND last_poll_at > NOW() - INTERVAL '25 seconds'
      ORDER BY joined_at ASC
      LIMIT 4
      FOR UPDATE SKIP LOCKED;
    `) as unknown as CandidateRow[];

    const count = candidates.length;

    // Check if player is already matched
    const playerRecord = candidates.find((c) => c.player_id === playerId);
    if (!playerRecord) {
      const checkSelf = (await sql`
        SELECT status, match_id FROM matchmaking_queue WHERE player_id = ${playerId} LIMIT 1;
      `) as unknown as Array<{ status: string; match_id: string | null }>;
      if (checkSelf[0]?.status === 'matched' && checkSelf[0]?.match_id) {
        return { status: 'matched', matchId: checkSelf[0].match_id, queueCount: 0, countdownSeconds: null };
      }
    }

    // Determine if we should create a match:
    // Criteria A: 4 players gathered (Full Squad)
    // Criteria B: 2+ players waiting and earliest joined_at > 15 seconds ago
    let shouldFormMatch = false;
    let countdownRemaining: number | null = null;

    if (count >= 4) {
      shouldFormMatch = true;
    } else if (count >= 2) {
      const earliest = new Date(candidates[0].joined_at).getTime();
      const elapsed = Math.floor((Date.now() - earliest) / 1000);
      const remaining = Math.max(0, 15 - elapsed);

      if (remaining <= 0) {
        shouldFormMatch = true;
      } else {
        countdownRemaining = remaining;
      }
    }

    if (shouldFormMatch) {
      const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const joinCode = generateSquadCode();
      const seed = Math.floor(Math.random() * 899999) + 100000;
      const initialResources = getInitialSharedResources();

      // Distribute distinct roles
      const roleMap = assignDistinctRoles(
        candidates.map((c) => ({
          playerId: c.player_id,
          preferredRole: c.preferred_role as SquadRole,
        }))
      );

      // Create match in DB
      await sql`
        INSERT INTO squad_matches (id, join_code, status, current_sol, shared_resources_json, weather_seed, landing_zone, created_at, updated_at)
        VALUES (${matchId}, ${joinCode}, 'waiting', 1, ${JSON.stringify(initialResources)}::jsonb, ${seed}, 'jezero', NOW(), NOW());
      `;

      // Insert squad members
      for (const c of candidates) {
        const assignedRole = roleMap[c.player_id] || 'commander';
        await sql`
          INSERT INTO squad_members (match_id, player_id, player_name, avatar, role, is_ready, is_alive, is_bot, last_seen_at)
          VALUES (${matchId}, ${c.player_id}, ${c.player_name}, ${c.avatar || '👨‍🚀'}, ${assignedRole}, FALSE, TRUE, FALSE, NOW())
          ON CONFLICT (match_id, player_id) DO NOTHING;
        `;
      }

      // Fill remaining slots with AI Bots if squad size < 4
      if (candidates.length < 4) {
        const takenRoles = new Set(Object.values(roleMap));
        const allRoles: SquadRole[] = ['commander', 'engineer', 'medic', 'resource_specialist'];
        const needed = 4 - candidates.length;

        for (let i = 0; i < needed; i++) {
          const botMeta = NASA_AI_BOTS[i % NASA_AI_BOTS.length];
          const botRole = allRoles.find((r) => !takenRoles.has(r)) || botMeta.role;
          takenRoles.add(botRole);

          const botId = `bot-${Date.now()}-${i}`;
          await sql`
            INSERT INTO squad_members (match_id, player_id, player_name, avatar, role, is_ready, is_alive, is_bot, last_seen_at)
            VALUES (${matchId}, ${botId}, ${botMeta.name}, ${botMeta.avatar}, ${botRole}, TRUE, TRUE, TRUE, NOW());
          `;
        }
      }

      // Mark candidates as matched
      const candidateIds = candidates.map((c) => c.id);
      await sql`
        UPDATE matchmaking_queue
        SET status = 'matched', match_id = ${matchId}
        WHERE id = ANY(${candidateIds}::int[]);
      `;

      // Insert initial system match event
      await sql`
        INSERT INTO match_events (match_id, player_id, event_type, payload_json)
        VALUES (${matchId}, 'SYSTEM', 'match_start', ${JSON.stringify({ message: 'Squad formed. Terminal link established.' })}::jsonb);
      `;

      return {
        status: 'matched',
        matchId,
        queueCount: 0,
        countdownSeconds: null,
      };
    }

    return {
      status: 'waiting',
      queueCount: count,
      countdownSeconds: countdownRemaining,
    };
  } catch (err) {
    console.error('evaluateMatchmaking error:', err);
    return { status: 'waiting', queueCount: 1, countdownSeconds: null };
  }
}

// In-Memory Matchmaking Evaluation
async function evaluateMemoryMatchmaking(playerId: string): Promise<{
  status: 'waiting' | 'matched';
  matchId?: string;
  queueCount: number;
  countdownSeconds: number | null;
}> {
  const store = getMemoryStore();

  // Purge inactive (>30s)
  const now = Date.now();
  for (const [id, entry] of store.queue.entries()) {
    if (entry.status === 'waiting' && now - entry.lastPollAt > 30000) {
      store.queue.delete(id);
    }
  }

  const waiting = Array.from(store.queue.values())
    .filter((e) => e.status === 'waiting')
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const target = store.queue.get(playerId);
  if (target?.status === 'matched' && target.matchId) {
    return { status: 'matched', matchId: target.matchId, queueCount: 0, countdownSeconds: null };
  }

  const candidates = waiting.slice(0, 4);
  const count = candidates.length;

  let shouldFormMatch = false;
  let countdownRemaining: number | null = null;

  if (count >= 4) {
    shouldFormMatch = true;
  } else if (count >= 2) {
    const elapsed = Math.floor((now - candidates[0].joinedAt) / 1000);
    const remaining = Math.max(0, 15 - elapsed);
    if (remaining <= 0) {
      shouldFormMatch = true;
    } else {
      countdownRemaining = remaining;
    }
  }

  if (shouldFormMatch) {
    const matchId = `match-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const joinCode = generateSquadCode();
    const seed = Math.floor(Math.random() * 899999) + 100000;
    const initialResources = getInitialSharedResources();

    const roleMap = assignDistinctRoles(
      candidates.map((c) => ({
        playerId: c.playerId,
        preferredRole: c.preferredRole,
      }))
    );

    const members: SquadMember[] = candidates.map((c) => ({
      matchId,
      playerId: c.playerId,
      playerName: c.playerName,
      avatar: c.avatar,
      role: roleMap[c.playerId] || 'commander',
      isReady: false,
      isAlive: true,
      isBot: false,
      lastSeenAt: now,
      joinedAt: now,
    }));

    // Fill bots
    if (members.length < 4) {
      const takenRoles = new Set(members.map((m) => m.role));
      const allRoles: SquadRole[] = ['commander', 'engineer', 'medic', 'resource_specialist'];
      const needed = 4 - members.length;

      for (let i = 0; i < needed; i++) {
        const botMeta = NASA_AI_BOTS[i % NASA_AI_BOTS.length];
        const botRole = allRoles.find((r) => !takenRoles.has(r)) || botMeta.role;
        takenRoles.add(botRole);

        members.push({
          matchId,
          playerId: `bot-${now}-${i}`,
          playerName: botMeta.name,
          avatar: botMeta.avatar,
          role: botRole,
          isReady: true,
          isAlive: true,
          isBot: true,
          lastSeenAt: now,
          joinedAt: now,
        });
      }
    }

    const match: SquadMatch = {
      id: matchId,
      joinCode,
      status: 'waiting',
      currentSol: 1,
      maxSol: 30,
      sharedResources: initialResources,
      activeEvent: null,
      weatherSeed: seed,
      landingZone: 'jezero',
      members,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.matches.set(matchId, match);
    for (const c of candidates) {
      const q = store.queue.get(c.playerId);
      if (q) {
        q.status = 'matched';
        q.matchId = matchId;
      }
    }

    return { status: 'matched', matchId, queueCount: 0, countdownSeconds: null };
  }

  return {
    status: 'waiting',
    queueCount: count,
    countdownSeconds: countdownRemaining,
  };
}

// ── 4. Force Start / Fill with NASA Bots ─────────────────────
export async function forceStartWithBots(playerId: string): Promise<{ matchId: string }> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      const rows = (await sql`
        SELECT player_id, player_name, avatar, preferred_role
        FROM matchmaking_queue
        WHERE player_id = ${playerId}
        LIMIT 1;
      `) as unknown as Array<{
        player_id: string;
        player_name: string;
        avatar: string;
        preferred_role: string;
      }>;

      const p = rows[0] || {
        player_id: playerId,
        player_name: 'COMMANDER',
        avatar: '👨‍🚀',
        preferred_role: 'commander',
      };

      const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const joinCode = generateSquadCode();
      const seed = Math.floor(Math.random() * 899999) + 100000;
      const initialResources = getInitialSharedResources();

      await sql`
        INSERT INTO squad_matches (id, join_code, status, current_sol, shared_resources_json, weather_seed, landing_zone)
        VALUES (${matchId}, ${joinCode}, 'waiting', 1, ${JSON.stringify(initialResources)}::jsonb, ${seed}, 'jezero');
      `;

      // Host player
      await sql`
        INSERT INTO squad_members (match_id, player_id, player_name, avatar, role, is_ready, is_alive, is_bot)
        VALUES (${matchId}, ${p.player_id}, ${p.player_name}, ${p.avatar}, ${(p.preferred_role as SquadRole) || 'commander'}, FALSE, TRUE, FALSE);
      `;

      // 3 Bots
      const botRoles: SquadRole[] = ['engineer', 'medic', 'resource_specialist'];
      for (let i = 0; i < 3; i++) {
        const bot = NASA_AI_BOTS[i];
        await sql`
          INSERT INTO squad_members (match_id, player_id, player_name, avatar, role, is_ready, is_alive, is_bot)
          VALUES (${matchId}, ${`bot-${Date.now()}-${i}`}, ${bot.name}, ${bot.avatar}, ${botRoles[i]}, TRUE, TRUE, TRUE);
        `;
      }

      await sql`
        UPDATE matchmaking_queue
        SET status = 'matched', match_id = ${matchId}
        WHERE player_id = ${playerId};
      `;

      return { matchId };
    } catch (err) {
      console.error('forceStartWithBots sql error:', err);
    }
  }

  // In-Memory
  const store = getMemoryStore();
  const entry = store.queue.get(playerId) || {
    id: Date.now(),
    playerId,
    playerName: 'COMMANDER',
    avatar: '👨‍🚀',
    preferredRole: 'commander' as SquadRole,
    status: 'waiting' as const,
    joinedAt: Date.now(),
    lastPollAt: Date.now(),
  };

  const matchId = `match-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const joinCode = generateSquadCode();
  const seed = Math.floor(Math.random() * 899999) + 100000;
  const initialResources = getInitialSharedResources();

  const members: SquadMember[] = [
    {
      matchId,
      playerId,
      playerName: entry.playerName,
      avatar: entry.avatar,
      role: entry.preferredRole || 'commander',
      isReady: false,
      isAlive: true,
      isBot: false,
      lastSeenAt: Date.now(),
      joinedAt: Date.now(),
    },
  ];

  const botRoles: SquadRole[] = ['engineer', 'medic', 'resource_specialist'];
  for (let i = 0; i < 3; i++) {
    const bot = NASA_AI_BOTS[i];
    members.push({
      matchId,
      playerId: `bot-${Date.now()}-${i}`,
      playerName: bot.name,
      avatar: bot.avatar,
      role: botRoles[i],
      isReady: true,
      isAlive: true,
      isBot: true,
      lastSeenAt: Date.now(),
      joinedAt: Date.now(),
    });
  }

  const match: SquadMatch = {
    id: matchId,
    joinCode,
    status: 'waiting',
    currentSol: 1,
    maxSol: 30,
    sharedResources: initialResources,
    activeEvent: null,
    weatherSeed: seed,
    landingZone: 'jezero',
    members,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.matches.set(matchId, match);
  entry.status = 'matched';
  entry.matchId = matchId;

  return { matchId };
}

// ── 5. Leave / Cancel Matchmaking Queue ─────────────────────
export async function leaveMatchmakingQueue(playerId: string): Promise<void> {
  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        DELETE FROM matchmaking_queue WHERE player_id = ${playerId};
      `;
      return;
    } catch (err) {
      console.error('leaveMatchmakingQueue error:', err);
    }
  }

  const store = getMemoryStore();
  store.queue.delete(playerId);
}

// ── 6. Fetch Full Match State ──────────────────────────────
export async function getMatchState(matchId: string): Promise<SquadMatch | null> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      type MatchRow = {
        id: string;
        join_code: string;
        status: string;
        current_sol: number;
        shared_resources_json: SharedHabitatResources | string;
        active_event_json: unknown;
        weather_seed: number;
        landing_zone: string;
        created_at: string;
        updated_at: string;
      };

      const matchRows = (await sql`
        SELECT id, join_code, status, current_sol, shared_resources_json, active_event_json, weather_seed, landing_zone, created_at, updated_at
        FROM squad_matches
        WHERE id = ${matchId}
        LIMIT 1;
      `) as unknown as MatchRow[];

      if (!matchRows || matchRows.length === 0) return null;
      const m = matchRows[0];

      type MemberRow = {
        player_id: string;
        player_name: string;
        avatar: string;
        role: string;
        is_ready: boolean;
        is_alive: boolean;
        is_bot: boolean;
        last_seen_at: string;
        created_at: string;
      };

      const memberRows = (await sql`
        SELECT player_id, player_name, avatar, role, is_ready, is_alive, is_bot, last_seen_at, created_at
        FROM squad_members
        WHERE match_id = ${matchId}
        ORDER BY created_at ASC;
      `) as unknown as MemberRow[];

      const members: SquadMember[] = memberRows.map((r) => ({
        matchId,
        playerId: r.player_id,
        playerName: r.player_name,
        avatar: r.avatar,
        role: (r.role as SquadRole) || 'commander',
        isReady: Boolean(r.is_ready),
        isAlive: Boolean(r.is_alive),
        isBot: Boolean(r.is_bot),
        lastSeenAt: new Date(r.last_seen_at).getTime(),
        joinedAt: new Date(r.created_at).getTime(),
      }));

      // Fetch last 20 events
      type EventRow = {
        id: number;
        player_id: string;
        event_type: string;
        payload_json: Record<string, unknown> | string;
        created_at: string;
      };

      const eventRows = (await sql`
        SELECT id, player_id, event_type, payload_json, created_at
        FROM match_events
        WHERE match_id = ${matchId}
        ORDER BY created_at ASC
        LIMIT 25;
      `) as unknown as EventRow[];

      const events: MatchEvent[] = eventRows.map((e) => ({
        id: e.id,
        matchId,
        playerId: e.player_id,
        eventType: e.event_type as MatchEvent['eventType'],
        payload: typeof e.payload_json === 'string' ? JSON.parse(e.payload_json) : e.payload_json,
        createdAt: new Date(e.created_at).getTime(),
      }));

      const rawRes = m.shared_resources_json;
      const sharedResources: SharedHabitatResources =
        typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;

      return {
        id: m.id,
        joinCode: m.join_code,
        status: m.status as SquadMatch['status'],
        currentSol: m.current_sol,
        maxSol: 30,
        sharedResources,
        activeEvent: (m.active_event_json as SquadMatch['activeEvent']) || null,
        weatherSeed: m.weather_seed,
        landingZone: (m.landing_zone as LandingSiteId) || 'jezero',
        members,
        events,
        createdAt: new Date(m.created_at).toISOString(),
        updatedAt: new Date(m.updated_at).toISOString(),
      };
    } catch (err) {
      console.error('Neon getMatchState error:', err);
    }
  }

  // In-Memory Fallback
  const store = getMemoryStore();
  const match = store.matches.get(matchId);
  if (!match) return null;

  const events = store.events.get(matchId) || [];
  const comms = store.comms.get(matchId) || [];

  return {
    ...match,
    events,
    comms,
  };
}

// ── 7. Handle In-Match Action ──────────────────────────────
export async function executeMatchAction(
  matchId: string,
  playerId: string,
  actionType:
    | 'READY_TOGGLE'
    | 'ROLE_CHANGE'
    | 'PERFORM_ACTION'
    | 'TACTICAL_CHAT'
    | 'RESOLVE_CRISIS'
    | 'HEARTBEAT'
    | 'BOT_FILL',
  payload: Record<string, unknown>
): Promise<{ success: boolean; match?: SquadMatch; error?: string }> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      // 1. Heartbeat update
      await sql`
        UPDATE squad_members
        SET last_seen_at = NOW()
        WHERE match_id = ${matchId} AND player_id = ${playerId};
      `;

      if (actionType === 'HEARTBEAT') {
        const state = await getMatchState(matchId);
        return { success: true, match: state || undefined };
      }

      // 2. Role Change
      if (actionType === 'ROLE_CHANGE') {
        const desiredRole = payload.role as SquadRole;
        if (!SQUAD_ROLES[desiredRole]) {
          return { success: false, error: 'Invalid role selection.' };
        }

        // Check if role is already claimed by another ready or locked player
        const roleCheck = (await sql`
          SELECT player_id FROM squad_members
          WHERE match_id = ${matchId}
            AND role = ${desiredRole}
            AND player_id != ${playerId};
        `) as unknown as Array<{ player_id: string }>;

        if (roleCheck.length > 0) {
          return { success: false, error: 'Role is already claimed by a squadmate.' };
        }

        await sql`
          UPDATE squad_members
          SET role = ${desiredRole}
          WHERE match_id = ${matchId} AND player_id = ${playerId};
        `;

        await sql`
          INSERT INTO match_events (match_id, player_id, event_type, payload_json)
          VALUES (${matchId}, ${playerId}, 'role_change', ${JSON.stringify({ role: desiredRole })}::jsonb);
        `;
      }

      // 3. Ready Toggle
      if (actionType === 'READY_TOGGLE') {
        const isReady = Boolean(payload.isReady);
        await sql`
          UPDATE squad_members
          SET is_ready = ${isReady}
          WHERE match_id = ${matchId} AND player_id = ${playerId};
        `;

        await sql`
          INSERT INTO match_events (match_id, player_id, event_type, payload_json)
          VALUES (${matchId}, ${playerId}, 'ready_toggle', ${JSON.stringify({ isReady })}::jsonb);
        `;

        // Check if all members are ready -> Start Match!
        const memberCountRows = (await sql`
          SELECT COUNT(*)::int as total,
                 SUM(CASE WHEN is_ready THEN 1 ELSE 0 END)::int as ready_count
          FROM squad_members
          WHERE match_id = ${matchId};
        `) as unknown as Array<{ total: number; ready_count: number }>;

        const { total, ready_count } = memberCountRows[0] || { total: 0, ready_count: 0 };
        if (total >= 2 && total === ready_count) {
          await sql`
            UPDATE squad_matches
            SET status = 'in_progress', updated_at = NOW()
            WHERE id = ${matchId};
          `;

          await sql`
            INSERT INTO match_events (match_id, player_id, event_type, payload_json)
            VALUES (${matchId}, 'SYSTEM', 'match_start', ${JSON.stringify({ message: 'All squad members confirmed ready. Orbital descent initialized.' })}::jsonb);
          `;
        }
      }

      // 4. Tactical Action
      if (actionType === 'PERFORM_ACTION') {
        const deltas = (payload.deltas as Record<string, number>) || {};
        const actionName = (payload.actionName as string) || 'Tactical Action';
        const icon = (payload.icon as string) || '⚡';

        // Load current resources and update
        const matchRow = (await sql`
          SELECT shared_resources_json FROM squad_matches WHERE id = ${matchId} LIMIT 1;
        `) as unknown as Array<{ shared_resources_json: SharedHabitatResources | string }>;

        if (matchRow.length > 0) {
          const current: SharedHabitatResources =
            typeof matchRow[0].shared_resources_json === 'string'
              ? JSON.parse(matchRow[0].shared_resources_json)
              : matchRow[0].shared_resources_json;

          const updated: SharedHabitatResources = {
            power: Math.max(0, Math.min(100, current.power + (deltas.power || 0))),
            oxygen: Math.max(0, Math.min(100, current.oxygen + (deltas.oxygen || 0))),
            water: Math.max(0, Math.min(100, current.water + (deltas.water || 0))),
            shielding: Math.max(0, Math.min(100, current.shielding + (deltas.shielding || 0))),
            morale: Math.max(0, Math.min(100, current.morale + (deltas.morale || 0))),
          };

          const isDefeated = updated.power <= 0 || updated.oxygen <= 0 || updated.shielding <= 0;

          await sql`
            UPDATE squad_matches
            SET shared_resources_json = ${JSON.stringify(updated)}::jsonb,
                status = ${isDefeated ? 'failed' : 'in_progress'},
                updated_at = NOW()
            WHERE id = ${matchId};
          `;

          await sql`
            INSERT INTO match_events (match_id, player_id, event_type, payload_json)
            VALUES (${matchId}, ${playerId}, 'action_perform', ${JSON.stringify({
              actionName,
              icon,
              deltas,
              resources: updated,
            })}::jsonb);
          `;
        }
      }

      // 5. Tactical Chat / Quick Ping
      if (actionType === 'TACTICAL_CHAT') {
        const text = ((payload.text as string) || '').slice(0, 120);
        const isQuickPing = Boolean(payload.isQuickPing);
        const playerName = (payload.playerName as string) || 'Astronaut';
        const role = (payload.role as SquadRole) || 'commander';

        await sql`
          INSERT INTO match_events (match_id, player_id, event_type, payload_json)
          VALUES (${matchId}, ${playerId}, 'tactical_chat', ${JSON.stringify({
            text,
            isQuickPing,
            playerName,
            role,
          })}::jsonb);
        `;
      }

      const updatedState = await getMatchState(matchId);
      return { success: true, match: updatedState || undefined };
    } catch (err) {
      console.error('executeMatchAction error:', err);
      return { success: false, error: 'Database action failure.' };
    }
  }

  // In-Memory Implementation
  const store = getMemoryStore();
  const match = store.matches.get(matchId);
  if (!match) return { success: false, error: 'Match not found.' };

  const member = match.members.find((m) => m.playerId === playerId);
  if (member) member.lastSeenAt = Date.now();

  if (actionType === 'HEARTBEAT') {
    return { success: true, match };
  }

  if (actionType === 'ROLE_CHANGE') {
    const desiredRole = payload.role as SquadRole;
    if (!SQUAD_ROLES[desiredRole]) return { success: false, error: 'Invalid role.' };

    const taken = match.members.some((m) => m.playerId !== playerId && m.role === desiredRole);
    if (taken) return { success: false, error: 'Role is already claimed by a squadmate.' };

    if (member) member.role = desiredRole;
  }

  if (actionType === 'READY_TOGGLE') {
    if (member) member.isReady = Boolean(payload.isReady);
    const readyCount = match.members.filter((m) => m.isReady).length;
    if (match.members.length >= 2 && readyCount === match.members.length) {
      match.status = 'in_progress';
    }
  }

  if (actionType === 'PERFORM_ACTION') {
    const deltas = (payload.deltas as Record<string, number>) || {};
    match.sharedResources.power = Math.max(0, Math.min(100, match.sharedResources.power + (deltas.power || 0)));
    match.sharedResources.oxygen = Math.max(0, Math.min(100, match.sharedResources.oxygen + (deltas.oxygen || 0)));
    match.sharedResources.water = Math.max(0, Math.min(100, match.sharedResources.water + (deltas.water || 0)));
    match.sharedResources.shielding = Math.max(0, Math.min(100, match.sharedResources.shielding + (deltas.shielding || 0)));
    match.sharedResources.morale = Math.max(0, Math.min(100, match.sharedResources.morale + (deltas.morale || 0)));

    if (member) {
      member.lastAction = {
        actionName: (payload.actionName as string) || 'Action',
        timestamp: Date.now(),
        icon: (payload.icon as string) || '⚡',
      };
    }
  }

  if (actionType === 'TACTICAL_CHAT') {
    const commsList = store.comms.get(matchId) || [];
    commsList.push({
      id: `comm-${Date.now()}`,
      matchId,
      playerId,
      playerName: member?.playerName || 'Astronaut',
      role: member?.role || 'commander',
      avatar: member?.avatar || '👨‍🚀',
      text: (payload.text as string) || '',
      isQuickPing: Boolean(payload.isQuickPing),
      createdAt: Date.now(),
    });
    store.comms.set(matchId, commsList);
  }

  match.updatedAt = new Date().toISOString();
  return { success: true, match };
}
