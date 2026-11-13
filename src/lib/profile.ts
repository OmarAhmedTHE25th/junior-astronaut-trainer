// ─── Junior Astronaut Mission Trainer – Cadet Profiles & Telemetry ───

import { useState, useEffect, useCallback } from 'react';
import type { CadetProfile, CadetBadge, BadgeId, GameState } from './types';

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

const PROFILE_KEY = 'jat_profile_v1';
const listeners = new Set<(profile: CadetProfile) => void>();

export const DEFAULT_PROFILE: CadetProfile = {
  cadetId: 'cadet-nova-01',
  callsign: 'CDR-NOVA-01',
  avatar: '🚀',
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

/** Generates a quick UUID (browser safe) */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'cadet-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

/** Default cadet generator (for client-side new profiles) */
export function createDefaultProfile(): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }
  const randNum = Math.floor(10 + Math.random() * 90);
  return {
    cadetId: generateId(),
    callsign: `CDR-NOVA-${randNum}`,
    avatar: '🚀',
    createdAt: new Date().toISOString(),
    missionsPlayed: 0,
    missionsWon: 0,
    totalSolsSurvived: 0,
    highestScore: 0,
    badges: [],
  };
}

/** Get current profile from localStorage or create a fresh zero-friction profile */
export function getOrCreateCadetProfile(): CadetProfile {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CadetProfile;
      if (parsed.cadetId && parsed.callsign) {
        return parsed;
      }
    }
  } catch {}

  const defaultProfile = createDefaultProfile();
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
  } catch {}
  return defaultProfile;
}

/** Save updated cadet profile to localStorage and notify subscribers */
export function saveCadetProfile(profile: CadetProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
  listeners.forEach((fn) => fn(profile));
}

/** Subscribe to profile changes */
export function subscribeProfile(listener: (profile: CadetProfile) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Evaluates game outcome against badge requirements and returns the updated profile
 * plus any newly awarded badge IDs.
 */
export function evaluateBadges(
  finalState: GameState,
  currentProfile: CadetProfile
): { updatedProfile: CadetProfile; newBadges: BadgeId[] } {
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

  saveCadetProfile(updatedProfile);

  return { updatedProfile, newBadges };
}

/** React hook for managing cadet profile */
export function useProfile() {
  const [profile, setProfileState] = useState<CadetProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    setProfileState(getOrCreateCadetProfile());
    const unsubscribe = subscribeProfile((updated) => {
      setProfileState(updated);
    });
    return unsubscribe;
  }, []);

  const updateCallsign = useCallback(
    (newCallsign: string) => {
      if (!validateCallsign(newCallsign)) return false;
      const updated = { ...profile, callsign: newCallsign.trim().toUpperCase() };
      saveCadetProfile(updated);
      setProfileState(updated);
      return true;
    },
    [profile]
  );

  const updateAvatar = useCallback(
    (newAvatar: string) => {
      const updated = { ...profile, avatar: newAvatar };
      saveCadetProfile(updated);
      setProfileState(updated);
    },
    [profile]
  );

  return {
    profile,
    updateCallsign,
    updateAvatar,
    badgesMeta: CADET_BADGES,
  };
}
