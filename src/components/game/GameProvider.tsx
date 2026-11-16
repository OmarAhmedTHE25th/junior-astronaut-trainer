'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { GameState, GameAction, Difficulty, CadetSpecialty, LandingSiteId, BoostSlug, PlanetId } from '@/lib/types';
import { PET_CATALOG } from '@/lib/battleRoyaleTypes';
import { gameReducer, createInitialState } from '@/lib/gameEngine';
import { TIMED_CRISIS_SOL_SECONDS, TIMEOUT_FALLBACK_ACTION } from '@/lib/constants';
import { getOrCreateCadetProfile } from '@/lib/profile';
import { getBattlePassState } from '@/lib/battlePass';
import { getStoredGuild } from '@/lib/guildClient';
import { type PlanetFact, getPlanetFacts } from '@/lib/planetFacts';

export type NASAFact = PlanetFact;

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  currentFact: NASAFact | null;
  rotateFact: () => void;
  timeRemaining: number;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  quitMission: () => void;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}

export interface MissionTimerContextType {
  timeRemaining: number;
}

export const MissionTimerContext = createContext<MissionTimerContextType>({
  timeRemaining: TIMED_CRISIS_SOL_SECONDS,
});

export function useMissionTimer(): MissionTimerContextType {
  return useContext(MissionTimerContext);
}

interface GameProviderProps {
  children: ReactNode;
  difficulty?: Difficulty;
  specialty?: CadetSpecialty;
  landingSite?: LandingSiteId;
  cadet?: { cadetId?: string; callsign?: string; avatar?: string };
  squadCode?: string;
  weatherSeed?: number;
  initialState?: GameState;
  isTimedMode?: boolean;
  planetId?: PlanetId;
  equippedTacticalItem?: string;
  tournament?: {
    tournamentId?: string;
    matchId?: string;
    rngSeed?: number;
    rivalCallsign?: string;
    rivalAvatar?: string;
  };
}

export function GameProvider({
  children,
  difficulty = 'commander',
  specialty = 'commander',
  landingSite = 'jezero',
  cadet,
  squadCode,
  weatherSeed,
  initialState,
  isTimedMode,
  planetId = 'mars',
  equippedTacticalItem,
  tournament,
}: GameProviderProps) {
  const [state, rawDispatch] = useReducer(
    gameReducer,
    initialState &&
      initialState.phase !== 'victory' &&
      initialState.phase !== 'gameover' &&
      initialState.power > 0 &&
      initialState.oxygen > 0 &&
      initialState.shielding > 0
      ? initialState
      : createInitialState(
          difficulty,
          specialty,
          landingSite,
          cadet,
          squadCode ? { squadCode, weatherSeed } : undefined,
          isTimedMode,
          tournament,
          typeof window !== 'undefined'
            ? {
                isFiveStarGeneral: getBattlePassState().isFiveStarGeneral,
                retriesRemaining: getBattlePassState().isFiveStarGeneral ? 3 : 0,
              }
            : undefined,
          typeof window !== 'undefined' ? getStoredGuild() : undefined,
          planetId,
          equippedTacticalItem
        )
  );
  const [factIndex, setFactIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMED_CRISIS_SOL_SECONDS);
  const timeRemainingRef = useRef(TIMED_CRISIS_SOL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const activeSolRef = useRef(state.sol);
  const elapsedMissionSecondsRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isQuittingRef = useRef(false);

  const quitMission = useCallback(() => {
    isQuittingRef.current = true;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}

    const activeCadetId =
      state.cadetId ||
      cadet?.cadetId ||
      (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);

    if (activeCadetId) {
      fetch(`/api/save?cadetId=${encodeURIComponent(activeCadetId)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }
  }, [state.cadetId, cadet]);

  const isTimed = Boolean(state.isTimedMode ?? isTimedMode);

  // Wrapped dispatch to intercept actions and award Rapid Response Speed Bonus
  const dispatch: React.Dispatch<GameAction> = useCallback(
    (action) => {
      if (
        (action.type === 'PERFORM_ACTION' || action.type === 'PERFORM_OPERATION') &&
        isTimed &&
        state.phase === 'action'
      ) {
        if (timeRemainingRef.current > 0) {
          const bonus = Math.round(timeRemainingRef.current * 10);
          if (bonus > 0) {
            rawDispatch({ type: 'RECORD_TIMED_BONUS', bonusPoints: bonus });
          }
        }
      }
      rawDispatch(action);
    },
    [isTimed, state.phase]
  );

  // Reset countdown on new sol
  useEffect(() => {
    if (state.sol !== activeSolRef.current) {
      activeSolRef.current = state.sol;
      timeRemainingRef.current = TIMED_CRISIS_SOL_SECONDS;
      setTimeRemaining(TIMED_CRISIS_SOL_SECONDS);
    }
  }, [state.sol]);

  // Timed Crisis Mode Countdown Timer
  useEffect(() => {
    if (!isTimed) return;
    if (state.phase !== 'action' || isPaused) return;

    const interval = setInterval(() => {
      elapsedMissionSecondsRef.current += 0.1;
      const prev = timeRemainingRef.current;
      const next = Math.max(0, +(prev - 0.1).toFixed(1));
      timeRemainingRef.current = next;
      setTimeRemaining(next);

      if (next <= 0) {
        clearInterval(interval);
        // Timer ended: Player immediately loses mission in Timed Crisis Mode (or VIP retry activated)
        rawDispatch({
          type: 'TRIGGER_TIMEOUT_GAMEOVER',
        });
        if ((state.retriesRemaining ?? 0) > 0) {
          timeRemainingRef.current = TIMED_CRISIS_SOL_SECONDS;
          setTimeRemaining(TIMED_CRISIS_SOL_SECONDS);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isTimed, state.phase, isPaused, state.retriesRemaining]);

  // Load and synchronize Companion Pet, Slotted Boosts, and Marketplace Inventory
  useEffect(() => {
    let isMounted = true;
    const cadetId = state.cadetId || cadet?.cadetId || 'cadet-nova-01';
    const callsign = state.callsign || cadet?.callsign || 'CDR-NOVA';

    async function loadLoadout() {
      try {
        // 0. Synchronize Battle Pass / Five-Star General VIP entitlements
        try {
          const bp = getBattlePassState();
          if (bp.isFiveStarGeneral && (!state.isFiveStarGeneral || state.retriesRemaining === undefined)) {
            rawDispatch({
              type: 'SET_BATTLEPASS_ENTITLEMENTS',
              isFiveStarGeneral: true,
              retriesRemaining: 3,
            });
          }
        } catch {}

        // 1. Slotted boosts from localStorage
        let slotted: BoostSlug[] = ['cryo-o2-stim', 'lead-lined-nanogel'];
        try {
          const rawBoosts = localStorage.getItem('jat_slotted_boosts_v1');
          if (rawBoosts) {
            const parsed = JSON.parse(rawBoosts);
            if (Array.isArray(parsed) && parsed.length > 0) slotted = parsed as BoostSlug[];
          }
        } catch {}

        // 2. Fetch pets and profile
        let equippedPetData: GameState['equippedPet'] = null;
        const savedPetId = typeof window !== 'undefined' ? localStorage.getItem('jat_equipped_pet_v1') : null;

        const pRes = await fetch(`/api/profile/${encodeURIComponent(callsign)}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.profile) {
            const prof = pData.profile;
            const targetPet =
              prof.pets?.find((p: { id: string }) => p.id === savedPetId) ||
              prof.equippedPet ||
              prof.pets?.[0] ||
              null;

            if (targetPet) {
              const def = PET_CATALOG[targetPet.petSlug];
              equippedPetData = {
                id: targetPet.id,
                petSlug: targetPet.petSlug,
                nickname: targetPet.nickname,
                name: targetPet.nickname || def?.name || 'Companion',
                avatar: targetPet.avatar || def?.avatar || '🐾',
                level: targetPet.level || 1,
                xp: targetPet.xp || 0,
                perkType: targetPet.perkType || def?.perkType || 'o2_scavenge',
                perkValue: targetPet.perkValue || 15,
              };
            }
          }
        }

        // 3. Fetch marketplace inventory for combat consumables (empty by default)
        let inventoryMap: Record<string, number> = {};

        const wRes = await fetch(`/api/market/wallet?playerId=${encodeURIComponent(cadetId)}`);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.success && Array.isArray(wData.inventory)) {
            const freshMap: Record<string, number> = {};
            for (const item of wData.inventory) {
              if (item.quantity > 0) {
                freshMap[item.itemSlug] = item.quantity;
              }
            }
            inventoryMap = freshMap;
          }
        }

        if (isMounted) {
          rawDispatch({
            type: 'SYNC_LOADOUT',
            equippedPet: equippedPetData,
            slottedBoosts: slotted,
            combatInventory: inventoryMap,
          });
        }
      } catch (err) {
        console.warn('Non-blocking loadout synchronization notice:', err);
      }
    }

    loadLoadout();
    return () => {
      isMounted = false;
    };
  }, [state.cadetId, state.callsign, cadet?.cadetId, cadet?.callsign]);

  // Sync elapsed mission time on end
  useEffect(() => {
    if (state.phase === 'victory' || state.phase === 'gameover') {
      const totalSec = Math.round(elapsedMissionSecondsRef.current);
      if (totalSec > (state.missionTimeSeconds || 0)) {
        rawDispatch({
          type: 'UPDATE_MISSION_TIME',
          seconds: totalSec - (state.missionTimeSeconds || 0),
        });
      }
    }
  }, [state.phase, state.missionTimeSeconds]);

  const facts = useMemo(() => getPlanetFacts(state.planetId), [state.planetId]);

  const rotateFact = useCallback(() => {
    if (facts.length === 0) return;
    setFactIndex((prev) => (prev + 1) % facts.length);
  }, [facts.length]);

  // Rotate fact on each new sol
  useEffect(() => {
    rotateFact();
  }, [state.sol, rotateFact]);

  // ── Debounced Auto-Save & Cleanup ─────────────────────────
  useEffect(() => {
    // 1. Mission concluded or vital depletion: WIPE save slot unconditionally and abort any pending save
    if (
      state.phase === 'victory' ||
      state.phase === 'gameover' ||
      state.power <= 0 ||
      state.oxygen <= 0 ||
      state.shielding <= 0
    ) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      try {
        localStorage.removeItem('jat_active_save_v1');
      } catch {}

      const activeCadetId =
        state.cadetId ||
        cadet?.cadetId ||
        (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);

      if (activeCadetId) {
        fetch(`/api/save?cadetId=${encodeURIComponent(activeCadetId)}`, {
          method: 'DELETE',
          keepalive: true,
        }).catch(() => {});
      }
      return;
    }

    // Do not auto-save if an explicit quit has been triggered
    if (isQuittingRef.current) return;

    const activeCadetId =
      state.cadetId ||
      cadet?.cadetId ||
      (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);

    if (!activeCadetId) return;

    if (
      (state.phase === 'action' || state.phase === 'event' || state.phase === 'result') &&
      !isQuittingRef.current &&
      state.power > 0 &&
      state.oxygen > 0 &&
      state.shielding > 0
    ) {
      // Instant local persistence for active runs
      try {
        localStorage.setItem('jat_active_save_v1', JSON.stringify(state));
      } catch {}

      // Debounced 500ms cloud sync
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Prevent auto-save once game is over or concluded or quitting
        if (
          isQuittingRef.current ||
          state.phase === 'gameover' ||
          state.phase === 'victory' ||
          state.power <= 0 ||
          state.oxygen <= 0 ||
          state.shielding <= 0
        ) {
          return;
        }
        fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cadetId: activeCadetId, state }),
        }).catch(() => {});
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [state, cadet]);

  // ── Squad Mode Background Sync (Fire & Forget / Flaky Wi-Fi Resilient) ──
  useEffect(() => {
    const activeSquadCode = state.squadCode || squadCode;
    const activeCadetId = state.cadetId || cadet?.cadetId;
    if (!activeSquadCode || !activeCadetId) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    fetch('/api/squad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: 'SYNC',
        roomCode: activeSquadCode,
        cadet: {
          cadetId: activeCadetId,
          callsign: state.callsign || cadet?.callsign || 'ASTRONAUT',
          avatar: state.avatar || cadet?.avatar || '🚀',
          specialty: state.specialty || specialty,
          sol: state.sol,
          power: state.power,
          oxygen: state.oxygen,
          shielding: state.shielding,
          morale: state.morale,
          score: state.score,
          alive: state.phase !== 'gameover',
          updatedAt: Date.now(),
        },
      }),
    })
      .catch(() => {
        // Flaky Wi-Fi or offline: silently catch error so game loop never freezes
      })
      .finally(() => {
        clearTimeout(timer);
      });
  }, [
    state.sol,
    state.power,
    state.oxygen,
    state.shielding,
    state.morale,
    state.score,
    state.phase,
    state.squadCode,
    state.cadetId,
    state.callsign,
    state.avatar,
    state.specialty,
    squadCode,
    cadet,
    specialty,
  ]);

  // ── Real-Time Sabotage & Electronic Warfare Incoming Poller ──
  useEffect(() => {
    if (state.phase !== 'action' && state.phase !== 'event') return;
    const activeCadetId =
      state.cadetId ||
      cadet?.cadetId ||
      (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);
    if (!activeCadetId) return;

    let isMounted = true;
    const pollSabotage = async () => {
      try {
        const res = await fetch('/api/sabotage/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: activeCadetId,
            contextId: state.tournamentMatchId,
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && Array.isArray(data.events) && data.events.length > 0) {
          for (const ev of data.events) {
            rawDispatch({ type: 'RECEIVE_SABOTAGE', event: ev });
          }
        }
      } catch {
        // Resilient to offline/flaky network
      }
    };

    pollSabotage();
    const interval = setInterval(pollSabotage, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [state.phase, state.cadetId, state.tournamentMatchId, cadet]);

  const currentFact = facts.length > 0 ? facts[factIndex] : null;

  const gameContextValue = useMemo(
    () => ({
      state,
      dispatch,
      currentFact,
      rotateFact,
      timeRemaining: timeRemainingRef.current,
      isPaused,
      setIsPaused,
      quitMission,
    }),
    [state, dispatch, currentFact, rotateFact, isPaused, setIsPaused, quitMission]
  );

  const timerContextValue = useMemo(
    () => ({ timeRemaining }),
    [timeRemaining]
  );

  return (
    <GameContext.Provider value={gameContextValue}>
      <MissionTimerContext.Provider value={timerContextValue}>
        {children}
      </MissionTimerContext.Provider>
    </GameContext.Provider>
  );
}

export default GameProvider;
