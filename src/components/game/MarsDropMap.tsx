'use client';

import React from 'react';
import type { BRMatch, BRMatchPlayer, BRSector } from '@/lib/battleRoyaleTypes';
import { useSound } from '@/lib/sound';

interface MarsDropMapProps {
  match: BRMatch;
  currentPlayer: BRMatchPlayer;
  onMoveSector: (targetX: number, targetY: number) => void;
  isLoading?: boolean;
}

export default function MarsDropMap({
  match,
  currentPlayer,
  onMoveSector,
  isLoading,
}: MarsDropMapProps) {
  const { playClick } = useSound();

  const currentSector = match.sectors.find(
    (s) => s.x === currentPlayer.sectorX && s.y === currentPlayer.sectorY
  );

  const canMoveTo = (x: number, y: number) => {
    // Only adjacent sectors (cardinal or diagonal within 1 step)
    const dx = Math.abs(x - currentPlayer.sectorX);
    const dy = Math.abs(y - currentPlayer.sectorY);
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* ── TOP BATTLE ROYALE TELEMETRY HEADER ── */}
      <div className="p-3.5 rounded-2xl bg-[#090d20] border border-red-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <div>
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest block">
              Drop Zone: Olympus • Storm Shrink Stage {match.shrinkStage}/4
            </span>
            <span className="font-heading font-extrabold text-sm text-white">
              {match.aliveCount} / {match.totalPlayers} Commanders Alive
            </span>
          </div>
        </div>

        {/* Vital Life-Support Meters */}
        <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
          <span className="text-amber-300" title="Power">
            ⚡ {currentPlayer.power}%
          </span>
          <span className="text-cyan-300" title="Oxygen">
            🫁 {currentPlayer.oxygen}%
          </span>
          <span className="text-purple-300" title="Radiation Shielding">
            🛡️ {currentPlayer.shielding}%
          </span>
          <span className="text-rose-400" title="Airlock Hull">
            🛠️ {currentPlayer.hull}%
          </span>
        </div>
      </div>

      {/* ── 6x6 TACTICAL SECTOR GRID ── */}
      <div className="p-3 rounded-2xl bg-[#0B1026] border border-white/15 relative overflow-hidden">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {match.sectors.map((sector) => {
            const isPlayerHere =
              sector.x === currentPlayer.sectorX && sector.y === currentPlayer.sectorY;
            const isMovable = canMoveTo(sector.x, sector.y);

            // Count bots in this sector
            const botsHere = match.players.filter(
              (p) => p.isBot && p.status === 'alive' && p.sectorX === sector.x && p.sectorY === sector.y
            ).length;

            return (
              <button
                key={`${sector.x},${sector.y}`}
                type="button"
                disabled={isLoading || (!isMovable && !isPlayerHere)}
                onClick={() => {
                  if (isMovable) {
                    playClick();
                    onMoveSector(sector.x, sector.y);
                  }
                }}
                className={`
                  relative h-16 sm:h-20 p-1.5 rounded-xl border text-left transition-all flex flex-col justify-between overflow-hidden
                  ${
                    isPlayerHere
                      ? 'bg-cyan-600/30 border-cyan-400 ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20 z-10'
                      : sector.isStormZone
                      ? 'bg-red-950/40 border-red-500/40 opacity-75'
                      : isMovable
                      ? 'bg-[#141936] border-white/20 hover:border-cyan-400/80 hover:bg-[#1a2046] cursor-pointer'
                      : 'bg-black/30 border-white/5 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                {/* Sector Coordinates & Loot Badge */}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] w-full">
                  <span className="text-white/40 font-mono">
                    [{sector.x},{sector.y}]
                  </span>
                  {sector.hasSupplyDrop ? (
                    <span className="animate-bounce" title="Orbital Supply Drop!">
                      🚀
                    </span>
                  ) : sector.lootTier === 'high' ? (
                    <span className="text-amber-400 text-[8px] font-bold">HIGH</span>
                  ) : sector.isStormZone ? (
                    <span className="text-red-400 text-[8px] font-bold animate-pulse">RAD</span>
                  ) : null}
                </div>

                {/* Sector Name */}
                <span className="text-[9px] sm:text-[10px] text-white/90 font-bold truncate block">
                  {sector.name.split(' ')[0]}
                </span>

                {/* Sector Status Footer */}
                <div className="flex items-center justify-between text-[9px]">
                  {isPlayerHere ? (
                    <span className="px-1 py-0.2 rounded bg-cyan-400 text-black font-extrabold text-[8px]">
                      YOU
                    </span>
                  ) : botsHere > 0 ? (
                    <span className="text-red-300 font-mono text-[9px] flex items-center gap-0.5">
                      <span>⚠️</span>
                      <span>{botsHere}</span>
                    </span>
                  ) : (
                    <span className="text-white/30 text-[8px]">
                      {sector.elevation}
                    </span>
                  )}

                  {isMovable && !isPlayerHere && (
                    <span className="text-cyan-300 text-[8px] font-bold opacity-0 group-hover:opacity-100">
                      MOVE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CURRENT SECTOR INTEL PANEL ── */}
      {currentSector && (
        <div className="p-3.5 rounded-xl bg-[#121633] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">
              Current Sector Intel
            </span>
            <h4 className="font-heading font-extrabold text-white text-sm">
              {currentSector.name} ({currentSector.elevation})
            </h4>
            <p className="text-[11px] text-white/70">
              Loot Tier: <strong className="capitalize text-white">{currentSector.lootTier}</strong> •{' '}
              Radiation Index: <strong className={currentSector.isStormZone ? 'text-red-400' : 'text-emerald-400'}>
                {currentSector.radiationLevel} rad/s {currentSector.isStormZone && '(OUTSIDE SAFE ZONE)'}
              </strong>
            </p>
          </div>

          <div className="text-right flex items-center gap-2">
            <span className="text-[11px] text-white/60">
              Click any highlighted adjacent sector on the grid to relocate &amp; scavenge supplies!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
