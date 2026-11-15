'use client';

import React, { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { RANK_TIERS, PET_CATALOG, type CommanderProfile } from '@/lib/battleRoyaleTypes';

function CommanderProfileContent({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const unwrappedParams = use(params);
  const cleanUser = decodeURIComponent(unwrappedParams.username || 'Commander').trim();

  const [profile, setProfile] = useState<CommanderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(cleanUser)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [cleanUser]);

  const rankMeta = profile
    ? profile.rankMeta || RANK_TIERS[profile.rankTier] || RANK_TIERS.dust_walker
    : RANK_TIERS.dust_walker;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <Link
          href="/"
          className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5"
        >
          <span>←</span>
          <span>Return to Mission Control</span>
        </Link>
        <span className="text-xs font-mono text-white/40 uppercase">
          Official Planetary Dossier • Sol 2026
        </span>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-sm font-mono text-cyan-300 animate-pulse">
          🛰️ Decrypting Planetary Dossier for {cleanUser}...
        </div>
      ) : profile ? (
        <>
          {/* ── COMMANDER PROFILE HEADER CARD ── */}
          <div className="p-6 rounded-3xl bg-[#111827] border border-slate-700/80 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-xl border border-white/15"
                style={{ backgroundColor: `${rankMeta.color}30` }}
              >
                {rankMeta.crest}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                    {profile.username}
                  </h1>
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase"
                    style={{
                      backgroundColor: `${rankMeta.color}25`,
                      borderColor: `${rankMeta.color}60`,
                      color: rankMeta.color,
                    }}
                  >
                    {rankMeta.badge} {rankMeta.title}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Colony Identifier: <code className="text-cyan-300">{profile.playerId}</code>
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 text-center w-full md:w-auto">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-white/50 uppercase block">Rank Rating</span>
                <span className="font-heading font-extrabold text-lg text-amber-300">
                  {profile.rankPoints} <span className="text-xs">RP</span>
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-white/50 uppercase block">Victory Rate</span>
                <span className="font-heading font-extrabold text-lg text-emerald-400">
                  {profile.winRate}%
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10">
                <span className="text-[10px] text-white/50 uppercase block">Net Worth</span>
                <span className="font-heading font-extrabold text-lg text-cyan-300">
                  {profile.marketplaceNetWorth} <span className="text-xs">MC</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── EQUIPPED COMPANION PET SECTION ── */}
          <div className="p-5 rounded-2xl bg-[#121633]/90 border border-purple-500/30">
            <h2 className="font-heading font-extrabold text-sm text-purple-300 uppercase tracking-wider mb-3">
              Active Companion Pet
            </h2>
            {profile.equippedPet ? (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
                <span className="text-4xl p-2 rounded-2xl bg-purple-600/20 border border-purple-400/40">
                  {profile.equippedPet.avatar || '🐾'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-base text-white">
                      {profile.equippedPet.nickname}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                      Level {profile.equippedPet.level} • {profile.equippedPet.rarity}
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300 font-bold mt-0.5">
                    ⚡ {PET_CATALOG[profile.equippedPet.petSlug]?.perkLabel}
                  </p>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    {PET_CATALOG[profile.equippedPet.petSlug]?.perkDescription}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/50">No companion pet currently equipped.</p>
            )}
          </div>

          {/* ── RECENT BATTLE ROYALE MATCH HISTORY ── */}
          <div className="p-5 rounded-2xl bg-[#121633]/90 border border-white/10 space-y-3">
            <h2 className="font-heading font-extrabold text-sm text-white uppercase tracking-wider">
              Recent Match History (Drop Zone: Olympus)
            </h2>
            <div className="space-y-2">
              {profile.recentMatches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-heading font-extrabold text-sm ${
                        m.placement === 1 ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      #{m.placement}
                    </span>
                    <div>
                      <span className="font-bold text-white block">
                        {m.placement === 1 ? '🏆 VICTORY ROYALE' : 'Top Survivor Squad'}
                      </span>
                      <span className="text-[10px] text-white/50">
                        Match ID: {m.matchId} • {m.kills} Eliminations
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-emerald-400 block">
                      +{m.rpChange} RP
                    </span>
                    <span className="text-[10px] text-white/40">Competitive Match</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-sm text-white/50">
          Dossier not found for commander {cleanUser}.
        </div>
      )}
    </div>
  );
}

export default function CommanderProfilePage(props: {
  params: Promise<{ username: string }>;
}) {
  return (
    <div className="min-h-screen bg-[#0B1026] text-white p-4 sm:p-8 font-mono">
      <Suspense
        fallback={
          <div className="max-w-4xl mx-auto py-20 text-center text-sm font-mono text-cyan-300 animate-pulse">
            🛰️ Accessing Planetary Defense Dossier Archive...
          </div>
        }
      >
        <CommanderProfileContent params={props.params} />
      </Suspense>
    </div>
  );
}
