'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSound } from '@/lib/sound';
import { useBattlePass } from '@/lib/battlePass';
import { useProfile } from '@/lib/profile';
import {
  type PlanetId,
  PLANET_CARTRIDGES,
  isPlanetUnlocked,
  getPlanetBestScores,
  getPlanetCartridge,
} from '@/lib/planetCartridges';
import { BOOST_CATALOG } from '@/lib/battleRoyaleTypes';

function PlanetBriefingContent() {
  const router = useRouter();
  const rawParams = useParams();
  const planetParam = (Array.isArray(rawParams?.planetId) ? rawParams.planetId[0] : rawParams?.planetId) as PlanetId;

  const { playClick, playAction, playAlert } = useSound();
  const { profile } = useProfile();
  const { state: bpState } = useBattlePass();
  const isFiveStar = Boolean(bpState.isFiveStarGeneral);

  const cartridge = useMemo(() => getPlanetCartridge(planetParam), [planetParam]);
  const [selectedSite, setSelectedSite] = useState<string>(() => cartridge.locations[0]?.id || 'site_1');
  const [gameMode, setGameMode] = useState<'standard' | 'timed' | 'endless'>('standard');
  const [imageError, setImageError] = useState<boolean>(false);
  const [bestScores, setBestScores] = useState<Record<PlanetId, number>>({} as Record<PlanetId, number>);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBestScores(getPlanetBestScores());
    }
    if (cartridge.locations[0]) {
      setSelectedSite(cartridge.locations[0].id);
    }
  }, [cartridge]);

  const isUnlocked = useMemo(() => {
    return isPlanetUnlocked(cartridge.id, isFiveStar, bestScores);
  }, [cartridge.id, isFiveStar, bestScores]);

  const prevCartridge = cartridge.prevPlanetId ? PLANET_CARTRIDGES[cartridge.prevPlanetId] : null;
  const prevScore = cartridge.prevPlanetId ? bestScores[cartridge.prevPlanetId] || 0 : 0;

  const handleLaunch = () => {
    playAction();
    const query = new URLSearchParams();
    query.set('planet', cartridge.id);
    query.set('site', selectedSite);
    if (gameMode === 'timed') {
      query.set('timed', 'true');
    }
    if (gameMode === 'endless') {
      query.set('tournamentId', 'campaign-endless');
    }
    router.push(`/game?${query.toString()}`);
  };

  // ── ACCESS DENIED SCREEN (Direct URL Navigation to Locked Planet) ──
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#070b19] text-white flex flex-col items-center justify-center p-4 sm:p-8 font-mono relative selection:bg-rose-500 selection:text-white">
        <div className="fixed inset-0 pointer-events-none select-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-950/30 via-slate-950 to-black" />

        <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-[#0e1428]/95 border-2 border-rose-500/70 shadow-[0_0_50px_rgba(244,63,94,0.3)] relative z-10 space-y-6 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/50 mx-auto flex items-center justify-center text-3xl shadow-inner">
            <span>🚨</span>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest">
              Access Denied • Clearance Level Insufficient
            </span>
            <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
              {cartridge.sector} // {cartridge.name.toUpperCase()}
            </h1>
            <p className="text-xs sm:text-sm text-starlight/80 leading-relaxed">
              Orbital command has sealed departure telemetry for this sector. You must achieve clearance in the preceding campaign stage.
            </p>
          </div>

          {/* Clearance Criteria Card */}
          <div className="p-4 rounded-2xl bg-black/50 border border-rose-500/30 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-rose-300 font-bold">
              <span>Required Standard Score on {prevCartridge?.name || 'Preceding World'}:</span>
              <span className="text-sm font-mono">{cartridge.requiredPrevScore.toLocaleString()} PTS</span>
            </div>
            <div className="flex items-center justify-between text-starlight/70 font-mono">
              <span>Your Current Best Score:</span>
              <span className={`font-bold ${prevScore >= cartridge.requiredPrevScore ? 'text-emerald-400' : 'text-amber-400'}`}>
                {prevScore.toLocaleString()} PTS
              </span>
            </div>
          </div>

          {/* Return CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/planets"
              onClick={playClick}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs hover:scale-105 transition-all cursor-pointer"
            >
              ← Return to Solar System Map
            </Link>
            {prevCartridge && (
              <Link
                href={`/planets/${prevCartridge.id}`}
                onClick={playClick}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 border border-cyan-200 text-slate-950 font-bold text-xs hover:scale-105 transition-all cursor-pointer shadow-md"
              >
                Deploy to {prevCartridge.name} →
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── UNLOCKED COMMAND BRIEFING CENTER ──
  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Dynamic Themed Background */}
      <div className={`fixed inset-0 pointer-events-none select-none opacity-40 z-0 bg-gradient-to-b ${cartridge.theme.bgGradient}`} />
      <div
        className="fixed inset-0 pointer-events-none select-none opacity-15 z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#0B1026]/90 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/planets"
              onClick={playClick}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono text-starlight hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>←</span>
              <span>All Sectors</span>
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/60 border border-white/20 text-cyan-300">
                {cartridge.sector}
              </span>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide">
                {cartridge.name.toUpperCase()} BRIEFING ROOM
              </h1>
            </div>
          </div>

          {/* VIP Status or Best Score */}
          <div className="flex items-center gap-2">
            {isFiveStar && (
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <span>👑</span>
                <span>VIP All-Access</span>
              </span>
            )}
            <div className="px-3 py-1 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-starlight">
              Best Score: <strong className="text-amber-300">{bestScores[cartridge.id] ? `${bestScores[cartridge.id].toLocaleString()} PTS` : 'Unplayed'}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Hero Dossier Card */}
        <section className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${cartridge.theme.cardBg} ${cartridge.theme.borderColor} ${cartridge.theme.borderGlow}`}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Left: Large Planet Artwork */}
            <div className="md:col-span-5 flex items-center justify-center">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-black/60 border border-white/10 flex items-center justify-center p-4 shadow-2xl overflow-hidden group">
                {!imageError ? (
                  <img
                    src={cartridge.image}
                    alt={cartridge.name}
                    onError={() => setImageError(true)}
                    className="max-h-full max-w-full object-contain filter drop-shadow-[0_0_35px_rgba(255,255,255,0.25)] group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="text-8xl select-none filter drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                    {cartridge.id === 'earth' ? '🌍' : cartridge.id === 'mars' ? '♂' : cartridge.id === 'venus' ? '♀' : cartridge.id === 'mercury' ? '☿' : cartridge.id === 'jupiter' ? '♃' : cartridge.id === 'saturn' ? '🪐' : cartridge.id === 'uranus' ? '♅' : cartridge.id === 'neptune' ? '♆' : '👁️'}
                  </div>
                )}
                {/* Weather Pill */}
                <div className="absolute bottom-3 left-3 right-3 py-1 px-2.5 rounded-xl bg-black/80 border border-white/15 text-center font-mono text-[10px] text-cyan-200">
                  Atmospheric Scan: <strong className="text-white uppercase">{cartridge.theme.weatherEffect}</strong>
                </div>
              </div>
            </div>

            {/* Right: Dossier Intel & Mechanics */}
            <div className="md:col-span-7 space-y-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-mono text-xs font-bold uppercase">
                  <span>🪐</span>
                  <span>{cartridge.tagline}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-heading font-black text-white">
                  {cartridge.name}
                </h2>
                <p className="text-sm font-mono text-cyan-300/80">
                  {cartridge.subtitle}
                </p>
                <p className="text-sm text-starlight/85 leading-relaxed pt-1">
                  {cartridge.description}
                </p>
              </div>

              {/* Dual Custom Telemetry Gauges Preview */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-starlight/60 uppercase tracking-widest block">
                  Sector Telemetry Gauges (HUD Slots 3 &amp; 4):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cartridge.customMetrics.map((metric, idx) => (
                    <div key={metric.key} className="p-3 rounded-2xl bg-black/50 border border-white/10 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="flex items-center gap-1.5 text-white">
                          <span>{metric.icon}</span>
                          <span>{metric.name}</span>
                        </span>
                        <span className={metric.color}>
                          Baseline: {metric.defaultValue}{metric.unit}
                        </span>
                      </div>
                      <p className="text-[10px] text-starlight/70 leading-snug">
                        {metric.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature Planetary Hazard Warning */}
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>SIGNATURE HAZARD: {cartridge.signatureMechanic.name.toUpperCase()}</span>
                </div>
                <p className="text-[11px] text-amber-300/90 leading-snug">
                  {cartridge.signatureMechanic.hazardAlert}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Configuration Bay: Landing Site & Game Mode */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: 3 Landing Locations */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                <span>📍</span>
                <span>Select Landing Site</span>
              </h3>
              <span className="text-xs font-mono text-starlight/60">
                {cartridge.locations.length} Sites Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {cartridge.locations.map((loc) => {
                const isSelected = selectedSite === loc.id;
                const perks: string[] = [];
                if (loc.bonusStats.power) perks.push(`+${loc.bonusStats.power}%⚡`);
                if (loc.bonusStats.oxygen) perks.push(`+${loc.bonusStats.oxygen}%🫁`);
                if (loc.bonusStats.shielding) perks.push(`+${loc.bonusStats.shielding}%🛡️`);

                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedSite(loc.id);
                    }}
                    className={`
                      p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[140px]
                      ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-400 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] ring-2 ring-cyan-400/40'
                          : 'bg-black/40 hover:bg-[#1a234f] border-white/10 text-slate-300'
                      }
                    `}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{loc.icon}</span>
                        {isSelected && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-400 text-slate-950">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h4 className="font-heading font-black text-sm text-white">
                        {loc.name}
                      </h4>
                      <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                        {loc.tagline}
                      </p>
                      <p className="text-[11px] text-starlight/70 line-clamp-2 mt-1">
                        {loc.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-emerald-300 font-bold">
                      {perks.join(' • ') || 'Standard Baseline'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Game Mode & Initiate Launch */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                <span>⏱️</span>
                <span>Expedition Mode</span>
              </h3>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setGameMode('standard');
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer font-mono text-xs flex items-center justify-between ${
                    gameMode === 'standard'
                      ? 'bg-[#22C55E]/20 border-[#22C55E] text-white ring-2 ring-[#22C55E]/30'
                      : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>🛡️</span> Standard Mode (30 Sols)
                    </div>
                    <div className="text-[10px] opacity-70">
                      Untimed strategic survival • Official campaign score progression
                    </div>
                  </div>
                  {gameMode === 'standard' && <span className="text-[#22C55E] text-lg">✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setGameMode('timed');
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer font-mono text-xs flex items-center justify-between ${
                    gameMode === 'timed'
                      ? 'bg-rose-500/25 border-rose-500 text-white ring-2 ring-rose-500/30'
                      : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>⏱️</span> Timed Crisis (15s Clock)
                    </div>
                    <div className="text-[10px] opacity-70">
                      Instant failure on 0s • Rapid response speed bonus points
                    </div>
                  </div>
                  {gameMode === 'timed' && <span className="text-rose-400 text-lg">✓</span>}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setGameMode('endless');
                  }}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer font-mono text-xs flex items-center justify-between ${
                    gameMode === 'endless'
                      ? 'bg-purple-500/25 border-purple-500 text-white ring-2 ring-purple-500/30'
                      : 'bg-black/40 border-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>♾️</span> Endless Survival
                    </div>
                    <div className="text-[10px] opacity-70">
                      Survive past Sol 30 • Compounding decay decay curves
                    </div>
                  </div>
                  {gameMode === 'endless' && <span className="text-purple-400 text-lg">✓</span>}
                </button>
              </div>
            </div>

            {/* Launch Primary CTA */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <button
                type="button"
                onClick={handleLaunch}
                className="
                  w-full py-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 border border-cyan-200
                  text-slate-950 font-heading font-black text-base sm:text-lg tracking-wider
                  hover:scale-[1.02] active:scale-95 transition-all shadow-xl cursor-pointer
                  flex items-center justify-center gap-2
                "
              >
                <span>INITIATE DEPLOYMENT</span>
                <span>🚀</span>
              </button>

              <div className="text-center">
                <Link
                  href="/planets"
                  onClick={playClick}
                  className="text-xs font-mono text-starlight/60 hover:text-white underline underline-offset-4"
                >
                  Abort &amp; Return to Solar System Map
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function PlanetBriefingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#070913] flex items-center justify-center font-mono text-[#E87040] text-sm animate-pulse tracking-widest">
          SYS_RECON // DECRYPTING PLANETARY TELEMETRY ARCHIVES...
        </div>
      }
    >
      <PlanetBriefingContent />
    </React.Suspense>
  );
}
