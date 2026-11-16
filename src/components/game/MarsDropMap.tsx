'use client';

import React, { useState } from 'react';
import type { BRMatch, BRMatchPlayer } from '@/lib/battleRoyaleTypes';
import {
  SABOTAGE_CATALOG,
  type SabotageSlug,
  type SabotagePaymentType,
} from '@/lib/sabotageTypes';
import { useSound } from '@/lib/sound';

interface MarsDropMapProps {
  match: BRMatch;
  currentPlayer: BRMatchPlayer;
  onMoveSector: (targetX: number, targetY: number) => void;
  onSabotageRival?: (
    targetPlayerId: string,
    slug: SabotageSlug,
    paymentType: SabotagePaymentType
  ) => void;
  isLoading?: boolean;
  isSabotaging?: boolean;
}

export default function MarsDropMap({
  match,
  currentPlayer,
  onMoveSector,
  onSabotageRival,
  isLoading,
  isSabotaging,
}: MarsDropMapProps) {
  const { playClick } = useSound();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<SabotagePaymentType>('power');

  const currentSector = match.sectors.find(
    (s) => s.x === currentPlayer.sectorX && s.y === currentPlayer.sectorY
  );

  const canMoveTo = (x: number, y: number) => {
    // Only adjacent sectors (cardinal or diagonal within 1 step)
    const dx = Math.abs(x - currentPlayer.sectorX);
    const dy = Math.abs(y - currentPlayer.sectorY);
    return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
  };

  // Find all active rival commanders within Electronic Warfare sensor range (adjacent or current sector)
  const inRangeRivals = match.players.filter(
    (p) =>
      p.status === 'alive' &&
      p.playerId !== currentPlayer.playerId &&
      Math.abs(p.sectorX - currentPlayer.sectorX) <= 1 &&
      Math.abs(p.sectorY - currentPlayer.sectorY) <= 1
  );

  // Default select first in-range rival if current selection died or moved away
  const activeTarget =
    inRangeRivals.find((p) => p.playerId === selectedTargetId) ||
    (inRangeRivals.length > 0 ? inRangeRivals[0] : null);

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
          {currentPlayer.kills > 0 && (
            <span className="text-emerald-400 font-extrabold" title="Confirmed Eliminations">
              💀 {currentPlayer.kills}
            </span>
          )}
        </div>
      </div>

      {/* ── 6x6 TACTICAL SECTOR GRID ── */}
      <div className="p-3 rounded-2xl bg-[#0B1026] border border-white/15 relative overflow-hidden">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {match.sectors.map((sector) => {
            const isPlayerHere =
              sector.x === currentPlayer.sectorX && sector.y === currentPlayer.sectorY;
            const isMovable = canMoveTo(sector.x, sector.y);

            // Count bots/rivals in this sector
            const botsHere = match.players.filter(
              (p) =>
                p.status === 'alive' &&
                p.playerId !== currentPlayer.playerId &&
                p.sectorX === sector.x &&
                p.sectorY === sector.y
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
                    <span className="text-rose-300 font-mono text-[9px] flex items-center gap-0.5 bg-rose-950/60 px-1 rounded border border-rose-500/30">
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

      {/* ── ELECTRONIC WARFARE & SABOTAGE TARGETING DRAWER ── */}
      {inRangeRivals.length > 0 && onSabotageRival && (
        <div className="p-3.5 rounded-2xl bg-[#0d122f] border border-purple-500/40 shadow-xl space-y-3 animate-fade-in">
          {/* Section Header with Currency Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">🎯</span>
              <div>
                <h4 className="text-white font-heading font-extrabold text-xs tracking-wider uppercase">
                  Offensive Sabotage &amp; Electronic Warfare
                </h4>
                <p className="text-[10px] text-purple-300">
                  {inRangeRivals.length} rival commander{inRangeRivals.length > 1 ? 's' : ''} detected in adjacent sectors!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-white/60">Pay with:</span>
              <div className="inline-flex rounded-lg bg-black/50 p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPaymentMode('power');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    paymentMode === 'power'
                      ? 'bg-amber-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  ⚡ Power ({currentPlayer.power}⚡)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setPaymentMode('mc');
                  }}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    paymentMode === 'mc'
                      ? 'bg-cyan-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  🪙 Credits
                </button>
              </div>
            </div>
          </div>

          {/* Rival Selector Carousel / Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {inRangeRivals.map((rival) => {
              const isSelected = activeTarget?.playerId === rival.playerId;
              const isPointBlank =
                rival.sectorX === currentPlayer.sectorX && rival.sectorY === currentPlayer.sectorY;

              return (
                <button
                  key={rival.playerId}
                  type="button"
                  onClick={() => {
                    playClick();
                    setSelectedTargetId(rival.playerId);
                  }}
                  className={`
                    px-3 py-1.5 rounded-xl border text-left flex items-center gap-2 text-xs transition-all shrink-0 cursor-pointer
                    ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-400 ring-1 ring-purple-400 text-white'
                        : 'bg-black/40 border-white/10 text-white/70 hover:border-white/30'
                    }
                  `}
                >
                  <span>{rival.avatar || '🤖'}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px]">{rival.username}</span>
                      <span
                        className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                          isPointBlank
                            ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {isPointBlank ? 'SAME SECTOR' : `[${rival.sectorX},${rival.sectorY}]`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-white/60">
                      <span>⚡{rival.power}%</span>
                      <span>🫁{rival.oxygen}%</span>
                      <span>🛠️{rival.hull}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Target Action Operations */}
          {activeTarget && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Op 1: EMP Telemetry Jam */}
              {(() => {
                const def = SABOTAGE_CATALOG['emp-jam'];
                const canAfford = paymentMode === 'power' ? currentPlayer.power >= def.powerCost : true;
                return (
                  <button
                    type="button"
                    disabled={!canAfford || isSabotaging}
                    onClick={() => {
                      playClick();
                      onSabotageRival(activeTarget.playerId, 'emp-jam', paymentMode);
                    }}
                    className="p-2 rounded-xl bg-[#14193d] border border-amber-500/30 hover:border-amber-400 hover:bg-[#1a2050] text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                        <span>⚡</span> EMP Telemetry Jam
                      </span>
                      <span className="text-[10px] text-amber-400 font-extrabold">
                        {paymentMode === 'power' ? `${def.powerCost}⚡` : `${def.mcCost} GC`}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/60 line-clamp-1">
                      Blinds enemy radar &amp; drains -18 Power
                    </p>
                  </button>
                );
              })()}

              {/* Op 2: Orbital Supply Intercept */}
              {(() => {
                const def = SABOTAGE_CATALOG['supply-intercept'];
                const canAfford = paymentMode === 'power' ? currentPlayer.power >= def.powerCost : true;
                return (
                  <button
                    type="button"
                    disabled={!canAfford || isSabotaging}
                    onClick={() => {
                      playClick();
                      onSabotageRival(activeTarget.playerId, 'supply-intercept', paymentMode);
                    }}
                    className="p-2 rounded-xl bg-[#14193d] border border-cyan-500/30 hover:border-cyan-400 hover:bg-[#1a2050] text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-cyan-300 text-[11px] flex items-center gap-1">
                        <span>🛰️</span> Supply Intercept
                      </span>
                      <span className="text-[10px] text-cyan-400 font-extrabold">
                        {paymentMode === 'power' ? `${def.powerCost}⚡` : `${def.mcCost} GC`}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/60 line-clamp-1">
                      Steals +6% O₂ &amp; +5% Power from target
                    </p>
                  </button>
                );
              })()}

              {/* Op 3: Regolith Dust / Laser Blind */}
              {(() => {
                const def = SABOTAGE_CATALOG['solar-blind'];
                const canAfford = paymentMode === 'power' ? currentPlayer.power >= def.powerCost : true;
                return (
                  <button
                    type="button"
                    disabled={!canAfford || isSabotaging}
                    onClick={() => {
                      playClick();
                      onSabotageRival(activeTarget.playerId, 'solar-blind', paymentMode);
                    }}
                    className="p-2 rounded-xl bg-[#14193d] border border-rose-500/30 hover:border-rose-400 hover:bg-[#1a2050] text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-rose-300 text-[11px] flex items-center gap-1">
                        <span>🌪️</span> Laser Blind Strike
                      </span>
                      <span className="text-[10px] text-rose-400 font-extrabold">
                        {paymentMode === 'power' ? `${def.powerCost}⚡` : `${def.mcCost} GC`}
                      </span>
                    </div>
                    <p className="text-[10px] text-white/60 line-clamp-1">
                      Deals 15 Hull Damage &amp; blinds sensors
                    </p>
                  </button>
                );
              })()}
            </div>
          )}
        </div>
      )}

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
              Radiation Index:{' '}
              <strong className={currentSector.isStormZone ? 'text-red-400' : 'text-emerald-400'}>
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
