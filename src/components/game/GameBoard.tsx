'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from './GameProvider';
import HUD from './HUD';
import OperationsDeck from './OperationsDeck';
import EventCard from './EventCard';
import MissionLog from './MissionLog';
import EndScreen from './EndScreen';
import NASAFactPopup from './NASAFactPopup';
import MarsView from './MarsView';
import PauseMenu from './PauseMenu';
import SquadMultiplayerHUD from './SquadMultiplayerHUD';
import RivalTelemetryBar from './RivalTelemetryBar';
import EarthImpactTriangulation from './minigames/EarthImpactTriangulation';
import VenusAerostatSurf from './minigames/VenusAerostatSurf';
import MercuryMeteorDefense from './minigames/MercuryMeteorDefense';
import JupiterGravitySlingshot from './minigames/JupiterGravitySlingshot';
import SaturnRingThreader from './minigames/SaturnRingThreader';
import UranusDiamondHarvester from './minigames/UranusDiamondHarvester';
import NeptuneJetstreamRunner from './minigames/NeptuneJetstreamRunner';
import PlanetXAnomalyBoss from './minigames/PlanetXAnomalyBoss';
import { startAmbientHum, stopAmbientHum } from '@/lib/sound';

interface GameBoardProps {
  onChangeDifficulty?: () => void;
  matchId?: string | null;
  cadetId?: string;
  cadetName?: string;
}

export default function GameBoard({
  onChangeDifficulty,
  matchId,
  cadetId,
  cadetName,
}: GameBoardProps) {
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
        {state.isEndlessTournament && state.tournamentId && state.tournamentMatchId && (
          <RivalTelemetryBar
            tournamentId={state.tournamentId}
            matchId={state.tournamentMatchId}
            entrantId={cadetId || 'cadet-nova-01'}
            currentSol={state.sol}
            rivalName={state.rivalCallsign}
            rivalAvatar={state.rivalAvatar}
          />
        )}
        {matchId && (
          <SquadMultiplayerHUD
            matchId={matchId}
            playerId={cadetId || 'cadet-anon'}
            playerName={cadetName || 'Astronaut'}
          />
        )}
        <HUD
          onOpenMenu={() => setIsPauseMenuOpen(true)}
          onOpenFacts={() => setShowFact(true)}
        />

        {/* Real-Time PvP Sabotage Warfare Overlays in Mini-Games & Mars */}
        {state.activeDebuffs && (state.activeDebuffs.empJammedSols > 0 || state.activeDebuffs.solarBlindedSols > 0 || state.activeDebuffs.spoofedAlertActive) && (
          <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none">
            {/* EMP Microwave Static Interference */}
            {state.activeDebuffs.empJammedSols > 0 && (
              <div className="absolute inset-0 bg-purple-950/25 mix-blend-color-dodge animate-pulse flex flex-col justify-between p-4">
                <div className="w-full bg-purple-900/80 border border-purple-400/80 p-2 text-center text-xs font-mono font-black text-purple-200 tracking-widest uppercase shadow-lg backdrop-blur-xs">
                  ⚡ HOSTILE EMP JAM ACTIVE — RADAR SENSORS SCRAMBLED ⚡
                </div>
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />
              </div>
            )}
            {/* Solar Flare / Regolith Dust Blinding Screen Mask */}
            {state.activeDebuffs.solarBlindedSols > 0 && (
              <div className="absolute inset-0 bg-amber-950/30 backdrop-blur-[1px] animate-pulse flex items-center justify-center">
                <div className="bg-black/80 border border-amber-500/80 px-4 py-2 rounded-xl text-center text-xs font-mono font-black text-amber-300 tracking-wider shadow-lg">
                  🌪️ SOLAR FLARE / REGOLITH BLINDING ACTIVE 🌪️
                </div>
              </div>
            )}
            {/* Comms Spoof Alert Warning */}
            {state.activeDebuffs.spoofedAlertActive && (
              <div className="absolute top-16 right-4 bg-rose-950/80 border border-rose-500 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-300 animate-bounce shadow-lg">
                ⚠️ COMMS SPOOF DETECTED: TELEMETRY DRIFT
              </div>
            )}
          </div>
        )}

        {/* Main content area: Route dedicated mini-games per planet, preserving classic 30-sol survival for Mars */}
        {state.planetId === 'earth' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <EarthImpactTriangulation />
          </main>
        ) : state.planetId === 'venus' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <VenusAerostatSurf />
          </main>
        ) : state.planetId === 'mercury' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <MercuryMeteorDefense />
          </main>
        ) : state.planetId === 'jupiter' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <JupiterGravitySlingshot />
          </main>
        ) : state.planetId === 'saturn' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <SaturnRingThreader />
          </main>
        ) : state.planetId === 'uranus' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <UranusDiamondHarvester />
          </main>
        ) : state.planetId === 'neptune' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <NeptuneJetstreamRunner />
          </main>
        ) : state.planetId === 'planet_x' ? (
          <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full">
            <PlanetXAnomalyBoss />
          </main>
        ) : (
          <main className="flex-1 flex flex-col lg:flex-row gap-2 p-2 sm:p-2.5 items-start">
            {/* Center panel: Classic Mars Card Survival */}
            <div className="flex-1 flex flex-col items-center justify-center gap-2 min-w-0">
              {/* Phase-specific content */}
              {state.phase === 'action' && !showFact && <OperationsDeck />}

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
        )}
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
