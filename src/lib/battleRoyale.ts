// ─── Junior Astronaut Mission Trainer – Battle Royale & Companion Engine ───
// Neon Serverless PostgreSQL with atomic zone calculations, ELO ladder,
// companion pet progression, and in-memory fallback.

import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { getConnectionString } from './storageAdapter';
import {
  RANK_TIERS,
  PET_CATALOG,
  BOOST_CATALOG,
  type RankTier,
  type RankMeta,
  type PlayerPet,
  type BoostSlug,
  type PlayerBoostInventory,
  type BRMatch,
  type BRMatchPlayer,
  type BRSector,
  type CommanderProfile,
  type PetRarity,
} from './battleRoyaleTypes';

// Grid Dimensions
export const GRID_SIZE = 6; // 6x6 = 36 sectors

// Initial Storm Radius (covers whole grid initially)
export const INITIAL_STORM_RADIUS = 4.2;

const SECTOR_NAMES: Record<string, { name: string; elevation: string; loot: 'low' | 'medium' | 'high' | 'supply_drop' }> = {
  '0,0': { name: 'Northern Ice Caps', elevation: '-4.2 km', loot: 'medium' },
  '0,1': { name: 'Planum Boreum Glaciers', elevation: '-3.8 km', loot: 'medium' },
  '0,2': { name: 'Arcadia Planitia Plains', elevation: '-2.1 km', loot: 'low' },
  '0,3': { name: 'Utopia Basin Impact', elevation: '-5.0 km', loot: 'high' },
  '0,4': { name: 'Isidis Planitia Outpost', elevation: '-3.5 km', loot: 'medium' },
  '0,5': { name: 'Jezero River Delta', elevation: '-2.5 km', loot: 'high' },
  '1,0': { name: 'Abandoned Rover Bay', elevation: '-1.8 km', loot: 'high' },
  '1,1': { name: 'Mawrth Vallis Clay Beds', elevation: '-1.2 km', loot: 'medium' },
  '1,2': { name: 'Oxia Planum Landing Site', elevation: '-2.0 km', loot: 'low' },
  '1,3': { name: 'Arabia Terra Dunes', elevation: '1.5 km', loot: 'low' },
  '1,4': { name: 'Syrtis Major Shield Volcano', elevation: '2.8 km', loot: 'medium' },
  '1,5': { name: 'Nili Fossae Fractures', elevation: '-0.5 km', loot: 'high' },
  '2,0': { name: 'Olympus Mons Basecamp', elevation: '4.5 km', loot: 'medium' },
  '2,1': { name: 'Olympus Caldera Summit', elevation: '21.2 km', loot: 'supply_drop' },
  '2,2': { name: 'Tharsis Volcanic Plateau', elevation: '8.0 km', loot: 'high' },
  '2,3': { name: 'Valles Marineris West Rim', elevation: '3.0 km', loot: 'high' },
  '2,4': { name: 'Valles Marineris Grand Chasm', elevation: '-7.0 km', loot: 'supply_drop' },
  '2,5': { name: 'Noctis Labyrinthus Canyons', elevation: '2.0 km', loot: 'medium' },
  '3,0': { name: 'Gale Crater Rim Wall', elevation: '1.2 km', loot: 'medium' },
  '3,1': { name: 'Mount Sharp Research Peak', elevation: '5.5 km', loot: 'high' },
  '3,2': { name: 'Elysium Mons Volcanic Cone', elevation: '13.8 km', loot: 'high' },
  '3,3': { name: 'Cerberus Fossae Fissures', elevation: '-1.0 km', loot: 'medium' },
  '3,4': { name: 'Medusae Fossae Wind Sculpt', elevation: '0.8 km', loot: 'low' },
  '3,5': { name: 'Gusev Crater Spirit Station', elevation: '-1.9 km', loot: 'medium' },
  '4,0': { name: 'Hellas Basin Northern Rim', elevation: '2.0 km', loot: 'medium' },
  '4,1': { name: 'Hellas Impact Deep Abyss', elevation: '-7.1 km', loot: 'supply_drop' },
  '4,2': { name: 'Argyre Planitia Frozen Sea', elevation: '-3.0 km', loot: 'medium' },
  '4,3': { name: 'Argyre Mountain Ring', elevation: '3.5 km', loot: 'low' },
  '4,4': { name: 'Noachis Terra Ancient Crust', elevation: '2.2 km', loot: 'low' },
  '4,5': { name: 'Promethei Terra Crater Fields', elevation: '1.0 km', loot: 'low' },
  '5,0': { name: 'South Polar Chasma Geysers', elevation: '-2.0 km', loot: 'high' },
  '5,1': { name: 'Planum Australe Dry-Ice Plain', elevation: '-1.5 km', loot: 'high' },
  '5,2': { name: 'Cimmeria High-Rad Shelf', elevation: '3.0 km', loot: 'medium' },
  '5,3': { name: 'Sirenum Fossae Magnetic Fault', elevation: '1.8 km', loot: 'medium' },
  '5,4': { name: 'Daedalia Lava Flows', elevation: '4.0 km', loot: 'low' },
  '5,5': { name: 'Southern CO2 Ice Shelf', elevation: '-1.0 km', loot: 'high' },
};

export function buildGridSectors(
  stormCenterX: number,
  stormCenterY: number,
  stormRadius: number
): BRSector[] {
  const sectors: BRSector[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const key = `${x},${y}`;
      const meta = SECTOR_NAMES[key] || {
        name: `Sector [${x},${y}]`,
        elevation: '0.0 km',
        loot: 'low' as const,
      };

      const dist = Math.sqrt((x - stormCenterX) ** 2 + (y - stormCenterY) ** 2);
      const isStormZone = dist > stormRadius;
      const radiationLevel = isStormZone ? Math.round(dist * 25) : 5;

      sectors.push({
        x,
        y,
        name: meta.name,
        elevation: meta.elevation,
        lootTier: meta.loot,
        hasSupplyDrop: meta.loot === 'supply_drop',
        isStormZone,
        radiationLevel,
      });
    }
  }
  return sectors;
}

// In-Memory Store Fallback
interface MemoryBRStore {
  profiles: Map<string, CommanderProfile>;
  pets: Map<string, PlayerPet[]>;
  boosts: Map<string, PlayerBoostInventory[]>;
  matches: Map<string, BRMatch>;
}

declare global {
  // eslint-disable-next-line no-var
  var __jat_br_store__: MemoryBRStore | undefined;
  // eslint-disable-next-line no-var
  var __jat_br_schema_ready__: boolean | undefined;
}

function getMemoryStore(): MemoryBRStore {
  if (!globalThis.__jat_br_store__) {
    globalThis.__jat_br_store__ = {
      profiles: new Map(),
      pets: new Map(),
      boosts: new Map(),
      matches: new Map(),
    };
  }
  return globalThis.__jat_br_store__;
}

async function getSqlClient(): Promise<NeonQueryFunction<false, false> | null> {
  const connStr = getConnectionString();
  if (!connStr) return null;
  try {
    const sql = neon(connStr);
    await ensureBRSchema(sql);
    return sql;
  } catch (err) {
    console.warn('PostgreSQL unavailable, using in-memory battle royale store:', err);
    return null;
  }
}

/**
 * Idempotent Neon PostgreSQL schema migration for Battle Royale, Pets & Boosts.
 */
export async function ensureBRSchema(sql: NeonQueryFunction<false, false>): Promise<void> {
  if (globalThis.__jat_br_schema_ready__) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS player_profiles (
        player_id VARCHAR(64) PRIMARY KEY,
        username TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '👨‍🚀',
        rank_tier VARCHAR(32) NOT NULL DEFAULT 'dust_walker',
        rank_points INT NOT NULL DEFAULT 100,
        matches_played INT NOT NULL DEFAULT 0,
        wins INT NOT NULL DEFAULT 0,
        best_sols INT NOT NULL DEFAULT 0,
        equipped_pet_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS player_pets (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL,
        pet_slug VARCHAR(64) NOT NULL,
        nickname TEXT NOT NULL,
        rarity VARCHAR(16) NOT NULL DEFAULT 'common',
        level INT NOT NULL DEFAULT 1,
        xp INT NOT NULL DEFAULT 0,
        perk_type VARCHAR(32) NOT NULL,
        perk_value INT NOT NULL DEFAULT 15,
        is_listed_on_market BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS player_boosts (
        id VARCHAR(64) PRIMARY KEY,
        player_id VARCHAR(64) NOT NULL,
        boost_slug VARCHAR(32) NOT NULL,
        quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
        UNIQUE (player_id, boost_slug)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS br_matches (
        id VARCHAR(64) PRIMARY KEY,
        status VARCHAR(16) NOT NULL DEFAULT 'lobby',
        current_zone_radius REAL NOT NULL DEFAULT 4.2,
        storm_center_x INT NOT NULL DEFAULT 2,
        storm_center_y INT NOT NULL DEFAULT 2,
        shrink_stage INT NOT NULL DEFAULT 0,
        next_shrink_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        alive_count INT NOT NULL DEFAULT 16,
        winner_player_id TEXT,
        winner_username TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS br_match_players (
        id VARCHAR(64) PRIMARY KEY,
        match_id VARCHAR(64) NOT NULL REFERENCES br_matches(id) ON DELETE CASCADE,
        player_id VARCHAR(64) NOT NULL,
        username TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '👨‍🚀',
        sector_x INT NOT NULL DEFAULT 0,
        sector_y INT NOT NULL DEFAULT 0,
        power INT NOT NULL DEFAULT 100,
        oxygen INT NOT NULL DEFAULT 100,
        shielding INT NOT NULL DEFAULT 100,
        hull INT NOT NULL DEFAULT 100,
        placement INT,
        status VARCHAR(16) NOT NULL DEFAULT 'alive',
        kills INT NOT NULL DEFAULT 0,
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        active_boosts_json JSONB DEFAULT '[]'::jsonb,
        pet_snapshot_json JSONB DEFAULT '{}'::jsonb
      );
    `;

    globalThis.__jat_br_schema_ready__ = true;
  } catch (err) {
    console.error('Failed to create battle royale schema:', err);
    throw err;
  }
}

/**
 * Calculate Rank Tier from RP.
 */
export function getRankTierFromRP(rp: number): RankTier {
  if (rp >= 2500) return 'olympus_conqueror';
  if (rp >= 2000) return 'red_planet_sovereign';
  if (rp >= 1500) return 'ares_tactician';
  if (rp >= 1000) return 'phobos_vanguard';
  if (rp >= 500) return 'crater_scout';
  return 'dust_walker';
}

/**
 * 1. Get or Create Persistent Commander Profile
 */
export async function getOrCreateCommanderProfile(
  playerId: string,
  username?: string,
  avatar?: string
): Promise<CommanderProfile> {
  const cleanUser = username?.trim() || 'CDR-NOVA';
  const cleanAvatar = avatar || '👨‍🚀';

  const pets = await getPlayerPets(playerId);
  const boosts = await getPlayerBoosts(playerId);

  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      INSERT INTO player_profiles (
        player_id, username, avatar, rank_tier, rank_points, matches_played, wins, best_sols, equipped_pet_id
      ) VALUES (
        ${playerId}, ${cleanUser}, ${cleanAvatar}, 'dust_walker', 100, 0, 0, 0,
        ${pets[0]?.id || null}
      )
      ON CONFLICT (player_id) DO UPDATE SET username = EXCLUDED.username
      RETURNING *;
    `;

    const r = rows[0];
    const tier = getRankTierFromRP(r.rank_points);
    const equipped = pets.find((p) => p.id === r.equipped_pet_id) || pets[0] || null;

    return {
      playerId: r.player_id,
      username: r.username,
      avatar: r.avatar,
      rankTier: tier,
      rankPoints: r.rank_points,
      rankMeta: RANK_TIERS[tier],
      matchesPlayed: r.matches_played,
      wins: r.wins,
      winRate: r.matches_played > 0 ? Math.round((r.wins / r.matches_played) * 100) : 0,
      bestSols: r.best_sols,
      equippedPet: equipped,
      pets,
      boosts,
      marketplaceNetWorth: 500 + pets.length * 200,
      recentMatches: [
        {
          matchId: 'br-demo-1',
          placement: 1,
          rpChange: 115,
          kills: 4,
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          matchId: 'br-demo-2',
          placement: 3,
          rpChange: 72,
          kills: 2,
          timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        },
      ],
    };
  }

  // Memory fallback
  const mem = getMemoryStore();
  let profile = mem.profiles.get(playerId);
  if (!profile) {
    const tier: RankTier = 'dust_walker';
    profile = {
      playerId,
      username: cleanUser,
      avatar: cleanAvatar,
      rankTier: tier,
      rankPoints: 100,
      rankMeta: RANK_TIERS[tier],
      matchesPlayed: 0,
      wins: 0,
      winRate: 0,
      bestSols: 0,
      equippedPet: pets[0] || null,
      pets,
      boosts,
      marketplaceNetWorth: 500 + pets.length * 200,
      recentMatches: [],
    };
    mem.profiles.set(playerId, profile);
  }
  return profile;
}

/**
 * 2. Get or Grant Companion Pets (Auto-grants Rover-Cat starter if empty)
 */
export async function getPlayerPets(playerId: string): Promise<PlayerPet[]> {
  const sql = await getSqlClient();

  if (sql) {
    let rows = await sql`
      SELECT * FROM player_pets
      WHERE owner_id = ${playerId}
      ORDER BY level DESC, xp DESC;
    `;

    if (!rows || rows.length === 0) {
      const starterId = `pet-${Date.now()}-starter`;
      await sql`
        INSERT INTO player_pets (
          id, owner_id, pet_slug, nickname, rarity, level, xp, perk_type, perk_value
        ) VALUES (
          ${starterId}, ${playerId}, 'rover-cat', 'Rover-Cat Unit Alpha', 'rare', 1, 0, 'o2_scavenge', 15
        );
      `;
      rows = await sql`SELECT * FROM player_pets WHERE owner_id = ${playerId};`;
    }

    return rows.map((r) => ({
      id: r.id,
      ownerId: r.owner_id,
      petSlug: r.pet_slug,
      nickname: r.nickname,
      rarity: r.rarity as PetRarity,
      level: r.level,
      xp: r.xp,
      perkType: r.perk_type,
      perkValue: r.perk_value,
      isListedOnMarket: r.is_listed_on_market,
      avatar: PET_CATALOG[r.pet_slug]?.avatar || '🐾',
    }));
  }

  // Memory fallback
  const mem = getMemoryStore();
  let list = mem.pets.get(playerId);
  if (!list || list.length === 0) {
    list = [
      {
        id: `pet-mem-rover-cat`,
        ownerId: playerId,
        petSlug: 'rover-cat',
        nickname: 'Rover-Cat Unit Alpha',
        rarity: 'rare',
        level: 1,
        xp: 0,
        perkType: 'o2_scavenge',
        perkValue: 15,
        isListedOnMarket: false,
        avatar: '🐱',
      },
    ];
    mem.pets.set(playerId, list);
  }
  return list;
}

/**
 * 3. Equip Companion Pet
 */
export async function equipPet(playerId: string, petId: string): Promise<void> {
  const sql = await getSqlClient();
  if (sql) {
    await sql`
      UPDATE player_profiles
      SET equipped_pet_id = ${petId}
      WHERE player_id = ${playerId};
    `;
  } else {
    const mem = getMemoryStore();
    const prof = mem.profiles.get(playerId);
    const pets = mem.pets.get(playerId) || [];
    const target = pets.find((p) => p.id === petId);
    if (prof && target) {
      prof.equippedPet = target;
    }
  }
}

/**
 * 4. Get or Grant Tactical Boosts (Auto-grants 2x starter boosts)
 */
export async function getPlayerBoosts(playerId: string): Promise<PlayerBoostInventory[]> {
  const sql = await getSqlClient();

  if (sql) {
    let rows = await sql`
      SELECT * FROM player_boosts
      WHERE player_id = ${playerId};
    `;

    if (!rows || rows.length === 0) {
      const slugs: BoostSlug[] = [
        'cryo-o2-stim',
        'lead-lined-nanogel',
        'overclock-capacitor',
        'emp-jammer',
      ];
      for (const slug of slugs) {
        const id = `boost-${Date.now()}-${slug}`;
        await sql`
          INSERT INTO player_boosts (id, player_id, boost_slug, quantity)
          VALUES (${id}, ${playerId}, ${slug}, 2)
          ON CONFLICT (player_id, boost_slug) DO NOTHING;
        `;
      }
      rows = await sql`SELECT * FROM player_boosts WHERE player_id = ${playerId};`;
    }

    return rows.map((r) => ({
      id: r.id,
      playerId: r.player_id,
      boostSlug: r.boost_slug as BoostSlug,
      quantity: r.quantity,
    }));
  }

  // Memory fallback
  const mem = getMemoryStore();
  let list = mem.boosts.get(playerId);
  if (!list || list.length === 0) {
    list = [
      { id: 'b1', playerId, boostSlug: 'cryo-o2-stim', quantity: 2 },
      { id: 'b2', playerId, boostSlug: 'lead-lined-nanogel', quantity: 2 },
      { id: 'b3', playerId, boostSlug: 'overclock-capacitor', quantity: 2 },
      { id: 'b4', playerId, boostSlug: 'emp-jammer', quantity: 2 },
    ];
    mem.boosts.set(playerId, list);
  }
  return list;
}

/**
 * 5. Start / Queue Battle Royale Match ("Drop Zone: Olympus")
 * Creates match, sets storm center, populates grid, and backfills with NASA AI bots.
 */
export async function createOrQueueBRMatch(options: {
  playerId: string;
  username: string;
  avatar?: string;
  equippedPetId?: string;
  activeBoosts?: BoostSlug[];
}): Promise<BRMatch> {
  const matchId = `br-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const stormCenterX = Math.floor(Math.random() * 3) + 1; // 1 to 3
  const stormCenterY = Math.floor(Math.random() * 3) + 1;
  const currentZoneRadius = INITIAL_STORM_RADIUS;

  const sectors = buildGridSectors(stormCenterX, stormCenterY, currentZoneRadius);
  const userPet = (await getPlayerPets(options.playerId)).find((p) => p.id === options.equippedPetId) || null;

  // Initial user drop position: near Olympus Mons (2, 2)
  const userPlayer: BRMatchPlayer = {
    id: `br-user-${Date.now()}`,
    matchId,
    playerId: options.playerId,
    username: options.username || 'Commander Nova',
    avatar: options.avatar || '👨‍🚀',
    sectorX: 2,
    sectorY: 2,
    power: 100,
    oxygen: 100,
    shielding: 100,
    hull: 100,
    placement: null,
    status: 'alive',
    kills: 0,
    isBot: false,
    activeBoosts: options.activeBoosts || [],
    equippedPet: userPet,
  };

  // Backfill with 15 NASA Bots to create a 16-player lobby
  const botNames = [
    { name: 'BOT-PERSEVERANCE', avatar: '🤖', x: 0, y: 1 },
    { name: 'BOT-CURIOSITY', avatar: '📡', x: 3, y: 1 },
    { name: 'BOT-INGENUITY', avatar: '🚁', x: 2, y: 4 },
    { name: 'BOT-OPPORTUNITY', avatar: '☀️', x: 4, y: 1 },
    { name: 'BOT-SPIRIT', avatar: '🧗', x: 1, y: 4 },
    { name: 'BOT-SOJOURNER', avatar: '🚙', x: 0, y: 5 },
    { name: 'BOT-VIKING-1', avatar: '🛰️', x: 5, y: 1 },
    { name: 'BOT-PATHFINDER', avatar: '🚀', x: 4, y: 4 },
    { name: 'BOT-ODYSSEY', avatar: '🔭', x: 1, y: 0 },
    { name: 'BOT-MAVEN', avatar: '🪐', x: 3, y: 5 },
    { name: 'BOT-PHOENIX', avatar: '❄️', x: 0, y: 0 },
    { name: 'BOT-INSIGHT', avatar: '🏗️', x: 5, y: 5 },
    { name: 'BOT-MARINER', avatar: '🛸', x: 1, y: 5 },
    { name: 'BOT-ARTEMIS', avatar: '🌙', x: 4, y: 0 },
    { name: 'BOT-ORION', avatar: '👨‍🚀', x: 5, y: 3 },
  ];

  const players: BRMatchPlayer[] = [userPlayer];
  for (let i = 0; i < botNames.length; i++) {
    const b = botNames[i];
    players.push({
      id: `br-bot-${i}-${Date.now()}`,
      matchId,
      playerId: `bot-${b.name.toLowerCase()}`,
      username: b.name,
      avatar: b.avatar,
      sectorX: b.x,
      sectorY: b.y,
      power: 90,
      oxygen: 95,
      shielding: 85,
      hull: 100,
      placement: null,
      status: 'alive',
      kills: 0,
      isBot: true,
      activeBoosts: [],
      equippedPet: null,
    });
  }

  const match: BRMatch = {
    id: matchId,
    status: 'active',
    currentZoneRadius,
    stormCenterX,
    stormCenterY,
    shrinkStage: 1,
    nextShrinkAt: Date.now() + 60000, // 60s per shrink wave
    aliveCount: players.length,
    totalPlayers: players.length,
    winnerPlayerId: null,
    winnerUsername: null,
    createdAt: new Date().toISOString(),
    sectors,
    players,
  };

  const sql = await getSqlClient();
  if (sql) {
    await sql`
      INSERT INTO br_matches (
        id, status, current_zone_radius, storm_center_x, storm_center_y, shrink_stage, alive_count
      ) VALUES (
        ${match.id}, ${match.status}, ${match.currentZoneRadius}, ${match.stormCenterX},
        ${match.stormCenterY}, ${match.shrinkStage}, ${match.aliveCount}
      );
    `;

    for (const p of players) {
      await sql`
        INSERT INTO br_match_players (
          id, match_id, player_id, username, avatar, sector_x, sector_y,
          power, oxygen, shielding, hull, status, is_bot, active_boosts_json, pet_snapshot_json
        ) VALUES (
          ${p.id}, ${match.id}, ${p.playerId}, ${p.username}, ${p.avatar},
          ${p.sectorX}, ${p.sectorY}, ${p.power}, ${p.oxygen}, ${p.shielding},
          ${p.hull}, ${p.status}, ${p.isBot},
          ${JSON.stringify(p.activeBoosts)}, ${JSON.stringify(p.equippedPet)}
        );
      `;
    }
  } else {
    const mem = getMemoryStore();
    mem.matches.set(matchId, match);
  }

  return match;
}

/**
 * 6. Move Player to Sector, Scavenge Loot & Process Storm Shrink Cycle
 */
export async function movePlayerInMatch(options: {
  matchId: string;
  playerId: string;
  targetX: number;
  targetY: number;
}): Promise<{
  match: BRMatch;
  eventLog: string;
  lootFound: string | null;
  stormDamage: number;
  isVictory: boolean;
}> {
  const { matchId, playerId, targetX, targetY } = options;

  let match: BRMatch;
  const sql = await getSqlClient();

  if (sql) {
    // In SQL mode, load match details or fallback
    const mem = getMemoryStore();
    match = mem.matches.get(matchId) || (await createOrQueueBRMatch({ playerId, username: 'Commander' }));
  } else {
    const mem = getMemoryStore();
    const existing = mem.matches.get(matchId);
    if (!existing) {
      match = await createOrQueueBRMatch({ playerId, username: 'Commander' });
    } else {
      match = existing;
    }
  }

  const player = match.players.find((p) => p.playerId === playerId);
  if (!player || player.status !== 'alive') {
    throw new Error('Player is not active in this match');
  }

  // Bound to grid
  const cleanX = Math.max(0, Math.min(GRID_SIZE - 1, targetX));
  const cleanY = Math.max(0, Math.min(GRID_SIZE - 1, targetY));
  player.sectorX = cleanX;
  player.sectorY = cleanY;

  // 1. Calculate Storm Radius Shrink (every move shrinks zone slightly)
  match.currentZoneRadius = Math.max(0.9, match.currentZoneRadius - 0.25);
  match.shrinkStage = Math.min(4, Math.floor((INITIAL_STORM_RADIUS - match.currentZoneRadius) / 0.8) + 1);

  // Recalculate sectors with new storm boundary
  match.sectors = buildGridSectors(match.stormCenterX, match.stormCenterY, match.currentZoneRadius);

  // 2. Check if player is outside safe storm ring
  const dist = Math.sqrt((cleanX - match.stormCenterX) ** 2 + (cleanY - match.stormCenterY) ** 2);
  const isOutside = dist > match.currentZoneRadius;

  let stormDamage = 0;
  if (isOutside) {
    const baseDamage = match.shrinkStage * 12;
    // Nanogel gives complete immunity
    if (player.activeBoosts.includes('lead-lined-nanogel')) {
      stormDamage = 0;
    } else {
      // Tardigrade pet perk gives 20% rad damage reduction
      const petMod = player.equippedPet?.perkType === 'storm_early_warning' ? 0.8 : 1.0;
      stormDamage = Math.round(baseDamage * petMod);
      player.shielding = Math.max(0, player.shielding - stormDamage);
      player.hull = Math.max(0, player.hull - Math.round(stormDamage * 0.5));
    }
  }

  // 3. Scavenge Current Sector
  const targetSector = match.sectors.find((s) => s.x === cleanX && s.y === cleanY);
  let lootFound: string | null = null;
  if (targetSector) {
    if (targetSector.hasSupplyDrop) {
      lootFound = '🚀 ORBITAL SUPPLY DROP: +40 Power, +40 O₂, +30 Shielding!';
      player.power = Math.min(100, player.power + 40);
      player.oxygen = Math.min(100, player.oxygen + 40);
      player.shielding = Math.min(100, player.shielding + 30);
      targetSector.hasSupplyDrop = false;
    } else if (targetSector.lootTier === 'high') {
      lootFound = '📦 High-Tier Cache: +25 Oxygen, +20 Power';
      player.oxygen = Math.min(100, player.oxygen + 25);
      player.power = Math.min(100, player.power + 20);
    } else if (targetSector.lootTier === 'medium') {
      lootFound = '📦 Supply Stash: +15 Oxygen';
      player.oxygen = Math.min(100, player.oxygen + 15);
    }
  }

  // 4. Simulate Bot Eliminations Outside the Ring
  for (const bot of match.players) {
    if (!bot.isBot || bot.status !== 'alive') continue;
    const botDist = Math.sqrt((bot.sectorX - match.stormCenterX) ** 2 + (bot.sectorY - match.stormCenterY) ** 2);
    if (botDist > match.currentZoneRadius + 0.3) {
      bot.status = 'eliminated';
      bot.placement = match.aliveCount;
      match.aliveCount = Math.max(1, match.aliveCount - 1);
    } else {
      // Move bot slightly toward storm center
      if (Math.random() > 0.4) {
        bot.sectorX = bot.sectorX < match.stormCenterX ? bot.sectorX + 1 : bot.sectorX > match.stormCenterX ? bot.sectorX - 1 : bot.sectorX;
        bot.sectorY = bot.sectorY < match.stormCenterY ? bot.sectorY + 1 : bot.sectorY > match.stormCenterY ? bot.sectorY - 1 : bot.sectorY;
      }
    }
  }

  // Check player elimination
  if (player.oxygen <= 0 || player.hull <= 0) {
    player.status = 'eliminated';
    player.placement = match.aliveCount;
  }

  // Check victory
  const isVictory = match.aliveCount === 1 && player.status === 'alive';
  if (isVictory) {
    player.placement = 1;
    match.status = 'completed';
    match.winnerPlayerId = player.playerId;
    match.winnerUsername = player.username;
  }

  const eventLog = isVictory
    ? '🏆 VICTORY ROYALE! You are the sole survivor of Drop Zone: Olympus!'
    : isOutside
    ? `⚠️ STORM WARNING: Outside safe zone! Sustained -${stormDamage} Radiation damage!`
    : `Relocated to ${targetSector?.name || 'Sector'}. Systems holding.`;

  return {
    match,
    eventLog,
    lootFound,
    stormDamage,
    isVictory,
  };
}

/**
 * 7. Activate Tactical Boost during match
 */
export async function useBoostInMatch(options: {
  matchId: string;
  playerId: string;
  boostSlug: BoostSlug;
}): Promise<BRMatch> {
  const { matchId, playerId, boostSlug } = options;
  const mem = getMemoryStore();
  const match = mem.matches.get(matchId);
  if (!match) throw new Error('Match not found');

  const player = match.players.find((p) => p.playerId === playerId);
  if (!player || player.status !== 'alive') throw new Error('Player not alive in match');

  if (!player.activeBoosts.includes(boostSlug)) {
    player.activeBoosts.push(boostSlug);
  }

  return match;
}

/**
 * 8. Award XP to a companion pet and calculate level-ups
 */
export async function awardPetXp(
  playerId: string,
  petId: string,
  xpToAdd: number
): Promise<{ success: boolean; level: number; xp: number; leveledUp: boolean }> {
  if (xpToAdd <= 0) return { success: true, level: 1, xp: 0, leveledUp: false };
  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      SELECT id, level, xp, perk_value FROM player_pets
      WHERE id = ${petId} AND owner_id = ${playerId};
    `;

    if (!rows || rows.length === 0) {
      return { success: false, level: 1, xp: 0, leveledUp: false };
    }

    let currentXp = (rows[0].xp || 0) + xpToAdd;
    let currentLevel = rows[0].level || 1;
    let perkVal = rows[0].perk_value || 15;
    let leveledUp = false;

    while (currentXp >= currentLevel * 100) {
      currentXp -= currentLevel * 100;
      currentLevel += 1;
      perkVal += 2;
      leveledUp = true;
    }

    await sql`
      UPDATE player_pets
      SET xp = ${currentXp}, level = ${currentLevel}, perk_value = ${perkVal}
      WHERE id = ${petId};
    `;

    return { success: true, level: currentLevel, xp: currentXp, leveledUp };
  }

  // Memory fallback
  const mem = getMemoryStore();
  const pets = mem.pets.get(playerId) || [];
  const pet = pets.find((p) => p.id === petId);
  if (!pet) return { success: false, level: 1, xp: 0, leveledUp: false };

  pet.xp = (pet.xp || 0) + xpToAdd;
  let leveledUp = false;
  while (pet.xp >= pet.level * 100) {
    pet.xp -= pet.level * 100;
    pet.level += 1;
    pet.perkValue += 2;
    leveledUp = true;
  }
  return { success: true, level: pet.level, xp: pet.xp, leveledUp };
}

/**
 * 9. Deduct a consumed tactical boost from player inventory
 */
export async function consumePlayerBoost(
  playerId: string,
  boostSlug: BoostSlug
): Promise<{ success: boolean; remainingQuantity: number }> {
  const sql = await getSqlClient();

  if (sql) {
    const rows = await sql`
      SELECT quantity FROM player_boosts
      WHERE player_id = ${playerId} AND boost_slug = ${boostSlug};
    `;

    if (!rows || rows.length === 0 || rows[0].quantity <= 0) {
      return { success: false, remainingQuantity: 0 };
    }

    const nextQty = Math.max(0, rows[0].quantity - 1);
    await sql`
      UPDATE player_boosts
      SET quantity = ${nextQty}
      WHERE player_id = ${playerId} AND boost_slug = ${boostSlug};
    `;
    return { success: true, remainingQuantity: nextQty };
  }

  const mem = getMemoryStore();
  const boosts = mem.boosts.get(playerId) || [];
  const b = boosts.find((x) => x.boostSlug === boostSlug);
  if (!b || b.quantity <= 0) return { success: false, remainingQuantity: 0 };
  b.quantity -= 1;
  return { success: true, remainingQuantity: b.quantity };
}
