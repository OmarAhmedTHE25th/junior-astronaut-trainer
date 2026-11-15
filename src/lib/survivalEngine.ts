// ─── Junior Astronaut Mission Trainer – Seeded PRNG & Endless Escalation Engine ───
// Deterministic pseudo-random number generator (Mulberry32) and infinite difficulty-scaling
// curves for Sudden-Death Endless Survival Tournament Brackets.

import type { RivalTelemetryUpdate } from './tournamentTypes';

/**
 * 32-bit deterministic Mulberry32 PRNG.
 * Produces high-quality uniform random floats in [0, 1) from an integer seed.
 */
export function createMulberry32(seed: number): () => number {
  let a = (seed ^ 0x12345678) >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Endless Survival Resource Depletion Multiplier.
 * Beyond Sol 30, environmental decay compounds rapidly:
 * - Sol 1-30: 1.00x (Standard Mission Baseline)
 * - Sol 31-50: 1.00x + 4% per Sol (Dust accumulation, solar cell micro-abrasion)
 * - Sol 51-80: 1.80x + 8% per Sol (Life support seal fatigue, oxygen compressor wear)
 * - Sol 81+: 4.20x + 15% per Sol (Catastrophic hull stress, radiation filter failure)
 */
export function getEndlessDepletionMultiplier(sol: number): number {
  if (sol <= 30) {
    return 1.0;
  }
  if (sol <= 50) {
    return 1.0 + (sol - 30) * 0.04;
  }
  if (sol <= 80) {
    return 1.8 + (sol - 50) * 0.08;
  }
  return 4.2 + (sol - 80) * 0.15;
}

/**
 * Compounding Equipment Wear: decreases recovery output from player maintenance.
 */
export function getCompoundingWearMultiplier(sol: number): number {
  if (sol <= 30) return 1.0;
  // E.g., at sol 50, efficiency drops to 80%; at sol 80, drops to 60%; minimum 35%
  const wearDrop = (sol - 30) * 0.01;
  return Math.max(0.35, 1.0 - wearDrop);
}

/**
 * Endless Random Event Probability.
 * Event frequency increases as Martian storms intensify.
 */
export function getEndlessEventChance(sol: number): number {
  if (sol <= 30) return 0.45;
  if (sol <= 60) return Math.min(0.85, 0.45 + (sol - 30) * 0.013);
  return Math.min(0.95, 0.85 + (sol - 60) * 0.005);
}

/**
 * Escalating NASA DONKI Solar Weather Hazard.
 * As solar maximum peaks, X-class and Superflare coronal mass ejections become deadly.
 */
export function getEndlessSolarFlareSeverity(sol: number): {
  severity: 1 | 2 | 3;
  radiationDamageMod: number;
  stormClass: string;
  description: string;
} {
  if (sol <= 30) {
    return {
      severity: 1,
      radiationDamageMod: 1.0,
      stormClass: 'M1.2 Moderate Flare',
      description: 'Minor ionizing radiation band detected by Mars Odyssey.',
    };
  }
  if (sol <= 50) {
    return {
      severity: 2,
      radiationDamageMod: 1.45,
      stormClass: 'X2.4 Major Solar Flare',
      description: 'Intense proton bombardment stressing outpost magnetic deflectors.',
    };
  }
  if (sol <= 80) {
    return {
      severity: 3,
      radiationDamageMod: 2.1,
      stormClass: 'X9.8 Extreme Solar Superstorm',
      description: 'Severe interplanetary shockwave breaching secondary shielding.',
    };
  }
  return {
    severity: 3,
    radiationDamageMod: 3.5,
    stormClass: 'X28+ Carrington-Class Event',
    description: 'Cataclysmic coronal mass ejection overwhelming all planetary defenses.',
  };
}

/**
 * Deterministic Composite Tournament Score & Tiebreaker.
 * Primary: Sol count (highest priority) + exact hours.
 * Secondary Tiebreaker: Remaining composite resource efficiency score.
 */
export function calculateTournamentScore(
  sols: number,
  hours: number,
  resources: { power: number; oxygen: number; shielding: number; morale: number }
): number {
  // Sols provide 10,000 points per day; hours provide 100 points
  const timeScore = sols * 10000 + hours * 100;
  // Resource efficiency tiebreaker (0 - 850 points)
  const resourceTiebreaker = Math.round(
    resources.power * 2 +
      resources.oxygen * 2 +
      resources.shielding * 3 +
      resources.morale * 1.5
  );
  return timeScore + resourceTiebreaker;
}

/**
 * Generates realistic, deterministic rival telemetry during synchronized bracket matches.
 * Uses the match's shared seed so both opponents experience mathematically fair rival pressure.
 */
export function generateRivalTelemetrySnapshot(
  seed: number,
  rivalId: string,
  rivalName: string,
  rivalAvatar: string,
  currentSol: number
): RivalTelemetryUpdate {
  const prng = createMulberry32(seed + currentSol * 1337);

  // Deterministic rival lifespans: Bot rivals survive between Sol 32 and Sol 78
  const baselineFatalSol = 34 + Math.floor(prng() * 38); // 34 - 72 sols
  const isAlive = currentSol < baselineFatalSol;

  // Realistic life support numbers
  const healthFraction = isAlive
    ? Math.max(0.08, 1.0 - (currentSol / (baselineFatalSol + 4)))
    : 0;

  const jitter = (prng() - 0.5) * 14;
  const power = isAlive ? Math.round(Math.max(5, Math.min(100, healthFraction * 100 + jitter))) : 0;
  const oxygen = isAlive ? Math.round(Math.max(4, Math.min(100, healthFraction * 95 - jitter * 0.5))) : 0;
  const shielding = isAlive ? Math.round(Math.max(6, Math.min(100, healthFraction * 90 + jitter * 0.8))) : 0;
  const morale = isAlive ? Math.round(Math.max(10, Math.min(100, healthFraction * 80))) : 0;

  // Status updates
  let statusText = `Sol ${currentSol}: Outpost stable.`;
  if (!isAlive) {
    statusText = `ELIMINATED on Sol ${baselineFatalSol}! Life support failure.`;
  } else if (oxygen < 20) {
    statusText = `CRITICAL: Rival Oxygen depleted to ${oxygen}%!`;
  } else if (shielding < 25) {
    statusText = `WARNING: Rival Hull & Shielding breached (${shielding}%)!`;
  } else if (currentSol > 40) {
    statusText = `Sol ${currentSol}: Enduring extreme dust storm radiation.`;
  } else {
    const statuses = [
      'Recalibrating solar array tracking',
      'Purging oxygen recycling scrubbers',
      'Deploying secondary radiation baffles',
      'Managing crew psychological stress',
      'Atmospheric pressure fluctuating',
    ];
    statusText = statuses[Math.floor(prng() * statuses.length)];
  }

  return {
    matchId: `match-seed-${seed}`,
    rivalId,
    rivalName,
    rivalAvatar,
    sol: isAlive ? currentSol : baselineFatalSol,
    hours: isAlive ? Math.floor(prng() * 24) : 18,
    power,
    oxygen,
    shielding,
    morale,
    statusText,
    isAlive,
    timestamp: Date.now(),
  };
}
