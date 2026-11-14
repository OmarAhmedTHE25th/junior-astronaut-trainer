'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { GameState, GameAction, Difficulty, CadetSpecialty, LandingSiteId } from '@/lib/types';
import { gameReducer, createInitialState } from '@/lib/gameEngine';
import { TIMED_CRISIS_SOL_SECONDS, TIMEOUT_FALLBACK_ACTION } from '@/lib/constants';
import { getOrCreateCadetProfile } from '@/lib/profile';
import nasaFacts from '@/data/nasa-facts.json';

interface NASAFact {
  id: string;
  category: string;
  title: string;
  fact: string;
  nasaSource: string;
  funRating: number;
}

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  currentFact: NASAFact | null;
  rotateFact: () => void;
  timeRemaining: number;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

export const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
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
}: GameProviderProps) {
  const [state, rawDispatch] = useReducer(
    gameReducer,
    initialState ||
      createInitialState(
        difficulty,
        specialty,
        landingSite,
        cadet,
        squadCode ? { squadCode, weatherSeed } : undefined,
        isTimedMode
      )
  );
  const [factIndex, setFactIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIMED_CRISIS_SOL_SECONDS);
  const [isPaused, setIsPaused] = useState(false);
  const activeSolRef = useRef(state.sol);
  const elapsedMissionSecondsRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isTimed = Boolean(state.isTimedMode ?? isTimedMode);

  // Wrapped dispatch to intercept actions and award Rapid Response Speed Bonus
  const dispatch: React.Dispatch<GameAction> = useCallback(
    (action) => {
      if (
        action.type === 'PERFORM_ACTION' &&
        isTimed &&
        state.phase === 'action'
      ) {
        const playerAction = 'action' in action && action.action ? action.action : action.payload;
        if (playerAction && playerAction.id !== TIMEOUT_FALLBACK_ACTION.id && timeRemaining > 0) {
          const bonus = Math.round(timeRemaining * 10);
          if (bonus > 0) {
            rawDispatch({ type: 'RECORD_TIMED_BONUS', bonusPoints: bonus });
          }
        }
      }
      rawDispatch(action);
    },
    [isTimed, state.phase, timeRemaining]
  );

  // Reset countdown on new sol
  useEffect(() => {
    if (state.sol !== activeSolRef.current) {
      activeSolRef.current = state.sol;
      setTimeRemaining(TIMED_CRISIS_SOL_SECONDS);
    }
  }, [state.sol]);

  // Timed Crisis Mode Countdown Timer
  useEffect(() => {
    if (!isTimed) return;
    if (state.phase !== 'action' || isPaused) return;

    const interval = setInterval(() => {
      elapsedMissionSecondsRef.current += 0.1;
      setTimeRemaining((prev) => {
        const next = Math.max(0, +(prev - 0.1).toFixed(1));
        if (next <= 0) {
          clearInterval(interval);
          // Timer ended: Player immediately loses mission in Timed Crisis Mode
          rawDispatch({
            type: 'TRIGGER_TIMEOUT_GAMEOVER',
          });
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isTimed, state.phase, isPaused]);

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

  const facts = nasaFacts as NASAFact[];

  const rotateFact = useCallback(() => {
    setFactIndex((prev) => (prev + 1) % facts.length);
  }, [facts.length]);

  // Rotate fact on each new sol
  useEffect(() => {
    rotateFact();
  }, [state.sol, rotateFact]);

  // ── Debounced Auto-Save & Cleanup ─────────────────────────
  useEffect(() => {
    const activeCadetId =
      state.cadetId ||
      cadet?.cadetId ||
      (typeof window !== 'undefined' ? getOrCreateCadetProfile().cadetId : undefined);

    if (!activeCadetId || activeCadetId === 'cadet-nova-01') return;

    if (state.phase === 'victory' || state.phase === 'gameover') {
      // Clear active save slot when mission concludes
      try {
        localStorage.removeItem('jat_active_save_v1');
      } catch {}

      fetch(`/api/save?cadetId=${encodeURIComponent(activeCadetId)}`, {
        method: 'DELETE',
      }).catch(() => {});
      return;
    }

    if (state.phase === 'action' || state.phase === 'event') {
      // Instant local persistence
      try {
        localStorage.setItem('jat_active_save_v1', JSON.stringify(state));
      } catch {}

      // Debounced 500ms cloud sync
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
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

  const currentFact = facts.length > 0 ? facts[factIndex] : null;

  return (
    <GameContext.Provider
      value={{
        state,
        dispatch,
        currentFact,
        rotateFact,
        timeRemaining,
        isPaused,
        setIsPaused,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export default GameProvider;
