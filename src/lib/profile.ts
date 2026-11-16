// ─── Junior Astronaut Mission Trainer – Cadet Profile, Specialties & Telemetry ───

import { useState, useEffect, useCallback } from 'react';
import type { CadetProfile, CadetBadge, BadgeId, GameState, CadetSpecialty } from './types';
import { SPECIALTY_METAS } from './types';
import { resetBattlePassState } from './battlePass';
import { clearStoredGuild } from './guildClient';

export const CADET_BADGES: CadetBadge[] = [
  {
    id: 'solar_storm_survivor',
    name: 'Solar Storm Survivor',
    icon: '☀️',
    description: 'Survived a high-intensity NASA DONKI Solar Particle Event.',
    requirement: 'Survive Severity-3 Solar Event',
  },
  {
    id: 'veteran_30_sols',
    name: '30-Sol Veteran',
    icon: '🏆',
    description: 'Completed a full 30-sol Martian mission with all systems operational.',
    requirement: 'Complete 30 Sols',
  },
  {
    id: 'mars_pioneer',
    name: 'Mars Pioneer',
    icon: '🔥',
    description: 'Conquered the Red Planet on expert Pioneer difficulty.',
    requirement: 'Win on Pioneer difficulty',
  },
  {
    id: 'chief_scientist',
    name: 'Chief Scientist',
    icon: '🔬',
    description: 'Executed 5 or more Research Missions in a single expedition.',
    requirement: 'Perform 5+ Research Missions',
  },
  {
    id: 'iron_dome',
    name: 'Iron Dome',
    icon: '🛡️',
    description: 'Finished the mission with radiation shielding fortified at 80% or higher.',
    requirement: 'End with Shielding ≥ 80%',
  },
];

export const AVATAR_OPTIONS = ['🚀', '🛸', '🪐', '🛰️', '👨‍🚀', '👩‍🚀'] as const;

export const PROFILE_KEY = 'jat_profile_v1';
export const PERSISTENT_PLAYER_ID_KEY = 'jat_persistent_player_id_v1';

const profileListeners = new Set<(profile: CadetProfile) => void>();

export const DEFAULT_PROFILE: CadetProfile = {
  cadetId: 'cadet-nova-01',
  callsign: 'CDR-NOVA-01',
  avatar: '🚀',
  specialty: 'commander',
  createdAt: '2026-01-01T00:00:00.000Z',
  missionsPlayed: 0,
  missionsWon: 0,
  totalSolsSurvived: 0,
  highestScore: 0,
  badges: [],
};

/** Validates callsign: 3-16 alphanumeric or dash characters */
export function validateCallsign(callsign: string): boolean {
  return /^[A-Za-z0-9\-]{3,16}$/.test(callsign.trim());
}

/** Generates a browser-safe unique cadet ID */
export function generateCadetId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'cadet-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

/**
 * Permanently get or initialize a stable player ID that persists across builds,
 * deployments, and profile migrations. Never tied to session ID or build hash.
 */
export function getPersistentPlayerId(): string {
  if (typeof window === 'undefined') {
    return 'cadet-nova-01';
  }

  // 1. Direct check of existing active profile in localStorage (jat_profile_v1)
  try {
    const rawProfile = localStorage.getItem(PROFILE_KEY);
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile) as CadetProfile;
      const candidateId = parsed?.cadetId;
      if (
        candidateId &&
        typeof candidateId === 'string' &&
        candidateId.trim().length > 0 &&
        candidateId !== 'cadet-nova-01'
      ) {
        const cleanId = candidateId.trim();
        try {
          localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, cleanId);
        } catch {}
        return cleanId;
      }
    }
  } catch {}

  // 2. Direct check of permanent stable key
  try {
    const stable = localStorage.getItem(PERSISTENT_PLAYER_ID_KEY);
    if (
      stable &&
      typeof stable === 'string' &&
      stable.trim().length > 0 &&
      stable !== 'undefined' &&
      stable !== 'null' &&
      stable !== 'cadet-nova-01'
    ) {
      return stable.trim();
    }
  } catch {}

  // 3. Fallback to existing wallet cache keys in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jat_wallet_cache_')) {
        const candidateId = key.replace('jat_wallet_cache_', '').trim();
        if (candidateId && candidateId.length > 0 && candidateId !== 'cadet-nova-01') {
          try {
            localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, candidateId);
          } catch {}
          return candidateId;
        }
      }
    }
  } catch {}

  // 4. Generate once and permanently lock into localStorage
  const freshId = generateCadetId();
  try {
    localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, freshId);
  } catch {}
  return freshId;
}

/** Default cadet generator (for client-side new profiles) */
export function createDefaultProfile(
  callsignPrefix = 'CDR-NOVA',
  specialty: CadetSpecialty = 'commander'
): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }
  const persistentId = getPersistentPlayerId();
  const randNum = Math.floor(10 + Math.random() * 90);
  return {
    cadetId: persistentId,
    callsign: `${callsignPrefix}-${randNum}`,
    avatar: '🚀',
    specialty,
    createdAt: new Date().toISOString(),
    missionsPlayed: 0,
    missionsWon: 0,
    totalSolsSurvived: 0,
    highestScore: 0,
    badges: [],
  };
}

/** Cloud sync helper: push profile to Neon Postgres */
export async function pushProfileToCloud(profile: CadetProfile): Promise<boolean> {
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
    });
    const data = await res.json();
    return Boolean(data.success);
  } catch (err) {
    console.warn('Neon cloud profile sync error (offline or unreachable):', err);
    return false;
  }
}

/** Get a cadet profile from local storage by cadetId (reads the single active profile) */
export function getCadetProfileById(cadetId?: string): CadetProfile | null {
  if (typeof window === 'undefined') return null;
  const current = getOrCreateCadetProfile();
  return !cadetId || current.cadetId === cadetId ? current : current;
}

/** Get current active profile from localStorage or create a fresh zero-friction profile */
export function getOrCreateCadetProfile(): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  // Clean legacy multi-cadet roster storage
  try {
    localStorage.removeItem('jat_cadet_roster_v1');
  } catch {}

  const persistentId = getPersistentPlayerId();

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CadetProfile;
      if (parsed.cadetId && parsed.callsign) {
        if (parsed.cadetId !== 'cadet-nova-01') {
          try {
            localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, parsed.cadetId);
          } catch {}
        } else if (persistentId && persistentId !== 'cadet-nova-01') {
          parsed.cadetId = persistentId;
          try {
            localStorage.setItem(PROFILE_KEY, JSON.stringify(parsed));
          } catch {}
        }
        return {
          ...parsed,
          specialty: parsed.specialty || 'commander',
        };
      }
    }
  } catch {}

  const defaultProfile = createDefaultProfile();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
    localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, defaultProfile.cadetId);
  } catch {}
  return defaultProfile;
}

/** Save updated cadet profile to active slot + cloud */
export function saveCadetProfile(profile: CadetProfile, syncCloud = true): void {
  if (typeof window === 'undefined') return;

  // SAFETY GUARD: Never persist the static SSR fallback placeholder 'cadet-nova-01'
  if (
    profile.cadetId === 'cadet-nova-01' &&
    profile.callsign === 'CDR-NOVA-01' &&
    profile.missionsPlayed === 0 &&
    profile.highestScore === 0
  ) {
    return;
  }

  const sanitized: CadetProfile = {
    ...profile,
    specialty: profile.specialty || 'commander',
  };

  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(sanitized));
    if (sanitized.cadetId && sanitized.cadetId !== 'cadet-nova-01') {
      localStorage.setItem(PERSISTENT_PLAYER_ID_KEY, sanitized.cadetId);
    }
  } catch {}

  profileListeners.forEach((fn) => fn(sanitized));

  // Asynchronously sync to Neon Postgres in background
  if (syncCloud) {
    pushProfileToCloud(sanitized).catch(() => {});
  }
}

/** Cloud purge helper: delete cadet from Neon Postgres & cloud storage */
export async function purgeCadetFromCloud(cadetId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile?cadetId=${encodeURIComponent(cadetId)}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => null);
    return Boolean(data?.success);
  } catch (err) {
    console.warn('Neon cloud purge error (offline or unreachable):', err);
    return false;
  }
}

/**
 * Permanently purge the player's data from both local storage and Neon cloud storage.
 * Resets to a clean default profile.
 */
export async function purgeCadetCompletely(cadetId: string): Promise<{ success: boolean; newActiveProfile: CadetProfile }> {
  // 1. Purge from cloud storage
  await purgeCadetFromCloud(cadetId);

  // 2. Reset Battle Pass state & pity counter, and clear stored guild
  resetBattlePassState();
  clearStoredGuild();

  // 3. Clear active save, equipped pet, slotted boosts, local leaderboard, and crates
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('jat_active_save_v1');
      localStorage.removeItem('jat_cadet_roster_v1');
      localStorage.removeItem('jat_equipped_pet_v1');
      localStorage.removeItem('jat_slotted_boosts_v1');
      localStorage.removeItem('jat_local_leaderboard_v1');
      localStorage.removeItem('jat_battlepass_v1');
      localStorage.removeItem('jat_crate_pity_v1');
      localStorage.removeItem('jat_guild_v1');
      localStorage.removeItem(`jat_wallet_cache_${cadetId}`);
    } catch {}
  }

  // 4. Create fresh single default profile
  const nextActive = createDefaultProfile();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextActive));
  } catch {}
  profileListeners.forEach((fn) => fn(nextActive));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jat-profile-updated', { detail: { cadetId: nextActive.cadetId } }));
    window.dispatchEvent(new Event('jat-wallet-updated'));
  }

  return { success: true, newActiveProfile: nextActive };
}

/** Recover / sync profile from Neon Cloud by cadet ID */
export async function syncCloudProfile(cadetId: string): Promise<CadetProfile | null> {
  const trimmed = cadetId.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(`/api/profile?cadetId=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.profile) {
      const cloudProfile: CadetProfile = {
        ...data.profile,
        specialty: data.profile.specialty || 'commander',
      };
      saveCadetProfile(cloudProfile, false);
      return cloudProfile;
    }
    return null;
  } catch (err) {
    console.error('Failed to sync cloud profile:', err);
    return null;
  }
}

/** Subscribe to profile changes */
export function subscribeProfile(listener: (profile: CadetProfile) => void): () => void {
  profileListeners.add(listener);
  return () => {
    profileListeners.delete(listener);
  };
}

/**
 * Evaluates game outcome against badge requirements and returns the updated profile
 * plus any newly awarded badge IDs.
 */
export function evaluateBadges(
  finalState: GameState,
  fallbackProfile?: CadetProfile
): { updatedProfile: CadetProfile; newBadges: BadgeId[] } {
  let targetProfile: CadetProfile | null = null;

  if (fallbackProfile && fallbackProfile.cadetId !== 'cadet-nova-01') {
    targetProfile = fallbackProfile;
  }
  if (!targetProfile) {
    targetProfile = getOrCreateCadetProfile();
  }

  const currentProfile = targetProfile;
  const earnedSet = new Set<BadgeId>(currentProfile.badges);
  const newBadges: BadgeId[] = [];

  const isWon =
    finalState.phase === 'victory' ||
    (finalState.sol >= 30 && finalState.power > 0 && finalState.oxygen > 0 && finalState.shielding > 0);

  // 1. Solar Storm Survivor: survived a severity 3 solar event
  if (!earnedSet.has('solar_storm_survivor')) {
    const survivedSevereSolar = finalState.log.some(
      (entry) =>
        entry.type === 'event' &&
        (entry.title.includes('Solar') ||
          entry.description.toLowerCase().includes('solar') ||
          entry.description.toLowerCase().includes('storm')) &&
        (entry.description.toLowerCase().includes('held') ||
          entry.description.toLowerCase().includes('safe') ||
          entry.description.toLowerCase().includes('shelter'))
    );
    if (survivedSevereSolar) {
      earnedSet.add('solar_storm_survivor');
      newBadges.push('solar_storm_survivor');
    }
  }

  // 2. 30-Sol Veteran: complete full 30 sols
  if (!earnedSet.has('veteran_30_sols') && isWon && finalState.sol >= 30) {
    earnedSet.add('veteran_30_sols');
    newBadges.push('veteran_30_sols');
  }

  // 3. Mars Pioneer: win on pioneer difficulty
  if (!earnedSet.has('mars_pioneer') && isWon && finalState.difficulty === 'pioneer') {
    earnedSet.add('mars_pioneer');
    newBadges.push('mars_pioneer');
  }

  // 4. Chief Scientist: 5+ research missions in one run
  if (!earnedSet.has('chief_scientist')) {
    const researchCount = finalState.log.filter(
      (entry) => entry.type === 'action' && entry.title === 'Research Mission'
    ).length;
    if (researchCount >= 5) {
      earnedSet.add('chief_scientist');
      newBadges.push('chief_scientist');
    }
  }

  // 5. Iron Dome: finish mission with shielding >= 80%
  if (!earnedSet.has('iron_dome') && finalState.shielding >= 80 && (isWon || finalState.sol >= 15)) {
    earnedSet.add('iron_dome');
    newBadges.push('iron_dome');
  }

  const updatedProfile: CadetProfile = {
    ...currentProfile,
    missionsPlayed: currentProfile.missionsPlayed + 1,
    missionsWon: isWon ? currentProfile.missionsWon + 1 : currentProfile.missionsWon,
    totalSolsSurvived: currentProfile.totalSolsSurvived + Math.min(finalState.sol, 30),
    highestScore: Math.max(currentProfile.highestScore, finalState.score),
    badges: Array.from(earnedSet),
  };

  saveCadetProfile(updatedProfile, true);

  return { updatedProfile, newBadges };
}

/** DEVTEST26 God-Mode: Unlocks all cadet achievements and badges */
export function unlockAllBadgesGodMode(): void {
  const profile = getOrCreateCadetProfile();
  const allBadgeIds = CADET_BADGES.map((b) => b.id);
  const updated = {
    ...profile,
    badges: Array.from(new Set([...profile.badges, ...allBadgeIds])),
  };
  saveCadetProfile(updated, true);
}

/** React hook for managing single cadet player profile */
export function useProfile() {
  const [profile, setProfileState] = useState<CadetProfile>(DEFAULT_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const active = getOrCreateCadetProfile();
    setProfileState(active);
    setIsLoaded(true);

    const unsubProfile = subscribeProfile((updated) => {
      setProfileState(updated);
    });

    return () => {
      unsubProfile();
    };
  }, []);

  const updateCallsign = useCallback(
    (newCallsign: string) => {
      if (!validateCallsign(newCallsign)) return false;
      const updated = { ...profile, callsign: newCallsign.trim().toUpperCase() };
      saveCadetProfile(updated, true);
      setProfileState(updated);
      return true;
    },
    [profile]
  );

  const updateAvatar = useCallback(
    (newAvatar: string) => {
      const updated = { ...profile, avatar: newAvatar };
      saveCadetProfile(updated, true);
      setProfileState(updated);
    },
    [profile]
  );

  const updateSpecialty = useCallback(
    (newSpecialty: CadetSpecialty) => {
      const updated = { ...profile, specialty: newSpecialty };
      saveCadetProfile(updated, true);
      setProfileState(updated);
    },
    [profile]
  );

  const handleRecoverCloudProfile = useCallback(async (cadetId: string) => {
    setIsCloudSyncing(true);
    try {
      const synced = await syncCloudProfile(cadetId);
      if (synced) {
        setProfileState(synced);
        return { success: true, profile: synced };
      }
      return { success: false, error: 'Cadet profile not found in cloud database.' };
    } finally {
      setIsCloudSyncing(false);
    }
  }, []);

  const handlePurgeCadetData = useCallback(async (cadetId?: string) => {
    const targetId = cadetId || profile.cadetId;
    if (!targetId) return { success: false, error: 'No cadet ID provided' };
    setIsDeleting(true);
    try {
      const res = await purgeCadetCompletely(targetId);
      setProfileState(res.newActiveProfile);
      return { success: true, newProfile: res.newActiveProfile };
    } catch (err) {
      console.error('Failed to purge cadet data:', err);
      return { success: false, error: 'Failed to erase data.' };
    } finally {
      setIsDeleting(false);
    }
  }, [profile.cadetId]);

  return {
    profile,
    isLoaded,
    isCloudSyncing,
    isDeleting,
    updateCallsign,
    updateAvatar,
    updateSpecialty,
    purgeCadetData: handlePurgeCadetData,
    recoverCloudProfile: handleRecoverCloudProfile,
    badgesMeta: CADET_BADGES,
    specialtiesMeta: SPECIALTY_METAS,
  };
}
