// ─── Junior Astronaut Mission Trainer – Orbital Guilds Client & React Hook ───

import { useState, useEffect, useCallback } from 'react';
import type { Guild, GuildMember } from './guildTypes';

export const GUILD_STORAGE_KEY = 'jat_guild_v1';

const guildListeners = new Set<(guild: Guild | null) => void>();
const inFlightGuildRequests = new Map<string, Promise<{ success?: boolean; guilds?: Guild[]; currentGuild?: Guild | null; error?: string }>>();

/**
 * Read the active player's cached guild synchronously from localStorage
 */
export function getStoredGuild(): Guild | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GUILD_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Guild;
    }
  } catch {}
  return null;
}

/**
 * Persist the player's active guild to localStorage and notify all active UI listeners
 */
export function setStoredGuild(guild: Guild | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (guild) {
      localStorage.setItem(GUILD_STORAGE_KEY, JSON.stringify(guild));
    } else {
      localStorage.removeItem(GUILD_STORAGE_KEY);
    }
  } catch {}
  guildListeners.forEach((fn) => fn(guild));
}

/**
 * Wipe guild data from localStorage
 */
export function clearStoredGuild(): void {
  setStoredGuild(null);
}

export interface UseGuildReturn {
  currentGuild: Guild | null;
  allGuilds: Guild[];
  isLoading: boolean;
  error: string | null;
  refreshGuilds: () => Promise<void>;
  createGuild: (params: {
    name: string;
    tag: string;
    emblem: string;
    motto?: string;
    cadetId: string;
    callsign: string;
    avatar: string;
    isFiveStarGeneral?: boolean;
  }) => Promise<{ success: boolean; guild?: Guild; remainingCredits?: number; error?: string }>;
  joinGuild: (guildId: string, cadet: { cadetId: string; callsign: string; avatar: string }) => Promise<{ success: boolean; guild?: Guild; error?: string }>;
  leaveGuild: (guildId: string, cadetId: string) => Promise<{ success: boolean; error?: string }>;
  donate: (guildId: string, cadetId: string, amount: number) => Promise<{ success: boolean; guild?: Guild; member?: GuildMember; remainingCredits?: number; error?: string }>;
}

export function useGuild(cadetId?: string): UseGuildReturn {
  const [currentGuild, setCurrentGuildState] = useState<Guild | null>(() => getStoredGuild());
  const [allGuilds, setAllGuilds] = useState<Guild[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const listener = (updated: Guild | null) => {
      setCurrentGuildState(updated);
    };
    guildListeners.add(listener);
    return () => {
      guildListeners.delete(listener);
    };
  }, []);

  const refreshGuilds = useCallback(async () => {
    if (!cadetId && typeof window === 'undefined') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    setIsLoading(true);
    setError(null);

    const url = cadetId ? `/api/guilds?cadetId=${encodeURIComponent(cadetId)}` : '/api/guilds';
    try {
      let reqPromise = inFlightGuildRequests.get(url);
      if (!reqPromise) {
        reqPromise = fetch(url)
          .then((res) => res.json())
          .finally(() => {
            inFlightGuildRequests.delete(url);
          });
        inFlightGuildRequests.set(url, reqPromise);
      }
      const data = await reqPromise;

      if (data.success) {
        setAllGuilds(data.guilds || []);
        if (data.currentGuild !== undefined) {
          setCurrentGuildState(data.currentGuild);
          setStoredGuild(data.currentGuild);
        }
      } else {
        setError(data.error || 'Failed to fetch guilds');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error loading alliances';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [cadetId]);

  useEffect(() => {
    refreshGuilds();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshGuilds();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshGuilds]);

  const createGuild = useCallback(
    async (params: {
      name: string;
      tag: string;
      emblem: string;
      motto?: string;
      cadetId: string;
      callsign: string;
      avatar: string;
      isFiveStarGeneral?: boolean;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', ...params }),
        });
        const data = await res.json();
        if (data.success && data.guild) {
          setCurrentGuildState(data.guild);
          setStoredGuild(data.guild);
          await refreshGuilds();
          return { success: true, guild: data.guild, remainingCredits: data.remainingCredits };
        } else {
          const err = data.error || 'Failed to create guild';
          setError(err);
          return { success: false, error: err };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error founding guild';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshGuilds]
  );

  const joinGuild = useCallback(
    async (guildId: string, cadet: { cadetId: string; callsign: string; avatar: string }) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', guildId, ...cadet }),
        });
        const data = await res.json();
        if (data.success && data.guild) {
          setCurrentGuildState(data.guild);
          setStoredGuild(data.guild);
          await refreshGuilds();
          return { success: true, guild: data.guild, remainingCredits: data.remainingCredits };
        } else {
          const err = data.error || 'Failed to join guild';
          setError(err);
          return { success: false, error: err };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error joining alliance';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshGuilds]
  );

  const leaveGuild = useCallback(
    async (guildId: string, cId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', guildId, cadetId: cId }),
        });
        const data = await res.json();
        if (data.success) {
          setCurrentGuildState(null);
          setStoredGuild(null);
          await refreshGuilds();
          return { success: true };
        } else {
          const err = data.error || 'Failed to leave guild';
          setError(err);
          return { success: false, error: err };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error leaving guild';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshGuilds]
  );

  const donate = useCallback(
    async (guildId: string, cId: string, amount: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'donate', guildId, cadetId: cId, amount }),
        });
        const data = await res.json();
        if (data.success && data.guild) {
          setCurrentGuildState(data.guild);
          setStoredGuild(data.guild);
          await refreshGuilds();
          return {
            success: true,
            guild: data.guild,
            member: data.member,
            remainingCredits: data.remainingCredits,
          };
        } else {
          const err = data.error || 'Donation failed';
          setError(err);
          return { success: false, error: err };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error making donation';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshGuilds]
  );

  return {
    currentGuild,
    allGuilds,
    isLoading,
    error,
    refreshGuilds,
    createGuild,
    joinGuild,
    leaveGuild,
    donate,
  };
}
