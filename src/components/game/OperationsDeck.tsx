'use client';

import React from 'react';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';
import {
  OPERATIONS_CATALOG,
  drawSolOperations,
  type OperationCard,
  type OperationCategory,
} from '@/lib/operationsDeck';

const CATEGORY_THEMES: Record<
  OperationCategory,
  {
    border: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    titleColor: string;
    tagLabel: string;
  }
> = {
  life_support: {
    border: 'border-cyan-500/50 hover:border-cyan-400',
    bg: 'from-cyan-950/40 via-[#0e1633] to-[#0B1026]',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-200',
    badgeBorder: 'border-cyan-400/30',
    titleColor: 'text-cyan-100 group-hover:text-cyan-300',
    tagLabel: '🫁 Life Support & Cryo',
  },
  power_thermal: {
    border: 'border-amber-500/50 hover:border-amber-400',
    bg: 'from-amber-950/40 via-[#17142b] to-[#0B1026]',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-400/30',
    titleColor: 'text-amber-100 group-hover:text-amber-300',
    tagLabel: '⚡ Power & Thermal',
  },
  structural_recon: {
    border: 'border-emerald-500/50 hover:border-emerald-400',
    bg: 'from-emerald-950/40 via-[#0e192c] to-[#0B1026]',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-200',
    badgeBorder: 'border-emerald-400/30',
    titleColor: 'text-emerald-100 group-hover:text-emerald-300',
    tagLabel: '🛡️ Structural & Recon',
  },
  high_risk_gambit: {
    border: 'border-rose-500/60 hover:border-rose-400',
    bg: 'from-rose-950/45 via-[#1a0f2b] to-[#0B1026]',
    badgeBg: 'bg-rose-500/25',
    badgeText: 'text-rose-200',
    badgeBorder: 'border-rose-400/40',
    titleColor: 'text-rose-100 group-hover:text-rose-300',
    tagLabel: '⚠️ High-Risk Gambit',
  },
};

export default function OperationsDeck() {
  const { state, dispatch } = useGame();
  const { playClick, playAction, playAlert } = useSound();
  const { profile } = useProfile();

  const isDisabled = state.phase !== 'action';
  const commandOverrides = state.commandOverrides ?? 1;

  // Resolve active 5-card hand from state or deterministic draw
  const activeCards: OperationCard[] = React.useMemo(() => {
    if (state.activeHand && state.activeHand.length >= 5) {
      const resolved = state.activeHand
        .map((id) => OPERATIONS_CATALOG.find((c) => c.id === id))
        .filter(Boolean) as OperationCard[];
      if (resolved.length === 5) return resolved;
    }
    // Fallback: draw dynamically
    return drawSolOperations(state).hand;
  }, [state]);

  const handleExecuteOperation = (card: OperationCard) => {
    if (isDisabled) return;
    playAction();
    dispatch({
      type: 'PERFORM_OPERATION',
      operationId: card.id,
      activePetId: profile?.callsign || undefined,
      activeBoosts: [],
    });
  };

  const handleCommandOverride = () => {
    if (isDisabled || commandOverrides <= 0) {
      playAlert();
      return;
    }
    playClick();
    dispatch({ type: 'COMMAND_OVERRIDE' });
  };

  return (
    <section aria-label="Dynamic Tactical Operations Deck" className="w-full space-y-3 font-mono">
      {/* ── DECK HEADER WITH CRISIS ALERT & RE-ROLL CTA ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#141b3d]/90 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
            🎴
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-sm sm:text-base text-white tracking-wide">
                Sol {state.sol} Tactical Operations Hand
              </h2>
              {state.hasEmergencyDraw && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 uppercase animate-pulse">
                  🚨 Emergency Draw Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-starlight/70 leading-none mt-0.5">
              5 situational operations drafted for current telemetry &amp; DONKI space weather.
            </p>
          </div>
        </div>

        {/* Command Override (Re-Roll) Button */}
        <button
          type="button"
          onClick={handleCommandOverride}
          disabled={isDisabled || commandOverrides <= 0}
          className={`
            px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer
            ${
              commandOverrides > 0 && !isDisabled
                ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white hover:scale-105 active:scale-95 border border-purple-400/50'
                : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed opacity-50'
            }
          `}
          title={
            commandOverrides > 0
              ? `Re-roll operations deck (${commandOverrides} available). Next re-roll granted in ${5 - (state.sol % 5 || 5)} sols.`
              : `No overrides remaining. Next override unlocked at Sol ${state.sol + (5 - (state.sol % 5 || 5))}.`
          }
        >
          <span className={commandOverrides > 0 ? 'animate-spin-slow' : ''}>🔄</span>
          <span>Command Override</span>
          <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] border border-white/20">
            {commandOverrides}
          </span>
        </button>
      </div>

      {/* ── 5-CARD TACTICAL HAND GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {activeCards.map((card) => {
          const theme = CATEGORY_THEMES[card.category];

          // Format costs
          const costItems = Object.entries(card.resourceCosts)
            .filter(([, v]) => typeof v === 'number' && v > 0)
            .map(([k, v]) => {
              const icon =
                k === 'power'
                  ? '⚡'
                  : k === 'oxygen'
                  ? '🫁'
                  : k === 'shielding'
                  ? '🛡️'
                  : '💪';
              return `-${v} ${icon}`;
            });

          // Format yields
          const yieldItems = Object.entries(card.guaranteedEffects)
            .filter(([, v]) => typeof v === 'number' && v > 0)
            .map(([k, v]) => {
              const icon =
                k === 'power'
                  ? '⚡'
                  : k === 'oxygen'
                  ? '🫁'
                  : k === 'shielding'
                  ? '🛡️'
                  : k === 'morale'
                  ? '💪'
                  : '⭐';
              return `+${v} ${icon}`;
            });

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleExecuteOperation(card)}
              disabled={isDisabled}
              className={`
                group relative flex flex-col justify-between p-4 rounded-2xl
                bg-gradient-to-b ${theme.bg} border-2 ${theme.border}
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                shadow-xl text-left cursor-pointer min-h-[290px]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {/* Top Meta: Category & Cooldown */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between gap-1 text-[10px]">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                  >
                    {theme.tagLabel}
                  </span>
                  <span className="text-[10px] text-white/50 font-mono">
                    ⏳ {card.cooldownSols}s CD
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-2xl select-none group-hover:scale-110 transition-transform">
                    {card.icon}
                  </span>
                  <div>
                    <h3 className={`font-heading font-black text-sm leading-tight transition-colors ${theme.titleColor}`}>
                      {card.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-starlight/75 leading-relaxed pt-1 line-clamp-3">
                  {card.description}
                </p>
              </div>

              {/* Bottom Meta: Cost, Yield, and Risk Roll */}
              <div className="w-full pt-3 border-t border-white/10 space-y-2">
                {/* Cost & Yield Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-mono font-bold">
                  {costItems.length > 0 ? (
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <span className="text-[9px] uppercase tracking-wider text-rose-400/80 font-normal">
                        Cost:
                      </span>
                      <span>{costItems.join(' ')}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-emerald-400/80">Cost: 0</span>
                  )}

                  <div className="flex items-center gap-1.5 text-emerald-300 ml-auto">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-normal">
                      Gain:
                    </span>
                    <span>{yieldItems.join(' ')}</span>
                  </div>
                </div>

                {/* Risk Percentage Badge */}
                <div>
                  {card.riskChance === 0 ? (
                    <div className="w-full py-1 px-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center justify-center gap-1">
                      <span>🛡️</span>
                      <span>100% SAFE (0% RISK)</span>
                    </div>
                  ) : (
                    <div
                      className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-between gap-1 ${
                        card.riskChance >= 40
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse'
                          : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <span>⚠️ {card.riskLabel || `${card.riskChance}% Hazard Risk`}</span>
                      <span className="opacity-70 text-[9px]">Roll</span>
                    </div>
                  )}
                </div>

                {/* Deploy Action Button */}
                <div className="pt-1">
                  <div
                    className="
                      w-full py-1.5 rounded-xl bg-white/10 group-hover:bg-white/20
                      text-center text-[11px] font-bold text-white transition-all
                      flex items-center justify-center gap-1.5
                    "
                  >
                    <span>Commit Operation</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
