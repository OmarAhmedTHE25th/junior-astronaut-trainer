// ─── Junior Astronaut Mission Trainer – Cadet Profiles, Specialties & Telemetry ───

import { useState, useEffect, useCallback } from 'react';
import type { CadetProfile, CadetBadge, BadgeId, GameState, CadetSpecialty } from './types';
import { SPECIALTY_METAS } from './types';

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
export const ROSTER_KEY = 'jat_cadet_roster_v1';

const profileListeners = new Set<(profile: CadetProfile) => void>();
const rosterListeners = new Set<(roster: CadetProfile[]) => void>();

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

/** Default cadet generator (for client-side new profiles) */
export function createDefaultProfile(
  callsignPrefix = 'CDR-NOVA',
  specialty: CadetSpecialty = 'commander'
): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }
  const randNum = Math.floor(10 + Math.random() * 90);
  return {
    cadetId: generateCadetId(),
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

/** Get the roster of all cadets on this device */
export function getCadetRoster(): CadetProfile[] {
  if (typeof window === 'undefined') {
    return [DEFAULT_PROFILE];
  }

  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Heal roster: filter out accidental SSR placeholder 'cadet-nova-01' if real cadets exist
        const hasRealCadets = parsed.some((p) => p.cadetId && p.cadetId !== 'cadet-nova-01');
        const validList = hasRealCadets
          ? parsed.filter((p) => p.cadetId && p.cadetId !== 'cadet-nova-01')
          : parsed;

        const sanitized = validList.map((p) => ({
          ...p,
          specialty: p.specialty || 'commander',
        }));

        if (sanitized.length > 0) {
          return sanitized;
        }
      }
    }
  } catch {}

  const active = getOrCreateCadetProfile();
  const initialRoster = [active];
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(initialRoster));
  } catch {}
  return initialRoster;
}

/** Save updated roster to localStorage and notify roster listeners */
export function saveCadetRoster(roster: CadetProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
  } catch {}
  rosterListeners.forEach((fn) => fn(roster));
}

/** Get a cadet profile from the local roster by cadetId */
export function getCadetProfileById(cadetId?: string): CadetProfile | null {
  if (!cadetId || typeof window === 'undefined') return null;
  const roster = getCadetRoster();
  return roster.find((p) => p.cadetId === cadetId) || null;
}

/** Get current active profile from localStorage or create a fresh zero-friction profile */
export function getOrCreateCadetProfile(): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CadetProfile;
      if (parsed.cadetId && parsed.callsign) {
        // If the active profile in storage is the SSR fallback placeholder but real cadets exist in the roster, activate the real cadet
        if (parsed.cadetId === 'cadet-nova-01') {
          const rosterRaw = localStorage.getItem(ROSTER_KEY);
          if (rosterRaw) {
            const parsedRoster = JSON.parse(rosterRaw);
            if (Array.isArray(parsedRoster)) {
              const realCadet = parsedRoster.find((p) => p.cadetId && p.cadetId !== 'cadet-nova-01');
              if (realCadet) {
                const cleanedReal = {
                  ...realCadet,
                  specialty: realCadet.specialty || 'commander',
                };
                localStorage.setItem(PROFILE_KEY, JSON.stringify(cleanedReal));
                return cleanedReal;
              }
            }
          }
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
    localStorage.setItem(ROSTER_KEY, JSON.stringify([defaultProfile]));
  } catch {}
  return defaultProfile;
}

/** Save updated cadet profile to active slot + roster + cloud */
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
  } catch {}

  // Update in roster as well
  try {
    const roster = getCadetRoster();
    const idx = roster.findIndex((p) => p.cadetId === sanitized.cadetId);
    if (idx >= 0) {
      roster[idx] = sanitized;
    } else {
      roster.push(sanitized);
    }
    saveCadetRoster(roster);
  } catch {}

  profileListeners.forEach((fn) => fn(sanitized));

  // Asynchronously sync to Neon Postgres in background
  if (syncCloud) {
    pushProfileToCloud(sanitized).catch(() => {});
  }
}

/** Switch active cadet to another profile from the roster */
export function switchActiveCadet(cadetId: string): CadetProfile | null {
  const roster = getCadetRoster();
  const target = roster.find((p) => p.cadetId === cadetId);
  if (!target) return null;

  saveCadetProfile(target, false);
  return target;
}

/** Create a new cadet profile and switch to it immediately */
export function createNewCadet(
  callsignPrefix = 'CDR-NOVA',
  avatar = '🚀',
  specialty: CadetSpecialty = 'commander'
): CadetProfile {
  const newProfile = createDefaultProfile(callsignPrefix, specialty);
  newProfile.avatar = avatar;

  const roster = getCadetRoster();
  roster.push(newProfile);
  saveCadetRoster(roster);

  saveCadetProfile(newProfile, true);
  return newProfile;
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
 * Permanently purge a cadet's data from both local storage and Neon cloud storage.
 * If the purged cadet was active, switches to the next available cadet or creates a fresh one.
 */
export async function purgeCadetCompletely(cadetId: string): Promise<{ success: boolean; newActiveProfile: CadetProfile }> {
  // 1. Purge from cloud storage
  await purgeCadetFromCloud(cadetId);

  // 2. Purge from local storage
  const roster = getCadetRoster();
  const updatedRoster = roster.filter((p) => p.cadetId !== cadetId);

  const active = getOrCreateCadetProfile();
  let nextActive: CadetProfile;

  if (active.cadetId === cadetId) {
    // Clear active save if it belonged to this cadet
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}

    if (updatedRoster.length > 0) {
      nextActive = updatedRoster[0];
    } else {
      nextActive = createDefaultProfile();
      updatedRoster.push(nextActive);
    }

    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(nextActive));
    } catch {}
    profileListeners.forEach((fn) => fn(nextActive));
  } else {
    nextActive = active;
  }

  saveCadetRoster(updatedRoster);

  // Clean local leaderboard entries for this cadet if present
  try {
    const rawLb = localStorage.getItem('jat_local_leaderboard_v1');
    if (rawLb) {
      const parsedLb = JSON.parse(rawLb);
      if (Array.isArray(parsedLb)) {
        const filteredLb = parsedLb.filter((e: { cadetId?: string }) => e.cadetId !== cadetId);
        localStorage.setItem('jat_local_leaderboard_v1', JSON.stringify(filteredLb));
      }
    }
  } catch {}

  return { success: true, newActiveProfile: nextActive };
}

/** Delete a cadet profile from the roster (must leave at least 1) */
export function deleteCadet(cadetId: string): boolean {
  const roster = getCadetRoster();
  if (roster.length <= 1) return false;

  purgeCadetFromCloud(cadetId).catch(() => {});

  const updatedRoster = roster.filter((p) => p.cadetId !== cadetId);
  saveCadetRoster(updatedRoster);

  const active = getOrCreateCadetProfile();
  if (active.cadetId === cadetId) {
    // Switch to first remaining
    saveCadetProfile(updatedRoster[0], false);
  }
  return true;
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

/** Subscribe to roster changes */
export function subscribeRoster(listener: (roster: CadetProfile[]) => void): () => void {
  rosterListeners.add(listener);
  return () => {
    rosterListeners.delete(listener);
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
  // 1. Locate the exact cadet who played this mission:
  let targetProfile: CadetProfile | null = null;

  if (finalState.cadetId) {
    targetProfile = getCadetProfileById(finalState.cadetId);
  }
  if (!targetProfile && fallbackProfile && fallbackProfile.cadetId !== 'cadet-nova-01') {
    targetProfile = fallbackProfile;
  }
  if (!targetProfile) {
    targetProfile = getOrCreateCadetProfile();
  }

  const currentProfile = targetProfile;
  const earnedSet = new Set<BadgeId>(currentProfile.badges);
  const newBadges: BadgeId[] = [];

  const isWon = finalState.phase === 'victory' || (finalState.sol >= 30 && finalState.power > 0 && finalState.oxygen > 0 && finalState.shielding > 0);

  // 1. Solar Storm Survivor: survived a severity 3 solar event
  if (!earnedSet.has('solar_storm_survivor')) {
    const survivedSevereSolar = finalState.log.some(
      (entry) =>
        entry.type === 'event' &&
        (entry.title.includes('Solar') || entry.description.toLowerCase().includes('solar') || entry.description.toLowerCase().includes('storm')) &&
        (entry.description.toLowerCase().includes('held') || entry.description.toLowerCase().includes('safe') || entry.description.toLowerCase().includes('shelter'))
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

/** React hook for managing cadet profile and roster */
export function useProfile() {
  const [profile, setProfileState] = useState<CadetProfile>(DEFAULT_PROFILE);
  const [roster, setRosterState] = useState<CadetProfile[]>([DEFAULT_PROFILE]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const active = getOrCreateCadetProfile();
    const currentRoster = getCadetRoster();
    setProfileState(active);
    setRosterState(currentRoster);
    setIsLoaded(true);

    const unsubProfile = subscribeProfile((updated) => {
      setProfileState(updated);
    });
    const unsubRoster = subscribeRoster((updatedRoster) => {
      setRosterState(updatedRoster);
    });

    return () => {
      unsubProfile();
      unsubRoster();
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

  const handleSwitchCadet = useCallback((cadetId: string) => {
    const switched = switchActiveCadet(cadetId);
    if (switched) {
      setProfileState(switched);
    }
    return Boolean(switched);
  }, []);

  const handleCreateNewCadet = useCallback((prefix?: string, avatar?: string, specialty?: CadetSpecialty) => {
    const created = createNewCadet(prefix, avatar, specialty);
    setProfileState(created);
    setRosterState(getCadetRoster());
    return created;
  }, []);

  const handleDeleteCadet = useCallback((cadetId: string) => {
    const ok = deleteCadet(cadetId);
    if (ok) {
      setProfileState(getOrCreateCadetProfile());
      setRosterState(getCadetRoster());
    }
    return ok;
  }, []);

  const handleRecoverCloudProfile = useCallback(async (cadetId: string) => {
    setIsCloudSyncing(true);
    try {
      const synced = await syncCloudProfile(cadetId);
      if (synced) {
        setProfileState(synced);
        setRosterState(getCadetRoster());
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
      setRosterState(getCadetRoster());
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
    roster,
    isLoaded,
    isCloudSyncing,
    isDeleting,
    updateCallsign,
    updateAvatar,
    updateSpecialty,
    switchCadet: handleSwitchCadet,
    createNewCadet: handleCreateNewCadet,
    deleteCadet: handleDeleteCadet,
    purgeCadetData: handlePurgeCadetData,
    recoverCloudProfile: handleRecoverCloudProfile,
    badgesMeta: CADET_BADGES,
    specialtiesMeta: SPECIALTY_METAS,
  };
}
