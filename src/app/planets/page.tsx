'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSound } from '@/lib/sound';
import { useBattlePass } from '@/lib/battlePass';
import { useWallet } from '@/context/WalletContext';
import {
  type PlanetId,
  ORDERED_PLANET_IDS,
  PLANET_CARTRIDGES,
  isPlanetUnlocked,
  getPlanetBestScores,
  isEasterEggUnlocked,
  unlockPlanetXEasterEgg,
} from '@/lib/planetCartridges';

export default function PlanetsMapPage() {
  const { playClick, playAlert, playSuccess } = useSound();
  const { state: bpState } = useBattlePass();
  const { creditsBalance, isFiveStarGeneral: walletVip } = useWallet();
  const isFiveStar = walletVip || Boolean(bpState.isFiveStarGeneral);

  const [mounted, setMounted] = useState<boolean>(false);
  const [bestScores, setBestScores] = useState<Record<PlanetId, number>>({} as Record<PlanetId, number>);
  const [isEasterEgg, setIsEasterEgg] = useState<boolean>(false);
  const [kuiperClicks, setKuiperClicks] = useState<number>(0);
  const [justUnlockedX, setJustUnlockedX] = useState<boolean>(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const refreshState = useCallback(() => {
    if (typeof window === 'undefined') return;
    setBestScores(getPlanetBestScores());
    setIsEasterEgg(isEasterEggUnlocked());
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshState();
    window.addEventListener('jat-planet-score-updated', refreshState);
    window.addEventListener('jat-planet-unlocked', refreshState);
    return () => {
      window.removeEventListener('jat-planet-score-updated', refreshState);
      window.removeEventListener('jat-planet-unlocked', refreshState);
    };
  }, [refreshState]);

  // Stealth Planet X 5-Click Easter Egg
  const handleKuiperClick = () => {
    playClick();
    const nextClicks = kuiperClicks + 1;
    setKuiperClicks(nextClicks);

    if (nextClicks >= 5 && !isEasterEgg) {
      unlockPlanetXEasterEgg();
      setIsEasterEgg(true);
      setJustUnlockedX(true);
      playAlert();
      setTimeout(() => playSuccess(), 400);
      setTimeout(() => setJustUnlockedX(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Background Grid & Stars */}
      <div className="fixed inset-0 pointer-events-none select-none opacity-40 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-[#070b19] to-black" />
      <div
        className="fixed inset-0 pointer-events-none select-none opacity-20 z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Screen Glitch Flash on Secret Unlock */}
      {justUnlockedX && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-fuchsia-600/30 animate-pulse mix-blend-screen" />
      )}

      {/* Top Header & Navigation */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#0B1026]/90 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={playClick}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono text-starlight hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>←</span>
              <span>Command Center</span>
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide flex items-center gap-2">
                <span>🪐</span>
                <span>SOLAR SYSTEM EXPEDITIONS</span>
              </h1>
              <p className="text-xs text-starlight/70 font-mono">
                Earth-First Progressive Campaign • 9 Celestial Sectors
              </p>
            </div>
          </div>

          {/* Header Action & Status Bar */}
          <div className="flex items-center gap-3">
            <Link
              href="/store"
              onClick={playClick}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5 shadow-sm"
              title="Colony Store & Gear"
            >
              <span>💰</span>
              <span>{creditsBalance} MC</span>
            </Link>

            {/* VIP Five-Star General Status Banner */}
            {isFiveStar && (
              <div className="px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-400/80 text-amber-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-pulse flex items-center gap-2">
                <span>👑</span>
                <span>FIVE-STAR GENERAL: ALL 9 SECTORS UNLOCKED</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Secret Planet X Decryption Toast */}
      {justUnlockedX && (
        <div className="relative z-30 max-w-xl mx-auto mt-4 px-4">
          <div className="p-4 rounded-2xl bg-fuchsia-950/90 border-2 border-fuchsia-400 text-fuchsia-200 shadow-[0_0_30px_rgba(217,70,239,0.5)] animate-slide-up flex items-center gap-3 font-mono">
            <span className="text-2xl">👁️</span>
            <div>
              <div className="font-extrabold text-sm text-white">SECRET ANOMALY DECRYPTED!</div>
              <div className="text-xs text-fuchsia-300/90">
                Sector X: Planet X clearance unlocked via Kuiper emergency telemetry override!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Campaign Grid */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Campaign Briefing Card */}
        <div className="p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold uppercase">
              <span>🚀</span>
              <span>Campaign Directive</span>
            </div>
            <div className="text-xs font-mono text-starlight/70">
              Clearance Mode: <strong className="text-white">Standard Survival (30 Sols)</strong>
            </div>
          </div>
          <p className="text-sm text-starlight/80 leading-relaxed max-w-4xl">
            Advance humanity&apos;s reach outward across the Solar System. Complete operations on each world in <strong>Standard Mode</strong> to exceed its target score clearance and unlock the next frontier sector.
          </p>
        </div>

        {/* 9-World Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ORDERED_PLANET_IDS.map((pid) => {
            const pCart = PLANET_CARTRIDGES[pid];
            const isSecret = Boolean(pCart.secret);
            const isUnlocked = isPlanetUnlocked(pid, isFiveStar, mounted ? bestScores : {});

            // Stealth Planet X: Completely hide while locked!
            if (isSecret && !isUnlocked) {
              return null;
            }

            const bestScore = bestScores[pid] || 0;
            const prevCart = pCart.prevPlanetId ? PLANET_CARTRIDGES[pCart.prevPlanetId] : null;

            return (
              <div
                key={pid}
                className={`
                  rounded-3xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden shadow-lg
                  ${
                    isSecret
                      ? 'bg-[#150a26] border-fuchsia-500/60 shadow-[0_0_25px_rgba(168,85,247,0.25)] hover:border-fuchsia-400'
                      : isUnlocked
                      ? `${pCart.theme.cardBg} ${pCart.theme.borderColor} ${pCart.theme.borderGlow} hover:scale-[1.02]`
                      : 'bg-[#0b1022]/80 border-slate-800 text-white/50 opacity-75'
                  }
                `}
              >
                {/* Visual Header / Artwork */}
                <div className="space-y-4">
                  <div className="relative w-full h-44 rounded-2xl bg-black/60 border border-white/10 overflow-hidden flex items-center justify-center p-3 shadow-inner">
                    {/* Planet Artwork with fallback to Symbol */}
                    {!imageErrors[pid] ? (
                      <img
                        src={pCart.image}
                        alt={pCart.name}
                        onError={() => setImageErrors((prev) => ({ ...prev, [pid]: true }))}
                        className={`max-h-full max-w-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-300 hover:scale-105 ${
                          !isUnlocked ? 'grayscale contrast-125 opacity-50' : ''
                        }`}
                      />
                    ) : (
                      <div className="text-6xl select-none filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                        {pid === 'earth' ? '🌍' : pid === 'mars' ? '♂' : pid === 'venus' ? '♀' : pid === 'mercury' ? '☿' : pid === 'jupiter' ? '♃' : pid === 'saturn' ? '🪐' : pid === 'uranus' ? '♅' : pid === 'neptune' ? '♆' : '👁️'}
                      </div>
                    )}

                    {/* Sector Tag */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-[10px] font-mono font-black text-white shadow-sm">
                      {pCart.sector}
                    </div>

                    {/* Status Pill */}
                    {isFiveStar ? (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-amber-500/30 border border-amber-400 text-amber-300 text-[10px] font-mono font-black shadow-sm">
                        👑 VIP
                      </div>
                    ) : isUnlocked ? (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold">
                        UNLOCKED
                      </div>
                    ) : (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-rose-500/30 border border-rose-500/50 text-rose-300 text-[10px] font-mono font-bold">
                        LOCKED
                      </div>
                    )}
                  </div>

                  {/* Planet Information */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xl font-heading font-black text-white">
                        {pCart.name}
                      </h3>
                      <span className="text-[11px] font-mono text-cyan-300/80">
                        {pCart.subtitle.split('•')[0]}
                      </span>
                    </div>
                    <p className="text-xs text-starlight/75 line-clamp-2 mt-1 leading-snug">
                      {pCart.description}
                    </p>
                  </div>

                  {/* Hazard Summary */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] font-mono space-y-1">
                    <div className="text-amber-300 font-bold flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span className="truncate">{pCart.signatureMechanic.name}</span>
                    </div>
                    <div className="text-[10px] text-starlight/70 line-clamp-1">
                      {pCart.signatureMechanic.hazardAlert}
                    </div>
                  </div>
                </div>

                {/* Score & Launch Footer */}
                <div className="mt-5 pt-3 border-t border-white/10 space-y-3">
                  {/* Best Score & Target */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/60">Best Score:</span>
                    <span className="text-amber-300 font-bold">
                      {bestScore > 0 ? `🏆 ${bestScore.toLocaleString()} PTS` : 'Unplayed'}
                    </span>
                  </div>

                  {/* Action Link or Lock Message */}
                  {isUnlocked ? (
                    <Link
                      href={`/planets/${pid}`}
                      onClick={playClick}
                      className="
                        w-full py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 border border-cyan-200
                        text-slate-950 font-heading font-extrabold text-xs sm:text-sm tracking-wider
                        flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95
                        transition-all shadow-md cursor-pointer
                      "
                    >
                      <span>ENTER BRIEFING</span>
                      <span className="text-base">→</span>
                    </Link>
                  ) : (
                    <div className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-rose-200 text-center font-mono text-[11px] space-y-1">
                      <div className="flex items-center justify-center gap-1 font-bold text-rose-400">
                        <span>🔒 LOCKED</span>
                      </div>
                      <div className="text-[10px] opacity-80 leading-snug">
                        Achieve <strong>{pCart.requiredPrevScore.toLocaleString()}+ PTS</strong> in Standard Mode on {prevCart?.name || 'previous sector'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stealth Planet X Easter Egg Footer */}
        <footer className="pt-12 pb-6 text-center">
          <button
            type="button"
            onClick={handleKuiperClick}
            className="opacity-25 hover:opacity-60 transition-opacity duration-300 text-[10px] font-mono text-cyan-300/80 cursor-pointer select-none py-2 px-4 rounded-xl border border-transparent hover:border-white/10"
            title="Lost Deep-Space Radio Frequency"
          >
            SYS_TELEMETRY // LOST SIGNAL DETECTED BEYOND KUIPER BELT [ERR_0x09]
          </button>
        </footer>
      </main>
    </div>
  );
}
