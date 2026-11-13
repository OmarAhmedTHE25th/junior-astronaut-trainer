'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { GameState, GameAction, Difficulty } from '@/lib/types';
import { gameReducer, createInitialState } from '@/lib/gameEngine';
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
}

export function GameProvider({ children, difficulty = 'commander' }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState(difficulty));
  const [factIndex, setFactIndex] = useState(0);

  const facts = nasaFacts as NASAFact[];

  const rotateFact = useCallback(() => {
    setFactIndex((prev) => (prev + 1) % facts.length);
  }, [facts.length]);

  // Rotate fact on each new sol
  useEffect(() => {
    rotateFact();
  }, [state.sol, rotateFact]);

  const currentFact = facts.length > 0 ? facts[factIndex] : null;

  return (
    <GameContext.Provider value={{ state, dispatch, currentFact, rotateFact }}>
      {children}
    </GameContext.Provider>
  );
}

export default GameProvider;
