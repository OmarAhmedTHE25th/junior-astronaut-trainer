// ─── Junior Astronaut Mission Trainer – Orbital Guilds Storage Engine ───
// Neon Postgres serverless database client with atomic in-memory fallback.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getConnectionString } from './storageAdapter';
import type { Guild, GuildMember, GuildRole } from './guildTypes';
import { calculateBuffLevel, MAX_GUILD_MEMBERS, validateGuildName, validateGuildTag } from './guildTypes';

// Initial starter guilds for fallback & empty state bootstrapping
const STARTER_GUILDS: Guild[] = [
  {
    id: 'guild-olympus-mars',
    name: 'Olympus Orbital Alliance',
    tag: 'MARS',
    emblem: '🪐',
    motto: 'Reaching highest peaks across the red sands.',
    leaderId: 'legend-ride',
    treasuryMC: 16800,
    totalGuildScore: 23400,
    buffLevel: 5,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        cadetId: 'legend-ride',
        callsign: 'CDR-RIDE',
        avatar: '👩‍🚀',
        role: 'leader',
        contributedMC: 7500,
        contributedScore: 9200,
        joinedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      },
      {
        cadetId: 'legend-glenn',
        callsign: 'CDR-GLENN',
        avatar: '🚀',
        role: 'officer',
        contributedMC: 5200,
        contributedScore: 7800,
        joinedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      },
      {
        cadetId: 'legend-chawla',
        callsign: 'CDR-CHAWLA',
        avatar: '👩‍🚀',
        role: 'member',
        contributedMC: 4100,
        contributedScore: 6400,
        joinedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
  },
  {
    id: 'guild-ares-vanguard',
    name: 'Ares Vanguard',
    tag: 'ARES',
    emblem: '🛡️',
    motto: 'First to colonize, last to yield.',
    leaderId: 'legend-armstrong',
    treasuryMC: 4200,
    totalGuildScore: 14850,
    buffLevel: 3,
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        cadetId: 'legend-armstrong',
        callsign: 'CDR-ARMSTRONG',
        avatar: '👨‍🚀',
        role: 'leader',
        contributedMC: 2500,
        contributedScore: 8200,
        joinedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      },
      {
        cadetId: 'legend-collins',
        callsign: 'CDR-COLLINS',
        avatar: '🛸',
        role: 'officer',
        contributedMC: 1700,
        contributedScore: 6650,
        joinedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      },
    ],
  },
  {
    id: 'guild-phobos-legion',
    name: 'Phobos Frontier Legion',
    tag: 'PFL',
    emblem: '⚡',
    motto: 'Silent orbits, swift execution.',
    leaderId: 'legend-aldrin',
    treasuryMC: 1850,
    totalGuildScore: 8600,
    buffLevel: 2,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      {
        cadetId: 'legend-aldrin',
        callsign: 'CDR-ALDRIN',
        avatar: '🪐',
        role: 'leader',
        contributedMC: 1200,
        contributedScore: 5200,
        joinedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
      {
        cadetId: 'legend-orion',
        callsign: 'CADET-ORION',
        avatar: '🛰️',
        role: 'member',
        contributedMC: 650,
        contributedScore: 3400,
        joinedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
  },
];

interface MemoryGuildStore {
  guilds: Map<string, Guild>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_guilds_store__: MemoryGuildStore | undefined;
  // eslint-disable-next-line no-var
  var __jat_guilds_schema_ready__: boolean | undefined;
}

function getMemoryStore(): MemoryGuildStore {
  if (!globalThis.__jat_guilds_store__) {
    const map = new Map<string, Guild>();
    for (const g of STARTER_GUILDS) {
      map.set(g.id, JSON.parse(JSON.stringify(g)));
    }
    globalThis.__jat_guilds_store__ = { guilds: map };
  }
  return globalThis.__jat_guilds_store__;
}

async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;

  try {
    const sql = neon(connStr);
    await ensureGuildSchema(sql);
    return sql;
  } catch (err) {
    console.warn('Neon PostgreSQL unavailable, using in-memory guild store:', err);
    return null;
  }
}

let guildSchemaPromise: Promise<void> | null = null;

/**
 * Idempotent schema provisioning for Neon Postgres
 * Gated behind a module-level promise to guarantee single execution per cold start.
 */
export async function ensureGuildSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_guilds_schema_ready__) return;

  if (!guildSchemaPromise) {
    guildSchemaPromise = (async () => {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS guilds (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(64) NOT NULL UNIQUE,
            tag VARCHAR(16) NOT NULL,
            emblem VARCHAR(32) NOT NULL DEFAULT '🛡️',
            motto TEXT NOT NULL DEFAULT '',
            leader_id VARCHAR(64) NOT NULL,
            treasury_mc INT NOT NULL DEFAULT 0,
            total_guild_score INT NOT NULL DEFAULT 0,
            buff_level INT NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS guild_members (
            guild_id VARCHAR(64) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
            cadet_id VARCHAR(64) NOT NULL UNIQUE,
            callsign VARCHAR(64) NOT NULL,
            avatar VARCHAR(32) NOT NULL DEFAULT '👨‍🚀',
            role VARCHAR(16) NOT NULL DEFAULT 'member',
            contributed_mc INT NOT NULL DEFAULT 0,
            contributed_score INT NOT NULL DEFAULT 0,
            joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (guild_id, cadet_id)
          );
        `;

        // Seed default starter guilds if table is empty
        const countResult = await sql`SELECT COUNT(*)::int as count FROM guilds;`;
        if (countResult && countResult[0] && countResult[0].count === 0) {
          for (const g of STARTER_GUILDS) {
            await sql`
              INSERT INTO guilds (id, name, tag, emblem, motto, leader_id, treasury_mc, total_guild_score, buff_level, created_at, updated_at)
              VALUES (${g.id}, ${g.name}, ${g.tag}, ${g.emblem}, ${g.motto}, ${g.leaderId}, ${g.treasuryMC}, ${g.totalGuildScore}, ${g.buffLevel}, ${g.createdAt}, ${g.updatedAt})
              ON CONFLICT (id) DO NOTHING;
            `;
            for (const m of g.members) {
              await sql`
                INSERT INTO guild_members (guild_id, cadet_id, callsign, avatar, role, contributed_mc, contributed_score, joined_at)
                VALUES (${g.id}, ${m.cadetId}, ${m.callsign}, ${m.avatar}, ${m.role}, ${m.contributedMC}, ${m.contributedScore}, ${m.joinedAt})
                ON CONFLICT (guild_id, cadet_id) DO NOTHING;
              `;
            }
          }
        }

        globalThis.__jat_guilds_schema_ready__ = true;
      } catch (err) {
        guildSchemaPromise = null;
        console.error('Failed to ensure guild database schema:', err);
      }
    })();
  }

  await guildSchemaPromise;
}

/**
 * Fetch all guilds ordered by totalGuildScore DESC, treasuryMC DESC
 */
export async function getAllGuilds(): Promise<Guild[]> {
  const sql = await getSqlClient();

  if (sql) {
    try {
      type GuildRow = {
        id: string;
        name: string;
        tag: string;
        emblem: string;
        motto: string;
        leader_id: string;
        treasury_mc: number;
        total_guild_score: number;
        buff_level: number;
        created_at: string;
        updated_at: string;
      };

      type MemberRow = {
        guild_id: string;
        cadet_id: string;
        callsign: string;
        avatar: string;
        role: GuildRole;
        contributed_mc: number;
        contributed_score: number;
        joined_at: string;
      };

      const [guildRows, memberRows] = (await Promise.all([
        sql`SELECT * FROM guilds ORDER BY total_guild_score DESC, treasury_mc DESC;`,
        sql`SELECT * FROM guild_members ORDER BY contributed_score DESC, contributed_mc DESC;`,
      ])) as unknown as [GuildRow[], MemberRow[]];

      const membersByGuild = new Map<string, GuildMember[]>();
      for (const m of memberRows) {
        const list = membersByGuild.get(m.guild_id) || [];
        list.push({
          cadetId: m.cadet_id,
          callsign: m.callsign,
          avatar: m.avatar,
          role: m.role,
          contributedMC: Number(m.contributed_mc) || 0,
          contributedScore: Number(m.contributed_score) || 0,
          joinedAt: m.joined_at,
        });
        membersByGuild.set(m.guild_id, list);
      }

      return guildRows.map((g) => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        emblem: g.emblem,
        motto: g.motto || '',
        leaderId: g.leader_id,
        treasuryMC: Number(g.treasury_mc) || 0,
        totalGuildScore: Number(g.total_guild_score) || 0,
        buffLevel: Number(g.buff_level) || calculateBuffLevel(Number(g.treasury_mc) || 0),
        createdAt: g.created_at,
        updatedAt: g.updated_at,
        members: membersByGuild.get(g.id) || [],
      }));
    } catch (err) {
      console.error('Neon getAllGuilds error:', err);
    }
  }

  const store = getMemoryStore();
  const all = Array.from(store.guilds.values());
  return all.sort((a, b) => b.totalGuildScore - a.totalGuildScore || b.treasuryMC - a.treasuryMC);
}

/**
 * Fetch a guild by its ID
 */
export async function getGuildById(guildId: string): Promise<Guild | null> {
  const all = await getAllGuilds();
  return all.find((g) => g.id === guildId) || null;
}

/**
 * Fetch the active guild for a cadet ID
 */
export async function getGuildByCadetId(cadetId: string): Promise<Guild | null> {
  if (!cadetId) return null;
  const all = await getAllGuilds();
  return all.find((g) => g.members.some((m) => m.cadetId === cadetId)) || null;
}

/**
 * Create a new guild with founder as leader
 */
export async function createGuild(params: {
  name: string;
  tag: string;
  emblem: string;
  motto?: string;
  leaderId: string;
  leaderCallsign: string;
  leaderAvatar: string;
}): Promise<Guild> {
  const name = params.name.trim();
  const tag = params.tag.trim().toUpperCase();
  const emblem = params.emblem.trim() || '🛡️';
  const motto = (params.motto || '').trim();

  if (!validateGuildName(name)) {
    throw new Error('Guild name must be between 3 and 24 characters');
  }
  if (!validateGuildTag(tag)) {
    throw new Error('Guild tag must be 2 to 4 uppercase alphanumeric characters (e.g., ARES, MARS)');
  }

  const existingGuild = await getGuildByCadetId(params.leaderId);
  if (existingGuild) {
    throw new Error(`Cadet is already enlisted in guild [${existingGuild.tag}] ${existingGuild.name}`);
  }

  const all = await getAllGuilds();
  if (all.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Guild name "${name}" is already registered`);
  }
  if (all.some((g) => g.tag.toUpperCase() === tag.toUpperCase())) {
    throw new Error(`Guild tag "[${tag}]" is already in use by another alliance`);
  }

  const guildId = `guild-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newGuild: Guild = {
    id: guildId,
    name,
    tag,
    emblem,
    motto,
    leaderId: params.leaderId,
    treasuryMC: 0,
    totalGuildScore: 0,
    buffLevel: 1,
    createdAt: now,
    updatedAt: now,
    members: [
      {
        cadetId: params.leaderId,
        callsign: params.leaderCallsign,
        avatar: params.leaderAvatar,
        role: 'leader',
        contributedMC: 0,
        contributedScore: 0,
        joinedAt: now,
      },
    ],
  };

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO guilds (id, name, tag, emblem, motto, leader_id, treasury_mc, total_guild_score, buff_level, created_at, updated_at)
        VALUES (${newGuild.id}, ${newGuild.name}, ${newGuild.tag}, ${newGuild.emblem}, ${newGuild.motto}, ${newGuild.leaderId}, 0, 0, 1, ${now}, ${now});
      `;
      await sql`
        INSERT INTO guild_members (guild_id, cadet_id, callsign, avatar, role, contributed_mc, contributed_score, joined_at)
        VALUES (${newGuild.id}, ${params.leaderId}, ${params.leaderCallsign}, ${params.leaderAvatar}, 'leader', 0, 0, ${now});
      `;
      return newGuild;
    } catch (err) {
      console.error('Neon createGuild error:', err);
    }
  }

  const store = getMemoryStore();
  store.guilds.set(guildId, newGuild);
  return newGuild;
}

/**
 * Join an existing guild (cap at 20 members)
 */
export async function joinGuild(
  guildId: string,
  cadet: { cadetId: string; callsign: string; avatar: string }
): Promise<Guild> {
  const existing = await getGuildByCadetId(cadet.cadetId);
  if (existing) {
    throw new Error(`Cadet is already a member of [${existing.tag}] ${existing.name}`);
  }

  const target = await getGuildById(guildId);
  if (!target) {
    throw new Error('Target guild not found');
  }

  if (target.members.length >= MAX_GUILD_MEMBERS) {
    throw new Error(`Guild has reached maximum member capacity (${MAX_GUILD_MEMBERS})`);
  }

  const now = new Date().toISOString();
  const newMember: GuildMember = {
    cadetId: cadet.cadetId,
    callsign: cadet.callsign,
    avatar: cadet.avatar || '👨‍🚀',
    role: 'member',
    contributedMC: 0,
    contributedScore: 0,
    joinedAt: now,
  };

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        INSERT INTO guild_members (guild_id, cadet_id, callsign, avatar, role, contributed_mc, contributed_score, joined_at)
        VALUES (${guildId}, ${newMember.cadetId}, ${newMember.callsign}, ${newMember.avatar}, 'member', 0, 0, ${now});
      `;
      const updated = await getGuildById(guildId);
      if (updated) return updated;
    } catch (err) {
      console.error('Neon joinGuild error:', err);
    }
  }

  const store = getMemoryStore();
  const guild = store.guilds.get(guildId);
  if (guild) {
    guild.members.push(newMember);
    guild.updatedAt = now;
    return guild;
  }
  return target;
}

/**
 * Leave current guild. If leader leaves, promotes next officer/member or deletes if empty.
 */
export async function leaveGuild(
  guildId: string,
  cadetId: string
): Promise<{ disbanded: boolean; newLeaderId?: string }> {
  const guild = await getGuildById(guildId);
  if (!guild) {
    throw new Error('Guild not found');
  }

  const memberIndex = guild.members.findIndex((m) => m.cadetId === cadetId);
  if (memberIndex === -1) {
    throw new Error('Cadet is not a member of this guild');
  }

  const remaining = guild.members.filter((m) => m.cadetId !== cadetId);
  const isLeader = guild.leaderId === cadetId;
  const disbanded = remaining.length === 0;
  let newLeaderId: string | undefined = undefined;

  if (isLeader && !disbanded) {
    // Prefer next officer, else oldest member
    const officer = remaining.find((m) => m.role === 'officer');
    const successor = officer || remaining[0];
    successor.role = 'leader';
    newLeaderId = successor.cadetId;
  }

  const sql = await getSqlClient();
  if (sql) {
    try {
      if (disbanded) {
        await sql`DELETE FROM guilds WHERE id = ${guildId};`;
      } else {
        await sql`DELETE FROM guild_members WHERE guild_id = ${guildId} AND cadet_id = ${cadetId};`;
        if (newLeaderId) {
          await sql`
            UPDATE guilds
            SET leader_id = ${newLeaderId}, updated_at = NOW()
            WHERE id = ${guildId};
          `;
          await sql`
            UPDATE guild_members
            SET role = 'leader'
            WHERE guild_id = ${guildId} AND cadet_id = ${newLeaderId};
          `;
        }
      }
      return { disbanded, newLeaderId };
    } catch (err) {
      console.error('Neon leaveGuild error:', err);
    }
  }

  const store = getMemoryStore();
  if (disbanded) {
    store.guilds.delete(guildId);
  } else {
    const memGuild = store.guilds.get(guildId);
    if (memGuild) {
      memGuild.members = remaining;
      if (newLeaderId) {
        memGuild.leaderId = newLeaderId;
      }
      memGuild.updatedAt = new Date().toISOString();
    }
  }

  return { disbanded, newLeaderId };
}

/**
 * Donate Mars Credits to Guild Treasury
 */
export async function donateToGuild(
  guildId: string,
  cadetId: string,
  amount: number
): Promise<{ guild: Guild; member: GuildMember }> {
  if (amount <= 0) {
    throw new Error('Donation amount must be greater than 0');
  }

  const guild = await getGuildById(guildId);
  if (!guild) {
    throw new Error('Guild not found');
  }

  const member = guild.members.find((m) => m.cadetId === cadetId);
  if (!member) {
    throw new Error('Cadet is not an active member of this guild');
  }

  const newTreasury = guild.treasuryMC + amount;
  const newBuffLevel = calculateBuffLevel(newTreasury);
  const now = new Date().toISOString();

  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        UPDATE guilds
        SET treasury_mc = treasury_mc + ${amount},
            buff_level = ${newBuffLevel},
            updated_at = ${now}
        WHERE id = ${guildId};
      `;
      await sql`
        UPDATE guild_members
        SET contributed_mc = contributed_mc + ${amount}
        WHERE guild_id = ${guildId} AND cadet_id = ${cadetId};
      `;

      const updated = await getGuildById(guildId);
      const updatedMember = updated?.members.find((m) => m.cadetId === cadetId);
      if (updated && updatedMember) {
        return { guild: updated, member: updatedMember };
      }
    } catch (err) {
      console.error('Neon donateToGuild error:', err);
    }
  }

  const store = getMemoryStore();
  const memGuild = store.guilds.get(guildId);
  if (memGuild) {
    memGuild.treasuryMC = newTreasury;
    memGuild.buffLevel = newBuffLevel;
    memGuild.updatedAt = now;
    const memMember = memGuild.members.find((m) => m.cadetId === cadetId);
    if (memMember) {
      memMember.contributedMC += amount;
      return { guild: memGuild, member: memMember };
    }
  }

  member.contributedMC += amount;
  guild.treasuryMC = newTreasury;
  guild.buffLevel = newBuffLevel;
  return { guild, member };
}

/**
 * Contribute mission completion score to guild
 */
export async function contributeScoreToGuild(cadetId: string, score: number): Promise<Guild | null> {
  if (score <= 0 || !cadetId) return null;

  const guild = await getGuildByCadetId(cadetId);
  if (!guild) return null;

  const now = new Date().toISOString();
  const sql = await getSqlClient();
  if (sql) {
    try {
      await sql`
        UPDATE guilds
        SET total_guild_score = total_guild_score + ${score},
            updated_at = ${now}
        WHERE id = ${guild.id};
      `;
      await sql`
        UPDATE guild_members
        SET contributed_score = contributed_score + ${score}
        WHERE guild_id = ${guild.id} AND cadet_id = ${cadetId};
      `;
      return await getGuildById(guild.id);
    } catch (err) {
      console.error('Neon contributeScoreToGuild error:', err);
    }
  }

  const store = getMemoryStore();
  const memGuild = store.guilds.get(guild.id);
  if (memGuild) {
    memGuild.totalGuildScore += score;
    memGuild.updatedAt = now;
    const memMember = memGuild.members.find((m) => m.cadetId === cadetId);
    if (memMember) {
      memMember.contributedScore += score;
    }
    return memGuild;
  }

  return guild;
}

/**
 * Remove cadet completely from all guilds (used on account deletion)
 */
export async function removeCadetFromGuilds(cadetId: string): Promise<void> {
  if (!cadetId) return;

  try {
    const guild = await getGuildByCadetId(cadetId);
    if (guild) {
      await leaveGuild(guild.id, cadetId);
    }
  } catch (err) {
    console.warn('removeCadetFromGuilds error:', err);
  }
}
