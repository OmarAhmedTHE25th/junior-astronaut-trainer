// ─── Junior Astronaut Mission Trainer – Orbital Guilds & Outpost Alliances Types ───

export type GuildRole = 'leader' | 'officer' | 'member';

export interface GuildMember {
  cadetId: string;
  callsign: string;
  avatar: string;
  role: GuildRole;
  contributedMC: number;
  contributedScore: number;
  joinedAt: string;
}

export interface Guild {
  id: string;
  name: string; // 3–24 chars
  tag: string; // 2–4 uppercase alphanumeric chars (e.g. 'MARS', 'ARES')
  emblem: string; // emoji icon
  motto: string;
  leaderId: string;
  treasuryMC: number;
  totalGuildScore: number;
  buffLevel: number; // 1–5
  members: GuildMember[];
  createdAt: string;
  updatedAt: string;
}

export interface GuildTreasuryBuff {
  level: number;
  minTreasuryMC: number;
  vitalsBonusPercent: number; // e.g. 2, 5, 8, 12, 15
  creditsBonusPercent: number; // e.g. 0, 5, 10, 15, 20
  hasGoldTrim: boolean;
  name: string;
  description: string;
}

export const MAX_GUILD_MEMBERS = 20;
export const GUILD_CREATION_FEE_MC = 250;

export const GUILD_EMBLEM_OPTIONS = [
  '🛡️', '🪐', '⚡', '🚀', '👑', '🌟', '☄️', '🛸', '🔬', '🔥', '🛰️', '💎'
] as const;

export const GUILD_TREASURY_BUFFS: Record<number, GuildTreasuryBuff> = {
  1: {
    level: 1,
    minTreasuryMC: 0,
    vitalsBonusPercent: 2,
    creditsBonusPercent: 0,
    hasGoldTrim: false,
    name: 'Outpost Energy Reserve',
    description: '+2% starting Power & Oxygen',
  },
  2: {
    level: 2,
    minTreasuryMC: 1000,
    vitalsBonusPercent: 5,
    creditsBonusPercent: 5,
    hasGoldTrim: false,
    name: 'Orbital Logistics Network',
    description: '+5% starting vitals & +5% Galaxy Coins earned',
  },
  3: {
    level: 3,
    minTreasuryMC: 3000,
    vitalsBonusPercent: 8,
    creditsBonusPercent: 10,
    hasGoldTrim: false,
    name: 'Allied Supply Convoys',
    description: '+8% starting vitals & +10% Galaxy Coins earned',
  },
  4: {
    level: 4,
    minTreasuryMC: 7500,
    vitalsBonusPercent: 12,
    creditsBonusPercent: 15,
    hasGoldTrim: false,
    name: 'Galactic Sector Dominance',
    description: '+12% starting vitals & +15% Galaxy Coins earned',
  },
  5: {
    level: 5,
    minTreasuryMC: 15000,
    vitalsBonusPercent: 15,
    creditsBonusPercent: 20,
    hasGoldTrim: true,
    name: 'Sovereign Clan Hegemony',
    description: '+15% starting vitals, +20% Galaxy Coins earned, & Gold [TAG] trim',
  },
};

/**
 * Calculates current buff level (1–5) based on accumulated guild treasury
 */
export function calculateBuffLevel(treasuryMC: number): number {
  if (treasuryMC >= 15000) return 5;
  if (treasuryMC >= 7500) return 4;
  if (treasuryMC >= 3000) return 3;
  if (treasuryMC >= 1000) return 2;
  return 1;
}

/**
 * Retrieves the buff configuration for a given level
 */
export function getGuildBuff(buffLevel: number): GuildTreasuryBuff {
  const lvl = Math.min(5, Math.max(1, buffLevel || 1));
  return GUILD_TREASURY_BUFFS[lvl];
}

/**
 * Returns the next target milestone and percentage towards it
 */
export function getNextBuffMilestone(treasuryMC: number): {
  currentLevel: number;
  nextLevel: number | null;
  targetMC: number;
  progressPercent: number;
  remainingMC: number;
} {
  const currentLevel = calculateBuffLevel(treasuryMC);
  if (currentLevel >= 5) {
    return {
      currentLevel: 5,
      nextLevel: null,
      targetMC: 15000,
      progressPercent: 100,
      remainingMC: 0,
    };
  }

  const nextLevel = currentLevel + 1;
  const currentMin = GUILD_TREASURY_BUFFS[currentLevel].minTreasuryMC;
  const targetMC = GUILD_TREASURY_BUFFS[nextLevel].minTreasuryMC;
  const span = targetMC - currentMin;
  const currentSpan = Math.max(0, treasuryMC - currentMin);
  const progressPercent = Math.min(100, Math.round((currentSpan / span) * 100));

  return {
    currentLevel,
    nextLevel,
    targetMC,
    progressPercent,
    remainingMC: Math.max(0, targetMC - treasuryMC),
  };
}

/**
 * Validates guild name: 3–24 characters, alphanumeric and spaces
 */
export function validateGuildName(name: string): boolean {
  const clean = name.trim();
  return clean.length >= 3 && clean.length <= 24;
}

/**
 * Validates guild tag: 2–4 uppercase alphanumeric characters
 */
export function validateGuildTag(tag: string): boolean {
  const clean = tag.trim().toUpperCase();
  return /^[A-Z0-9]{2,4}$/.test(clean);
}
