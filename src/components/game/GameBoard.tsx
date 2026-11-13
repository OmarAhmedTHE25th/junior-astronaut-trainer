'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from './GameProvider';
import HUD from './HUD';
import ActionPanel from './ActionPanel';
import EventCard from './EventCard';
import MissionLog from './MissionLog';
import EndScreen from './EndScreen';
import NASAFactPopup from './NASAFactPopup';
import MarsView from './MarsView';

export default function GameBoard() {
  const { state, dispatch, rotateFact } = useGame();
  const [showFact, setShowFact] = useState(false);
  const [lastFactSol, setLastFactSol] = useState(0);

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
        <HUD />

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

      {/* NASA Fact popup */}
      {showFact && <NASAFactPopup onDismiss={() => setShowFact(false)} />}

      {/* End screen overlay */}
      {isGameEnd && <EndScreen />}
    </div>
  );
}
