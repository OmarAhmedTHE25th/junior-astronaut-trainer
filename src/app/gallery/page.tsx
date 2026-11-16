'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSound } from '@/lib/sound';
import { useWallet } from '@/context/WalletContext';
import { useBattlePass } from '@/lib/battlePass';
import {
  type PlanetId,
  ORDERED_PLANET_IDS,
  PLANET_CARTRIDGES,
  isEasterEggUnlocked,
  getPlanetBestScores,
} from '@/lib/planetCartridges';
import {
  type GalleryPhoto,
  PLANET_GALLERY_PHOTOS,
  getAllGalleryPhotos,
  getPhotosForPlanet,
} from '@/lib/galleryData';

export default function PlanetaryGalleryPage() {
  const { playClick } = useSound();
  const { creditsBalance, isFiveStarGeneral: walletVip } = useWallet();
  const { state: bpState } = useBattlePass();
  const isFiveStar = walletVip || Boolean(bpState.isFiveStarGeneral);

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetId | 'all'>('all');
  const [activeModalPhoto, setActiveModalPhoto] = useState<GalleryPhoto | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isEasterEgg, setIsEasterEgg] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setIsEasterEgg(isEasterEggUnlocked());
    }
  }, []);

  // Determine which planet tabs are visible
  const availablePlanets = useMemo(() => {
    const scores: Partial<Record<PlanetId, number>> = mounted ? getPlanetBestScores() : {};
    const hasNeptuneScore = (scores.neptune || 0) >= 4500;
    const canSeePlanetX = isFiveStar || isEasterEgg || hasNeptuneScore;

    return ORDERED_PLANET_IDS.filter((pid) => {
      if (pid === 'planet_x') return canSeePlanetX;
      return true;
    });
  }, [isFiveStar, isEasterEgg, mounted]);

  // Filtered photo set
  const filteredPhotos = useMemo(() => {
    if (selectedPlanet === 'all') {
      return getAllGalleryPhotos().filter((p) => {
        if (p.planetId === 'planet_x') {
          return isFiveStar || isEasterEgg;
        }
        return true;
      });
    }
    return getPhotosForPlanet(selectedPlanet);
  }, [selectedPlanet, isFiveStar, isEasterEgg]);

  return (
    <div className="min-h-screen bg-[#070b19] text-white flex flex-col font-sans relative overflow-x-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Starfield & Deep Blue Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none select-none opacity-40 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-[#070b19] to-black" />
      <div
        className="fixed inset-0 pointer-events-none select-none opacity-20 z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* Top Header & Navigation Bar */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#0B1026]/90 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              onClick={playClick}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-cyan-400 text-xs font-mono text-starlight hover:text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>←</span>
              <span>Command Center</span>
            </Link>
            <Link
              href="/planets"
              onClick={playClick}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 text-xs font-mono text-cyan-300 hover:text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>🪐</span>
              <span>Solar System Map</span>
            </Link>
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-wide flex items-center gap-2">
                <span>🔭</span>
                <span>PLANETARY RECONNAISSANCE GALLERY</span>
              </h1>
              <p className="text-xs text-starlight/70 font-mono">
                Authentic NASA Imagery, Surface Rover Photography &amp; Deep-Space Telemetry
              </p>
            </div>
          </div>

          {/* Credits Balance & VIP Badge */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            {mounted && (
              <Link
                href="/store"
                onClick={playClick}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5 shadow-sm"
                title="Colony Store & Gear"
              >
                <span>💰</span>
                <span>{creditsBalance} GC</span>
              </Link>
            )}
            {isFiveStar && (
              <div className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                <span>👑</span>
                <span>VIP Five-Star Access</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Reconnaissance Directive Banner */}
        <div className="p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono font-bold uppercase">
              <span>🛰️</span>
              <span>NASA Astrophotography Archive</span>
            </div>
            <div className="text-xs font-mono text-starlight/70">
              Showing: <strong className="text-white">{filteredPhotos.length} Reconnaissance Files</strong>
            </div>
          </div>
          <p className="text-sm text-starlight/80 leading-relaxed max-w-4xl">
            Explore authentic planetary exploration captures from NASA Goddard, JPL Curiosity &amp; Perseverance rovers,
            Cassini-Huygens, Juno, MESSENGER, and the James Webb Space Telescope. Click any card to inspect high-definition telemetry details.
          </p>
        </div>

        {/* 9-Planet Tab & Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-cyan-500/30">
          <button
            type="button"
            onClick={() => {
              playClick();
              setSelectedPlanet('all');
            }}
            className={`px-4 py-2 rounded-2xl border font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              selectedPlanet === 'all'
                ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-md shadow-cyan-400/20 font-black'
                : 'bg-[#111827]/80 border-white/10 text-starlight/80 hover:text-white hover:border-white/30'
            }`}
          >
            <span>🪐</span>
            <span>All Worlds ({getAllGalleryPhotos().length})</span>
          </button>

          {availablePlanets.map((pid) => {
            const cart = PLANET_CARTRIDGES[pid];
            const isSelected = selectedPlanet === pid;
            const count = getPhotosForPlanet(pid).length;

            return (
              <button
                key={pid}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedPlanet(pid);
                }}
                className={`px-4 py-2 rounded-2xl border font-mono text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 border-cyan-200 shadow-md shadow-cyan-400/20 font-black'
                    : 'bg-[#111827]/80 border-white/10 text-starlight/80 hover:text-white hover:border-white/30'
                }`}
              >
                <span>{cart.order === 'X' ? '👁️' : cart.order}</span>
                <span>{cart.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-slate-950' : 'bg-white/10 text-starlight/60'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => {
            const cart = PLANET_CARTRIDGES[photo.planetId];
            const hasError = imageErrors[photo.id];
            const displaySrc = hasError ? cart.image : photo.imgSrc;

            return (
              <div
                key={photo.id}
                onClick={() => {
                  playClick();
                  setActiveModalPhoto(photo);
                }}
                className="
                  group rounded-3xl bg-[#111827]/90 border border-slate-700/80 hover:border-cyan-400/80
                  shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 overflow-hidden
                  flex flex-col justify-between cursor-pointer hover:scale-[1.01]
                "
              >
                {/* Photo Image Card */}
                <div className="relative w-full aspect-video bg-black/80 overflow-hidden border-b border-white/10">
                  <Image
                    src={displaySrc}
                    alt={photo.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={() => {
                      setImageErrors((prev) => ({ ...prev, [photo.id]: true }));
                    }}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-60" />

                  {/* Planet & Mission Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-cyan-300 uppercase">
                      {cart.name}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-starlight/80 truncate max-w-[160px]">
                      {photo.mission}
                    </span>
                  </div>

                  {/* Date Badge */}
                  <div className="absolute bottom-2 right-3 text-[10px] font-mono text-starlight/60 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    {photo.date}
                  </div>
                </div>

                {/* Caption & Technical Intel */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-heading font-bold text-base text-white group-hover:text-cyan-300 transition-colors leading-snug">
                      {photo.title}
                    </h3>
                    <p className="text-xs text-starlight/75 line-clamp-3 leading-relaxed">
                      {photo.caption}
                    </p>
                  </div>

                  {/* Technical Footer */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-starlight/60">
                    <div className="truncate flex items-center gap-1.5">
                      <span className="text-cyan-400">📷</span>
                      <span className="truncate">{photo.instrument}</span>
                    </div>
                    <span className="text-cyan-400 font-bold group-hover:translate-x-1 transition-transform">
                      Inspect →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* High-Resolution Telemetry Inspection Modal */}
      {activeModalPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={() => setActiveModalPhoto(null)}
          />

          {/* Modal Container */}
          <div className="relative z-10 max-w-4xl w-full max-h-[90vh] bg-[#0e1428] border-2 border-cyan-400/60 rounded-3xl shadow-2xl overflow-y-auto p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-mono text-xs font-bold uppercase mb-1">
                  <span>🪐</span>
                  <span>{PLANET_CARTRIDGES[activeModalPhoto.planetId].name} Reconnaissance Dossier</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-white">
                  {activeModalPhoto.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalPhoto(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/20 text-white text-sm font-mono cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Large Image Preview */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/10">
              <Image
                src={imageErrors[activeModalPhoto.id] ? PLANET_CARTRIDGES[activeModalPhoto.planetId].image : (activeModalPhoto.hdSrc || activeModalPhoto.imgSrc)}
                alt={activeModalPhoto.title}
                fill
                sizes="(max-width: 1024px) 100vw, 896px"
                className="object-contain"
                onError={() => {
                  setImageErrors((prev) => ({ ...prev, [activeModalPhoto.id]: true }));
                }}
                unoptimized
              />
            </div>

            {/* Description & Scientific Caption */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold uppercase text-cyan-400 tracking-wider">
                Mission Caption &amp; Reconnaissance Analysis:
              </span>
              <p className="text-sm text-starlight/90 leading-relaxed font-sans">
                {activeModalPhoto.caption}
              </p>
            </div>

            {/* Scientific Telemetry Table */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#070b19] border border-white/10 font-mono text-xs">
              <div>
                <span className="text-starlight/50 block text-[10px]">MISSION / PROGRAM:</span>
                <span className="text-white font-bold">{activeModalPhoto.mission}</span>
              </div>
              <div>
                <span className="text-starlight/50 block text-[10px]">CAMERA / INSTRUMENT:</span>
                <span className="text-cyan-300 font-bold">{activeModalPhoto.instrument}</span>
              </div>
              <div>
                <span className="text-starlight/50 block text-[10px]">TRANSMISSION DATE:</span>
                <span className="text-amber-300 font-bold">{activeModalPhoto.date}</span>
              </div>
              {activeModalPhoto.technicalDetails?.coordinates && (
                <div>
                  <span className="text-starlight/50 block text-[10px]">COORDINATES:</span>
                  <span className="text-white">{activeModalPhoto.technicalDetails.coordinates}</span>
                </div>
              )}
              {activeModalPhoto.technicalDetails?.altitude && (
                <div>
                  <span className="text-starlight/50 block text-[10px]">ORBITAL ALTITUDE:</span>
                  <span className="text-white">{activeModalPhoto.technicalDetails.altitude}</span>
                </div>
              )}
              {activeModalPhoto.technicalDetails?.filterBand && (
                <div>
                  <span className="text-starlight/50 block text-[10px]">OPTICAL / SPECTRAL BAND:</span>
                  <span className="text-white">{activeModalPhoto.technicalDetails.filterBand}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
