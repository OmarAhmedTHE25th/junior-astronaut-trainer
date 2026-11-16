'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';
import { getPlanetCartridge, type PlanetExclusiveAction } from '@/lib/planetCartridges';
import {
  OPERATIONS_CATALOG,
  drawSolOperations,
  type OperationCard,
  type OperationCategory,
} from '@/lib/operationsDeck';
import { BOOST_CATALOG, type BoostSlug } from '@/lib/battleRoyaleTypes';

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
    border: 'border-cyan-500/40 hover:border-cyan-400',
    bg: 'bg-[#111827]',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-200',
    badgeBorder: 'border-cyan-400/30',
    titleColor: 'text-cyan-100 group-hover:text-cyan-300',
    tagLabel: '🫁 Life Support & Cryo',
  },
  power_thermal: {
    border: 'border-amber-500/40 hover:border-amber-400',
    bg: 'bg-[#111827]',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-200',
    badgeBorder: 'border-amber-400/30',
    titleColor: 'text-amber-100 group-hover:text-amber-300',
    tagLabel: '⚡ Power & Thermal',
  },
  structural_recon: {
    border: 'border-emerald-500/40 hover:border-emerald-400',
    bg: 'bg-[#111827]',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-200',
    badgeBorder: 'border-emerald-400/30',
    titleColor: 'text-emerald-100 group-hover:text-emerald-300',
    tagLabel: '🛡️ Structural & Recon',
  },
  high_risk_gambit: {
    border: 'border-rose-500/50 hover:border-rose-400',
    bg: 'bg-[#111827]',
    badgeBg: 'bg-rose-500/25',
    badgeText: 'text-rose-200',
    badgeBorder: 'border-rose-400/40',
    titleColor: 'text-rose-100 group-hover:text-rose-300',
    tagLabel: '⚠️ High-Risk Gambit',
  },
};

const SUPPLY_DEFS: Record<
  string,
  { name: string; icon: string; boostLabel: string; color: string }
> = {
  'oxygen-canister': {
    name: 'O₂ Canister',
    icon: '🫁',
    boostLabel: '+25% Oxygen',
    color: 'border-cyan-500/40 text-cyan-200 bg-cyan-950/40',
  },
  'fuel-cell': {
    name: 'Fuel Cell',
    icon: '⚡',
    boostLabel: '+25% Power',
    color: 'border-amber-500/40 text-amber-200 bg-amber-950/40',
  },
  'rad-shielding': {
    name: 'Rad-Shielding',
    icon: '🛡️',
    boostLabel: '+25% Shield',
    color: 'border-purple-500/40 text-purple-200 bg-purple-950/40',
  },
  'hull-plating': {
    name: 'Hull Plating',
    icon: '🧱',
    boostLabel: '+25% Shield',
    color: 'border-emerald-500/40 text-emerald-200 bg-emerald-950/40',
  },
  'hydroponic-rations': {
    name: 'Hydro Rations',
    icon: '🌱',
    boostLabel: '+20 Morale',
    color: 'border-green-500/40 text-green-200 bg-green-950/40',
  },
  'emergency-scrubber': {
    name: 'Quick Scrubber',
    icon: '🧯',
    boostLabel: '+15% O₂ / +10% Shield',
    color: 'border-blue-500/40 text-blue-200 bg-blue-950/40',
  },
};

export default function OperationsDeck() {
  const { state, dispatch } = useGame();
  const { playClick, playAction, playAlert, playSuccess } = useSound();
  const { profile } = useProfile();
  const [isSupplyDrawerOpen, setIsSupplyDrawerOpen] = useState(false);
  const isDisabled = state.phase !== 'action';
  const commandOverrides = state.commandOverrides ?? 1;
  const pet = state.equippedPet;
  const slottedBoosts = (state.slottedBoosts && state.slottedBoosts.length > 0
    ? state.slottedBoosts
    : ['cryo-o2-stim', 'lead-lined-nanogel']) as BoostSlug[];
  const combatInventory = state.combatInventory || {};

  // Resolve active 5-card hand from state or deterministic draw
  const activeCards: OperationCard[] = React.useMemo(() => {
    if (state.activeHand && state.activeHand.length >= 5) {
      const resolved = state.activeHand
        .map((id) => OPERATIONS_CATALOG.find((c) => c.id === id))
        .filter(Boolean) as OperationCard[];
      if (resolved.length === 5) return resolved;
    }
    return drawSolOperations(state).hand;
  }, [state]);

  const handleExecuteOperation = useCallback(
    (card: OperationCard) => {
      if (isDisabled) return;
      playAction();
      const liveBoosts = Object.keys(state.activeBoostTimers || {}).filter(
        (b) => (state.activeBoostTimers?.[b] || 0) > 0
      );
      dispatch({
        type: 'PERFORM_OPERATION',
        operationId: card.id,
        activePetId: pet?.petSlug || pet?.id || undefined,
        activeBoosts: liveBoosts,
      });
    },
    [isDisabled, playAction, state.activeBoostTimers, dispatch, pet]
  );

  const handleCommandOverride = useCallback(() => {
    if (isDisabled || commandOverrides <= 0) {
      playAlert();
      return;
    }
    playClick();
    dispatch({ type: 'COMMAND_OVERRIDE' });
  }, [isDisabled, commandOverrides, playAlert, playClick, dispatch]);

  const handleActivateBoost = useCallback(
    (boostSlug: BoostSlug) => {
      if (isDisabled) return;
      const currentTimer = state.activeBoostTimers?.[boostSlug] || 0;
      if (currentTimer > 0) return; // already active

      playSuccess();
      dispatch({ type: 'ACTIVATE_BOOST', boostSlug });
    },
    [isDisabled, state.activeBoostTimers, playSuccess, dispatch]
  );

  const handleDeploySupply = useCallback(
    (itemSlug: string) => {
      if (isDisabled) return;
      const qty = combatInventory[itemSlug] || 0;
      if (qty <= 0) {
        playAlert();
        return;
      }

      playAction();
      dispatch({ type: 'DEPLOY_SUPPLY', itemSlug });

      // Non-blocking server persistence
      const cadetId = state.cadetId || profile.cadetId || 'cadet-nova-01';
      fetch('/api/market/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: cadetId, itemSlug, count: 1 }),
      }).catch((err) => console.warn('Non-blocking supply consumption warning:', err));
    },
    [isDisabled, combatInventory, playAlert, playAction, dispatch, state.cadetId, profile.cadetId]
  );

  const totalSuppliesCount = Object.values(combatInventory).reduce(
    (sum, q) => sum + (typeof q === 'number' && q > 0 ? q : 0),
    0
  );

  const cartridge = useMemo(() => getPlanetCartridge(state.planetId || 'mars'), [state.planetId]);

  const handleExecutePlanetAction = useCallback(
    (actionId: string) => {
      if (isDisabled) return;
      playAction();
      dispatch({ type: 'EXECUTE_PLANET_ACTION', actionId });
    },
    [isDisabled, playAction, dispatch]
  );

  return (
    <section aria-label="Dynamic Tactical Operations Deck" className="w-full space-y-3 font-mono">
      {/* ── 1. ACTIVE COMPANION PET, TACTICAL STIMS & EMERGENCY SUPPLY BAY STRIP ── */}
      <div className="p-3 rounded-2xl bg-[#0F172A] border border-slate-700/80 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Active Companion Pet Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-black/50 border border-cyan-400/40 flex items-center justify-center text-xl shadow-inner">
              {pet ? pet.avatar : '🐾'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-heading font-extrabold text-xs text-white">
                  {pet ? pet.name : 'No Pet Equipped'}
                </span>
                {pet && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-400/30">
                    Lv.{pet.level}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-cyan-300/90 font-mono mt-0.5 block">
                {pet ? `Passive Perk: ${pet.perkType.replace(/_/g, ' ').toUpperCase()} (+${pet.perkValue}%)` : 'Deploy companion in Hangar for passive buffs'}
              </span>
            </div>
          </div>

          {/* Slotted Tactical Stim Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-white/50 uppercase tracking-widest hidden sm:inline">
              Tactical Stims:
            </span>
            {slottedBoosts.map((slug) => {
              const def = BOOST_CATALOG[slug];
              const timer = state.activeBoostTimers?.[slug] || 0;
              const isActive = timer > 0;

              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handleActivateBoost(slug)}
                  disabled={isDisabled || isActive}
                  className={`
                    px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md
                    ${
                      isActive
                        ? 'bg-emerald-600/30 border border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/30 animate-pulse'
                        : 'bg-[#0B1026] hover:bg-[#1a234f] border border-white/20 text-white/80 hover:text-white'
                    }
                    disabled:cursor-not-allowed
                  `}
                  title={
                    isActive
                      ? `${def?.name || slug} is currently active for ${timer} more Sol(s)`
                      : `Activate ${def?.name || slug}: ${def?.tacticalEffect || ''}`
                  }
                >
                  <span className="text-sm">{def?.icon || '💉'}</span>
                  <span className="text-[11px] font-semibold">{def?.name || slug}</span>
                  {isActive ? (
                    <span className="text-[9px] font-bold px-1 rounded bg-emerald-400/30 text-emerald-200 uppercase">
                      {timer}s Active
                    </span>
                  ) : (
                    <span className="text-[9px] text-cyan-300 font-normal">Inject</span>
                  )}
                </button>
              );
            })}

            {/* Toggle Emergency Supply Bay Drawer Button */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsSupplyDrawerOpen(!isSupplyDrawerOpen);
              }}
              className="
                px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700
                border border-slate-300/25 hover:border-slate-300/50 text-slate-100 shadow-sm
                hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5
              "
              title="Access emergency survival supplies bought on the Mars Marketplace"
            >
              <span>📦</span>
              <span>Emergency Supplies</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {totalSuppliesCount}
              </span>
              <span className="text-[10px] opacity-70">{isSupplyDrawerOpen ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* ── EXPANDABLE EMERGENCY SUPPLY BAY DRAWER ── */}
        {isSupplyDrawerOpen && (
          <div className="pt-3 border-t border-white/10 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <span>🛒</span>
                <span>Mars Marketplace Emergency Cache (Mid-Mission Instant Deployment)</span>
              </span>
              <span className="text-[10px] text-white/50">Consuming supplies does NOT end your Sol</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {Object.entries(SUPPLY_DEFS).map(([slug, def]) => {
                const qty = combatInventory[slug] || 0;
                const canUse = qty > 0 && !isDisabled;

                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => handleDeploySupply(slug)}
                    disabled={!canUse}
                    className={`
                      p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer min-h-[75px]
                      ${def.color}
                      ${canUse ? 'hover:scale-105 active:scale-95 shadow-md' : 'opacity-40 cursor-not-allowed'}
                    `}
                    title={`Deploy ${def.name} (${def.boostLabel})`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xl">{def.icon}</span>
                      <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                        x{qty}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[11px] font-bold block truncate">{def.name}</span>
                      <span className="text-[9px] opacity-80 block">{def.boostLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. DECK HEADER WITH CRISIS ALERT & RE-ROLL CTA ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#141b3d]/90 border border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl p-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/30">
            🎴
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-black text-sm sm:text-base text-white tracking-wide">
                {cartridge.dayUnit?.singular || 'Sol'} {state.sol} Tactical Operations Hand
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
            px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer
            ${
              commandOverrides > 0 && !isDisabled
                ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold hover:scale-105 active:scale-95 border border-cyan-200'
                : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed opacity-50'
            }
          `}
          title={
            commandOverrides > 0
              ? `Re-roll operations deck (${commandOverrides} available). Next re-roll granted in ${5 - (state.sol % 5 || 5)} ${cartridge.dayUnit?.plural.toLowerCase() || 'sols'}.`
              : `No overrides remaining. Next override unlocked at ${cartridge.dayUnit?.singular || 'Sol'} ${state.sol + (5 - (state.sol % 5 || 5))}.`
          }
        >
          <span className={commandOverrides > 0 ? 'animate-spin-slow' : ''}>🔄</span>
          <span>Command Override</span>
          <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] border border-white/20">
            {commandOverrides}
          </span>
        </button>
      </div>

      {/* ── 3. 5-CARD TACTICAL HAND GRID ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 items-stretch">
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
              return `-${v}${icon}`;
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
                  : '★';
              return `+${v}${icon}`;
            });

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleExecuteOperation(card)}
              disabled={isDisabled}
              title={card.description}
              className={`
                group relative flex flex-col justify-between p-3 rounded-xl
                ${theme.bg} border ${theme.border}
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                shadow-lg text-left cursor-pointer h-full min-h-[185px]
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {/* Top Meta: Category & Cooldown */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between gap-1 text-[9px]">
                  <span
                    className={`px-1.5 py-0.2 rounded-full font-bold border uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                  >
                    {theme.tagLabel}
                  </span>
                  <span className="text-[9px] text-white/50 font-mono whitespace-nowrap shrink-0">
                    ⏳ {card.cooldownSols}s CD
                  </span>
                </div>

                {/* Title & Icon */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-xl select-none group-hover:scale-110 transition-transform">
                    {card.icon}
                  </span>
                  <h3 className={`font-heading font-black text-xs leading-snug line-clamp-1 transition-colors ${theme.titleColor}`}>
                    {card.title}
                  </h3>
                </div>

                {/* Description (Clamped to 2 lines, full text in title tooltip) */}
                <p
                  className="text-[11px] text-starlight/75 line-clamp-2 leading-snug"
                  title={card.description}
                >
                  {card.description}
                </p>
              </div>

              {/* Bottom Meta: Cost/Yield Strip, Risk & Deploy Footer */}
              <div className="w-full pt-2 border-t border-white/10 space-y-1.5 mt-2">
                {/* Compact Cost & Yield Indicator Strip */}
                <div className="flex items-center justify-between px-2 py-0.5 rounded-lg bg-black/40 text-[10px] font-mono font-bold">
                  <span className={costItems.length > 0 ? 'text-rose-300' : 'text-emerald-400'}>
                    {costItems.length > 0 ? costItems.join(' ') : 'Free'}
                  </span>
                  <span className="text-white/20 font-light">|</span>
                  <span className="text-emerald-300 font-bold truncate max-w-[110px]">
                    {yieldItems.length > 0 ? yieldItems.join(' ') : '—'}
                  </span>
                </div>

                {/* Risk Percentage Badge */}
                <div>
                  {card.riskChance === 0 ? (
                    <div className="w-full py-0.5 px-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold flex items-center justify-center gap-1">
                      <span>🛡️ Safe (0%)</span>
                    </div>
                  ) : (
                    <div
                      className={`w-full py-0.5 px-1.5 rounded-md text-[9px] font-bold flex items-center justify-between gap-1 ${
                        card.riskChance >= 40
                          ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse'
                          : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      <span className="truncate">⚠️ {card.riskLabel || `${card.riskChance}% Risk`}</span>
                      <span className="opacity-70 text-[8px]">Roll</span>
                    </div>
                  )}
                </div>

                {/* Deploy Action Button */}
                <div
                  className="
                    w-full py-1 rounded-lg bg-white/10 group-hover:bg-white/20
                    text-center text-[10px] font-bold text-white transition-all
                    flex items-center justify-center gap-1
                  "
                >
                  <span>Deploy</span>
                  <span>→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 4. EXCLUSIVE PLANETARY CARTRIDGE OPERATIONS DECK ── */}
      <div className="pt-2 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-[#0e162e] border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-lg p-1 rounded-lg bg-black/40 border border-white/10">
              {cartridge.order === 'X' ? '👁️' : '🪐'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-xs text-white tracking-wide">
                  {cartridge.name.toUpperCase()} SIGNATURE PROTOCOLS
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  Level {cartridge.order}
                </span>
              </div>
              <p className="text-[9px] text-starlight/70 leading-none mt-0.5 truncate max-w-xl">
                {cartridge.signatureMechanic.description}
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 shrink-0">
            ⚠️ Hazard: {cartridge.signatureMechanic.hazardAlert}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {cartridge.actions.map((act) => {
            const isFrozen = Boolean(state.frozenActions?.includes(act.id));
            const cooldownUntil = state.operationCooldowns?.[act.id] || 0;
            const isOnCooldown = cooldownUntil > state.sol;
            const cooldownRemaining = cooldownUntil - state.sol;

            // Check resource costs
            const costs = act.resourceCosts || {};
            const metrics = state.planetMetrics || {};
            let hasEnoughResources =
              state.power >= (costs.power ?? 0) &&
              state.oxygen >= (costs.oxygen ?? 0) &&
              state.shielding >= (costs.shielding ?? 0);

            if (costs.customMetricCost) {
              for (const [mKey, mCost] of Object.entries(costs.customMetricCost)) {
                if ((metrics[mKey] ?? 0) < mCost) {
                  hasEnoughResources = false;
                  break;
                }
              }
            }

            const canExecute = !isDisabled && !isFrozen && !isOnCooldown && hasEnoughResources;

            const costBadges: string[] = [];
            if (costs.power) costBadges.push(`-${costs.power}⚡`);
            if (costs.oxygen) costBadges.push(`-${costs.oxygen}🫁`);
            if (costs.shielding) costBadges.push(`-${costs.shielding}🛡️`);
            if (costs.customMetricCost) {
              for (const [k, v] of Object.entries(costs.customMetricCost)) {
                costBadges.push(`-${v} ${k.slice(0, 4)}`);
              }
            }

            const gainBadges: string[] = [];
            const eff = act.guaranteedEffects;
            if (eff.power) gainBadges.push(`+${eff.power}⚡`);
            if (eff.oxygen) gainBadges.push(`+${eff.oxygen}🫁`);
            if (eff.shielding) gainBadges.push(`+${eff.shielding}🛡️`);
            if (eff.morale) gainBadges.push(`+${eff.morale} Morale`);
            if (eff.score) gainBadges.push(`+${eff.score}★`);
            if (eff.customMetricDelta) {
              for (const [k, v] of Object.entries(eff.customMetricDelta)) {
                gainBadges.push(`${v > 0 ? `+${v}` : v} ${k.slice(0, 4)}`);
              }
            }

            return (
              <button
                key={act.id}
                type="button"
                disabled={!canExecute}
                onClick={() => handleExecutePlanetAction(act.id)}
                title={act.description}
                className={`
                  p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[125px] relative overflow-hidden
                  ${
                    isFrozen
                      ? 'bg-cyan-950/40 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/40 opacity-80 cursor-not-allowed'
                      : isOnCooldown
                      ? 'bg-slate-900/60 border-slate-700/60 text-slate-400 opacity-60 cursor-not-allowed'
                      : !hasEnoughResources
                      ? 'bg-[#10142b]/80 border-rose-500/30 text-rose-200/80 opacity-70 cursor-not-allowed'
                      : 'bg-[#111736] hover:bg-[#1a2350] border-cyan-500/40 hover:border-cyan-300 text-white hover:scale-[1.02] active:scale-98 shadow-md'
                  }
                `}
              >
                {/* Status Badges */}
                {isFrozen && (
                  <div className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 text-[8px] font-black animate-pulse">
                    ❄️ FROZEN
                  </div>
                )}
                {isOnCooldown && !isFrozen && (
                  <div className="absolute top-1.5 right-1.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[8px] font-mono">
                    ⏳ {cooldownRemaining}s
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xl p-1 rounded-lg bg-black/40 border border-white/10 shrink-0">
                      {act.icon}
                    </span>
                    <div className="leading-tight overflow-hidden">
                      <span className="font-heading font-bold text-xs text-white truncate block">
                        {act.title}
                      </span>
                      <span className="text-[9px] text-cyan-300/80 truncate block">
                        {act.subtitle}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-starlight/75 truncate mt-0.5" title={act.description}>
                    {act.description}
                  </p>
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/10 space-y-1 text-[9px]">
                  <div className="flex items-center justify-between font-mono bg-black/30 px-1.5 py-0.5 rounded">
                    <span className="text-rose-300 truncate max-w-[50%]">{costBadges.length > 0 ? costBadges.join(' ') : 'Free'}</span>
                    <span className="text-emerald-300 font-bold truncate max-w-[50%] text-right">{gainBadges.join(' ')}</span>
                  </div>
                  <div className="w-full py-0.5 rounded bg-white/10 text-center font-bold text-[9px] text-white">
                    {isFrozen ? '❄️ Thaw' : isOnCooldown ? `⏳ (${cooldownRemaining})` : 'Execute →'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
