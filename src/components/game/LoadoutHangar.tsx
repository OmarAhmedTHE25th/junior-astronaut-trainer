'use client';

import React from 'react';
import Link from 'next/link';
import {
  RANK_TIERS,
  PET_CATALOG,
  BOOST_CATALOG,
  type PlayerPet,
  type BoostSlug,
  type CommanderProfile,
} from '@/lib/battleRoyaleTypes';
import { useSound } from '@/lib/sound';

interface LoadoutHangarProps {
  profile: CommanderProfile;
  selectedPetId: string | null;
  onSelectPet: (petId: string) => void;
  selectedBoosts: BoostSlug[];
  onToggleBoost: (boostSlug: BoostSlug) => void;
  onQueueBattleRoyale?: () => void;
  isQueueing?: boolean;
  standaloneMode?: boolean;
  onSaveLoadout?: () => void;
  onOpenBattleRoyale?: () => void;
}

export default function LoadoutHangar({
  profile,
  selectedPetId,
  onSelectPet,
  selectedBoosts,
  onToggleBoost,
  onQueueBattleRoyale,
  isQueueing,
  standaloneMode = false,
  onSaveLoadout,
  onOpenBattleRoyale,
}: LoadoutHangarProps) {
  const { playClick, playAction } = useSound();
  const rankMeta = profile.rankMeta || RANK_TIERS[profile.rankTier] || RANK_TIERS.dust_walker;

  // Calculate progress to next rank
  const currentRP = profile.rankPoints;
  const minRP = rankMeta.minRP;
  const maxRP = rankMeta.maxRP === 99999 ? 3000 : rankMeta.maxRP;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((currentRP - minRP) / (maxRP - minRP || 1)) * 100))
  );

  return (
    <div className="space-y-6 font-mono">
      {/* ── TOP RANK CREST & ELO BAR ── */}
      <div className="p-4 rounded-2xl bg-[#111827] border border-cyan-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border border-white/10"
            style={{ backgroundColor: `${rankMeta.color}25` }}
          >
            {rankMeta.crest}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-base text-white">
                {profile.username}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase"
                style={{
                  backgroundColor: `${rankMeta.color}20`,
                  borderColor: `${rankMeta.color}50`,
                  color: rankMeta.color,
                }}
              >
                {rankMeta.badge} {rankMeta.title}
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              Rank Rating: <strong className="text-amber-300">{profile.rankPoints} RP</strong> • Wins:{' '}
              <strong className="text-emerald-400">{profile.wins}</strong> ({profile.winRate}% Winrate)
            </p>
          </div>
        </div>

        {/* Rank Tier Progress Bar & Profile Link */}
        <div className="w-full sm:w-56 text-right">
          <div className="flex justify-between text-[10px] text-white/60 mb-1">
            <span>Tier Progress</span>
            <span className="font-bold text-amber-300">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/50 overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: rankMeta.color,
              }}
            />
          </div>
          <Link
            href={`/commander/${encodeURIComponent(profile.username)}`}
            className="text-[10px] text-cyan-300 hover:underline mt-1.5 inline-block"
          >
            View Public Dossier →
          </Link>
        </div>
      </div>

      {/* ── COMPANION PETS BAY ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h4 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider">
              Companion Pets Bay
            </h4>
            <p className="text-[11px] text-white/60">
              Equip a bio-engineered Mars pet for active life-support perks during battle royale drops.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.pets.map((pet) => {
            const isEquipped = selectedPetId === pet.id;
            const def = PET_CATALOG[pet.petSlug];

            return (
              <button
                key={pet.id}
                type="button"
                onClick={() => {
                  playClick();
                  onSelectPet(pet.id);
                }}
                className={`
                  p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer
                  ${
                    isEquipped
                      ? 'bg-purple-600/25 border-purple-400 ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/20'
                      : 'bg-[#121633] border-white/10 hover:border-white/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl p-2 rounded-xl bg-black/40 border border-white/10">
                    {pet.avatar || def?.avatar || '🐾'}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-extrabold text-sm text-white">
                        {pet.nickname || def?.name}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        Lv.{pet.level} {pet.rarity}
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-300 font-bold mt-0.5">
                      ⚡ {def?.perkLabel}
                    </p>
                    <p className="text-[10px] text-white/60 mt-0.5 max-w-[240px]">
                      {def?.perkDescription}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                    isEquipped
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/10 text-white/40 border-white/10'
                  }`}
                >
                  {isEquipped ? 'EQUIPPED' : 'EQUIP'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TACTICAL BOOST LOADOUT (SLOT UP TO 3) ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h4 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider">
              Tactical Boost Loadout ({selectedBoosts.length} / 3 Slotted)
            </h4>
            <p className="text-[11px] text-white/60">
              Select up to 3 consumable stims to activate inside Drop Zone: Olympus.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(Object.keys(BOOST_CATALOG) as BoostSlug[]).map((slug) => {
            const boost = BOOST_CATALOG[slug];
            const isSlotted = selectedBoosts.includes(slug);
            const userBoost = profile.boosts.find((b) => b.boostSlug === slug);
            const qty = userBoost?.quantity || 2;

            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  playClick();
                  onToggleBoost(slug);
                }}
                className={`
                  p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer
                  ${
                    isSlotted
                      ? 'bg-cyan-600/25 border-cyan-400 ring-2 ring-cyan-400/50 shadow-md'
                      : 'bg-[#121633] border-white/10 hover:border-white/30'
                  }
                `}
              >
                <div>
                  <div className="flex items-center justify-between text-lg mb-1">
                    <span>{boost.icon}</span>
                    <span className="text-[10px] font-mono text-white/50">x{qty}</span>
                  </div>
                  <span className="font-bold text-white text-xs block leading-tight truncate">
                    {boost.name}
                  </span>
                  <p className="text-[10px] text-cyan-300 font-bold mt-1">
                    {boost.tacticalEffect}
                  </p>
                </div>

                <div className="mt-2 pt-1 border-t border-white/10 text-right">
                  <span
                    className={`text-[9px] font-bold uppercase ${
                      isSlotted ? 'text-cyan-300' : 'text-white/40'
                    }`}
                  >
                    {isSlotted ? '● SLOTTED' : '+ SLOT'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ACTION BUTTONS: STANDALONE MODE VS BATTLE ROYALE DROP ── */}
      {standaloneMode ? (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              playAction();
              onSaveLoadout?.();
            }}
            className="
              flex-1 w-full py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300
              text-slate-950 font-heading font-extrabold text-base tracking-wider uppercase
              shadow-sm border border-cyan-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
            "
          >
            <span className="text-lg">✓</span>
            <span>Save &amp; Equip Loadout</span>
          </button>

          {onOpenBattleRoyale && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenBattleRoyale();
              }}
              className="
                w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700
                border border-slate-300/25 hover:border-slate-300/50 text-slate-100
                font-heading font-extrabold text-sm tracking-wider uppercase
                shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
              "
            >
              <span className="text-lg">🪂</span>
              <span>Launch Battle Royale</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={isQueueing}
          onClick={() => {
            playAction();
            onQueueBattleRoyale?.();
          }}
          className="
            w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500
            text-white font-heading font-extrabold text-base tracking-wider uppercase
            shadow-sm border border-rose-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
          "
        >
          <span className="text-xl animate-bounce">🪂</span>
          <span>{isQueueing ? 'Deploying Orbital Dropship...' : 'Drop into Mars Battle Royale (32-Cadet Lobby)'}</span>
        </button>
      )}
    </div>
  );
}
