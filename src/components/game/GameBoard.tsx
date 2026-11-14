'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from './GameProvider';
import HUD from './HUD';
import ActionPanel from './ActionPanel';
import EventCard from './EventCard';
import MissionLog from './MissionLog';
import EndScreen from './EndScreen';
import NASAFactPopup from './NASAFactPopup';
import MarsView from './MarsView';
import PauseMenu from './PauseMenu';
import { startAmbientHum, stopAmbientHum } from '@/lib/sound';

interface GameBoardProps {
  onChangeDifficulty?: () => void;
}

export default function GameBoard({ onChangeDifficulty }: GameBoardProps) {
  const { state, dispatch, rotateFact, setIsPaused } = useGame();
  const [showFact, setShowFact] = useState(false);
  const [lastFactSol, setLastFactSol] = useState(0);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState(false);

  // Pause countdown when Pause Menu or NASA Fact popup is open
  useEffect(() => {
    setIsPaused(isPauseMenuOpen || showFact);
  }, [isPauseMenuOpen, showFact, setIsPaused]);

  // Start subtle ambient hum on mount and clean up on unmount
  useEffect(() => {
    startAmbientHum();
    return () => {
      stopAmbientHum();
    };
  }, []);

  // Listen for Escape key: open Pause Menu if not already open.
  // When already open, the Modal component captures Escape and invokes onClose().
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // Don't open if another popup (like NASA Fact) is active
      if (showFact) return;
      if (!isPauseMenuOpen) {
        setIsPauseMenuOpen(true);
      }
    }
  }, [showFact, isPauseMenuOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Show NASA fact popup between turns (when sol advances and phase is 'action')
  useEffect(() => {
    if (state.phase === 'action' && state.sol > 1 && state.sol !== lastFactSol) {
      rotateFact();
      setShowFact(true);
      setLastFactSol(state.sol);
    }
  }, [state.sol, state.phase, lastFactSol, rotateFact]);

  // Auto-advance from result phase → next sol
  useEffect(() => {
    if (state.phase === 'result') {
      const timer = setTimeout(() => {
        dispatch({ type: 'NEXT_SOL' });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [state.phase, dispatch]);

  const isGameEnd = state.phase === 'gameover' || state.phase === 'victory';

  return (
    <div className="relative w-full min-h-screen bg-[#0B1026] overflow-hidden">
      {/* Mars landscape background */}
      <MarsView />

      {/* HUD overlay */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <HUD onOpenMenu={() => setIsPauseMenuOpen(true)} />

        {/* Main content area */}
        <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4 items-start">
          {/* Center panel */}
          <div className="flex-1 flex flex-col items-center justify-center gap-4 min-w-0">
            {/* Phase-specific content */}
            {state.phase === 'action' && !showFact && <ActionPanel />}

            {state.phase === 'event' && <EventCard />}

            {state.phase === 'result' && (
              <div
                className="text-center animate-[fade-in_0.3s_ease-out] p-8"
                role="status"
                aria-live="polite"
              >
                <p className="text-2xl text-[#F8FAFC] font-bold mb-2">
                  ⏳ Processing...
                </p>
                <p className="text-[#F8FAFC]/60">
                  Advancing to next sol...
                </p>
              </div>
            )}
          </div>

          {/* Mission Log sidebar */}
          <MissionLog />
        </main>
      </div>

      {/* Pause & Command Menu */}
      <PauseMenu
        isOpen={isPauseMenuOpen}
        onClose={() => setIsPauseMenuOpen(false)}
        onChangeDifficulty={onChangeDifficulty}
      />

      {/* NASA Fact popup */}
      {showFact && <NASAFactPopup onDismiss={() => setShowFact(false)} />}

      {/* End screen overlay */}
      {isGameEnd && <EndScreen />}
    </div>
  );
}
