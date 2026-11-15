'use client';

import React from 'react';
import Link from 'next/link';
import ColonyStoreContent from '@/components/game/ColonyStoreContent';
import { useSound } from '@/lib/sound';
import { useProfile } from '@/lib/profile';

export default function StorePage() {
  const { isMuted, toggleSound, playClick } = useSound();
  const { profile } = useProfile();

  return (
    <>
      {/* Starfield background */}
      <div className="starfield-bg" aria-hidden="true" />

      <main className="relative z-10 flex flex-col min-h-screen text-starlight">
        {/* ───────── TOP FLIGHT-DECK NAVIGATION BAR ───────── */}
        <header className="w-full bg-[#070b1a]/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 font-mono">
            {/* Left: Return Link */}
            <Link
              href="/"
              onClick={playClick}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-xs font-bold text-cyan-300 hover:text-white transition-all shadow-sm active:scale-95 group"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Return to Mission Control</span>
            </Link>

            {/* Center: Title / Context */}
            <div className="hidden md:flex items-center gap-2.5">
              <span className="text-xl">📦</span>
              <div>
                <h1 className="font-heading font-black text-sm text-white tracking-wide">
                  COLONY SUPPLY STORE &amp; OUTPOST LOGISTICS
                </h1>
                <span className="text-[10px] text-cyan-400/80 block uppercase tracking-wider">
                  NASA Space Apps 2026 • Deep Space Mesh Depot
                </span>
              </div>
            </div>

            {/* Right: Sound & Cadet Callsign */}
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs">
                <span className="text-base">{profile.avatar || '👨‍🚀'}</span>
                <span className="font-bold text-white text-[11px] truncate max-w-[120px]">
                  {profile.callsign || 'CADET'}
                </span>
              </div>

              <button
                type="button"
                onClick={toggleSound}
                className="flex items-center justify-center p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-white/15 text-white transition-all cursor-pointer min-h-[38px] min-w-[38px] shadow-sm text-sm"
                title={isMuted ? 'Turn Sound ON' : 'Turn Sound OFF'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>
        </header>

        {/* ───────── FULL-SCREEN STORE CONTENT CONTAINER ───────── */}
        <section className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <ColonyStoreContent layoutMode="page" />
        </section>
      </main>
    </>
  );
}
