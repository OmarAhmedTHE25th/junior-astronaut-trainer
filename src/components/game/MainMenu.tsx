'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RoverGalleryModal from './RoverGalleryModal';
import FieldManualModal from './FieldManualModal';
import ProfileModal from './ProfileModal';
import LeaderboardModal from './LeaderboardModal';
import LiveTelemetryTicker from './LiveTelemetryTicker';
import SquadRaceModal from './SquadRaceModal';
import SquadMatchmakingModal from './SquadMatchmakingModal';
import TournamentModal from './TournamentModal';
import MarsMarketplace from './MarsMarketplace';
import BattleRoyaleModal from './BattleRoyaleModal';
import GameModesModal from './GameModesModal';
import PetHangarModal from './PetHangarModal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';
import type { GameState } from '@/lib/types';

interface RankMetaState {
  badge: string;
  title: string;
  color: string;
}

interface EquippedPetState {
  name: string;
  avatar: string;
  level: number;
}

export default function MainMenu() {
  const { isMuted, toggleSound, playClick } = useSound();
  const { profile, isLoaded } = useProfile();

  // Modals state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSquadOpen, setIsSquadOpen] = useState(false);
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState(false);
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isBROpen, setIsBROpen] = useState(false);
  const [isGameModesOpen, setIsGameModesOpen] = useState(false);
  const [isHangarOpen, setIsHangarOpen] = useState(false);

  // Private squad code passed from GameModesModal
  const [privateRoomCode, setPrivateRoomCode] = useState<string>('');

  // Solo Crisis pace toggle
  const [isCrisisTimed, setIsCrisisTimed] = useState(false);
  const [activeSave, setActiveSave] = useState<GameState | null>(null);

  // Commander dynamic stats: Mars Credits, Rank, Pet
  const [walletCredits, setWalletCredits] = useState<number>(500);
  const [rankMeta, setRankMeta] = useState<RankMetaState>({
    badge: '🎖️',
    title: 'Cadet',
    color: 'text-gray-400',
  });
  const [equippedPet, setEquippedPet] = useState<EquippedPetState | null>(null);

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  // Check for active mission save in localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jat_active_save_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        if (
          parsed &&
          parsed.sol &&
          parsed.phase !== 'victory' &&
          parsed.phase !== 'gameover' &&
          parsed.power > 0 &&
          parsed.oxygen > 0 &&
          parsed.shielding > 0
        ) {
          setActiveSave(parsed);
        } else {
          // Mission ended or flatlined: purge save immediately
          localStorage.removeItem('jat_active_save_v1');
          setActiveSave(null);
        }
      } else {
        setActiveSave(null);
      }
    } catch {
      setActiveSave(null);
    }
  }, []);

  // Fetch Commander Profile (Rank & Pet) & Wallet Credits
  useEffect(() => {
    let isMounted = true;
    async function fetchCommanderData() {
      if (!activeCadet?.cadetId) return;

      try {
        // 1. Fetch wallet
        const wRes = await fetch(`/api/market/wallet?playerId=${encodeURIComponent(activeCadet.cadetId)}`);
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.success && wData.wallet && isMounted) {
            setWalletCredits(wData.wallet.creditsBalance ?? 500);
          }
        }

        // 2. Fetch commander profile (Rank tier & equipped pet)
        const callsign = activeCadet.callsign || 'CDR-NOVA';
        const pRes = await fetch(`/api/profile/${encodeURIComponent(callsign)}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.success && pData.profile && isMounted) {
            if (pData.profile.rankMeta) {
              setRankMeta(pData.profile.rankMeta);
            }
            const savedPetId = typeof window !== 'undefined' ? localStorage.getItem('jat_equipped_pet_v1') : null;
            if (savedPetId && pData.profile.pets && pData.profile.pets.length > 0) {
              const matched = pData.profile.pets.find((p: { id: string; nickname?: string; name?: string; avatar?: string; level?: number }) => p.id === savedPetId);
              if (matched) {
                setEquippedPet({
                  name: matched.nickname || matched.name || 'Companion',
                  avatar: matched.avatar || '🐾',
                  level: matched.level || 1,
                });
              } else if (pData.profile.equippedPet) {
                setEquippedPet(pData.profile.equippedPet);
              }
            } else if (pData.profile.equippedPet) {
              setEquippedPet(pData.profile.equippedPet);
            }
          }
        }
      } catch (err) {
        console.warn('Non-blocking Commander Status sync notice:', err);
      }
    }

    fetchCommanderData();
    return () => {
      isMounted = false;
    };
  }, [activeCadet?.cadetId, activeCadet?.callsign]);

  // Find specialty icon/title
  const specialtyMeta = SPECIALTY_METAS.find((s) => s.id === (activeCadet.specialty || 'commander'));

  return (
    <>
      {/* Live NASA Space Weather Telemetry Ticker */}
      <LiveTelemetryTicker />

      {/* Top Commander Status Bar (Compact, Rich, Responsive) */}
      <header className="w-full max-w-6xl mx-auto px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5">
          <span className="text-2xl animate-spin-slow select-none" aria-hidden="true">🪐</span>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-sm sm:text-base tracking-wider text-starlight uppercase leading-none">
              NASA Space Apps 2026
            </span>
            <span className="text-[10px] font-mono text-cyan-400/90 tracking-widest uppercase mt-0.5">
              Mission Operations Hub
            </span>
          </div>
        </div>

        {/* Compact Commander Status Cluster */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Commander Rank & Callsign Pill */}
          <button
            onClick={() => {
              playClick();
              setIsProfileOpen(true);
            }}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-[#141b3d]/90 border border-white/10 hover:border-[#E87040]
              transition-all hover:scale-105 active:scale-95 cursor-pointer
              shadow-md min-h-[40px]
            "
            title="Open Cadet Dossier & Flight Credentials"
            aria-label="Open Cadet Dossier"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0B1026] flex items-center justify-center text-base border border-white/10">
              {activeCadet.avatar || '👨‍🚀'}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-mono font-bold text-xs text-white">
                  {activeCadet.callsign || 'CADET'}
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {rankMeta.badge} {rankMeta.title}
                </span>
              </div>
              <span className="text-[10px] text-white/50 block font-mono mt-0.5">
                {specialtyMeta?.badge || 'Commander'} • {activeCadet.highestScore} pts
              </span>
            </div>
          </button>

          {/* Equipped Companion Pet Pill */}
          <button
            onClick={() => {
              playClick();
              setIsHangarOpen(true);
            }}
            className="
              hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
              bg-[#141b3d]/90 border border-cyan-500/30 hover:border-cyan-400
              transition-all hover:scale-105 active:scale-95 cursor-pointer
              shadow-md min-h-[40px] text-xs font-mono
            "
            title="Companion Pet Hangar (Tactical Scavenge & Warning Perks)"
          >
            <span className="text-base select-none">{equippedPet ? equippedPet.avatar : '🐾'}</span>
            <div className="text-left leading-none">
              <span className="text-cyan-200 font-semibold block truncate max-w-[100px]">
                {equippedPet ? equippedPet.name : 'No Pet'}
              </span>
              <span className="text-[9px] text-cyan-400/80 font-mono">
                {equippedPet ? `Lv.${equippedPet.level} Active` : 'Equip in Hangar'}
              </span>
            </div>
          </button>

          {/* Mars Credits / Exchange Button */}
          <button
            onClick={() => {
              playClick();
              setIsMarketplaceOpen(true);
            }}
            className="
              flex items-center gap-2 px-3 py-1.5 rounded-xl
              bg-gradient-to-r from-emerald-950/80 to-[#141b3d] border border-emerald-500/40 hover:border-emerald-400
              transition-all hover:scale-105 active:scale-95 cursor-pointer
              shadow-md min-h-[40px] text-xs font-mono
            "
            title="Mars Exchange & Commodity Market"
          >
            <span className="text-emerald-400 font-extrabold">💰 {walletCredits.toLocaleString()} MC</span>
            <span className="text-[10px] uppercase font-bold text-emerald-300/80 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
              Exchange →
            </span>
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="
              flex items-center justify-center p-2 rounded-xl
              bg-[#141b3d]/90 border border-white/10 hover:border-[#6B3FA0]
              text-base text-white transition-all hover:scale-105 active:scale-95
              cursor-pointer min-h-[40px] min-w-[40px] shadow-md
            "
            title={isMuted ? 'Turn Sound ON' : 'Turn Sound OFF'}
            aria-label={isMuted ? 'Sound is currently muted' : 'Sound is active'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Main Interactive Menu Hub */}
      <main className="w-full max-w-5xl mx-auto px-4 pt-3 pb-8 space-y-6">
        {/* Active Mission Resume Banner (Prominent if active save exists) */}
        {activeSave && (
          <div className="rounded-3xl border-2 border-[#E87040] bg-gradient-to-r from-[#E87040]/25 via-[#6B3FA0]/20 to-[#0B1026] p-6 shadow-2xl shadow-[#E87040]/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E87040] animate-ping" />
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E87040]">
                  Active Telemetry Feed Available
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                Mars Outpost Sol {activeSave.sol} of 30 ({activeSave.difficulty.toUpperCase()})
              </h3>
              <p className="text-xs text-[#F8FAFC]/80">
                ⚡ Power: <strong className="text-white">{activeSave.power}%</strong> • 🫁 O₂:{' '}
                <strong className="text-white">{activeSave.oxygen}%</strong> • 🛡️ Shield:{' '}
                <strong className="text-white">{activeSave.shielding}%</strong> • Score:{' '}
                <strong className="text-[#22C55E]">{activeSave.score} pts</strong>
              </p>
            </div>

            <Link
              href="/game?resume=true"
              onClick={playClick}
              className="
                px-8 py-4 rounded-2xl bg-gradient-to-r from-[#E87040] to-[#6B3FA0]
                text-white font-heading font-extrabold text-lg
                hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#E87040]/30
                cursor-pointer flex-shrink-0 flex items-center gap-2 min-h-[48px]
              "
            >
              <span>⏯️ Resume Mission</span>
              <span className="text-xl">→</span>
            </Link>
          </div>
        )}

        {/* ── 1. PRIMARY HERO LAUNCH PANEL (Standard Solo Mission) ── */}
        <section className="bg-gradient-to-b from-[#1a214d]/90 to-[#0e1430]/90 backdrop-blur-xl rounded-3xl border-2 border-[#E87040]/40 p-6 sm:p-8 md:p-10 shadow-2xl shadow-[#E87040]/10 relative overflow-hidden">
          {/* Ambient blur orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#E87040]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
            {/* Category Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E87040]/15 border border-[#E87040]/40 text-[#E87040] text-xs font-mono uppercase tracking-widest font-bold">
              <span>🚀</span>
              <span>Primary Expedition Directive</span>
            </div>

            {/* Main Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-white tracking-wide">
                Standard Solo Mission (30 Sols)
              </h2>
              <p className="text-sm sm:text-base text-starlight/80 max-w-2xl mx-auto leading-relaxed">
                Command your Mars habitat outpost against live NASA DONKI solar storm telemetry.
                Balance Power, Oxygen, and Radiation Shielding across 30 grueling Martian Sols.
              </p>
            </div>

            {/* Solo Pace Toggle */}
            <div className="flex flex-col items-center gap-2 pt-1">
              <div className="inline-flex p-1.5 rounded-2xl bg-[#090d20] border border-white/15 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsCrisisTimed(false);
                  }}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all cursor-pointer flex items-center gap-2 ${
                    !isCrisisTimed
                      ? 'bg-[#22C55E] text-slate-950 shadow-md shadow-[#22C55E]/30 font-extrabold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>🛡️</span>
                  <span>Standard (Untimed)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsCrisisTimed(true);
                  }}
                  className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all cursor-pointer flex items-center gap-2 ${
                    isCrisisTimed
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 font-extrabold animate-pulse'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>⏱️</span>
                  <span>Timed Crisis (15s)</span>
                </button>
              </div>
              <p className="text-[11px] sm:text-xs font-mono text-starlight/60">
                {isCrisisTimed
                  ? '⚡ Crisis Pace: 15-second per-Sol countdown with instant loss on timeout & rapid response score bonus.'
                  : '💡 Standard Pace: Strategic, untimed decision-making per Sol.'}
              </p>
            </div>

            {/* Main Dual CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              {/* Launch Solo Mission CTA */}
              <Link
                href={isCrisisTimed ? '/game?timed=true' : '/game'}
                onClick={playClick}
                className="
                  w-full sm:w-auto px-8 py-4 rounded-2xl
                  bg-gradient-to-r from-[#E87040] via-[#ea580c] to-[#E87040]
                  text-white font-heading font-extrabold text-base sm:text-lg tracking-wider
                  hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#E87040]/30
                  flex items-center justify-center gap-3 cursor-pointer min-h-[56px] border border-orange-400/30
                "
              >
                <span>🚀</span>
                <span>LAUNCH SOLO MISSION</span>
                <span className="text-xl">→</span>
              </Link>

              {/* Other Game Modes Hub CTA */}
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setIsGameModesOpen(true);
                }}
                className="
                  w-full sm:w-auto px-6 py-4 rounded-2xl
                  bg-[#141b3d] hover:bg-[#1f285a] border-2 border-cyan-500/40 hover:border-cyan-400
                  text-cyan-200 font-heading font-extrabold text-base tracking-wider
                  hover:scale-[1.03] active:scale-95 transition-all shadow-lg shadow-cyan-500/10
                  flex items-center justify-center gap-2.5 cursor-pointer min-h-[56px]
                "
              >
                <span>🌌</span>
                <span>GAME MODES HUB</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 uppercase">
                  Squad • BR • Tournaments
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 2. SECONDARY UTILITY ROW (Clean 3-Card Grid: Leaderboard, Rover Gallery, Field Manual) ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Global Leaderboard */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setIsLeaderboardOpen(true);
            }}
            className="
              group p-6 rounded-2xl bg-[#141b3d]/70 hover:bg-[#1a234f]/90
              border border-amber-500/30 hover:border-amber-400/80
              transition-all duration-200 hover:scale-[1.02] active:scale-98
              shadow-lg shadow-amber-500/5 text-left flex flex-col justify-between min-h-[160px] cursor-pointer
            "
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 group-hover:scale-110 transition-transform">
                🏆
              </span>
              <span className="text-xs font-mono text-amber-400/90 font-bold uppercase tracking-wider">
                Rankings →
              </span>
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-white group-hover:text-amber-300 transition-colors">
                Global Leaderboard
              </h3>
              <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                Inspect top cadet survival scores, longest mission durations, and anti-cheat verified ranks.
              </p>
            </div>
          </button>

          {/* Card 2: NASA Rover & Science Gallery */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setIsGalleryOpen(true);
            }}
            className="
              group p-6 rounded-2xl bg-[#141b3d]/70 hover:bg-[#1a234f]/90
              border border-blue-500/30 hover:border-blue-400/80
              transition-all duration-200 hover:scale-[1.02] active:scale-98
              shadow-lg shadow-blue-500/5 text-left flex flex-col justify-between min-h-[160px] cursor-pointer
            "
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 group-hover:scale-110 transition-transform">
                🔭
              </span>
              <span className="text-xs font-mono text-blue-400/90 font-bold uppercase tracking-wider">
                17 Photos →
              </span>
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-white group-hover:text-blue-300 transition-colors">
                Rover & Science Gallery
              </h3>
              <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                Inspect real NASA Mars rover telemetry, Curiosity/Perseverance imagery, and RadLab sensors.
              </p>
            </div>
          </button>

          {/* Card 3: Astronaut Field Manual */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setIsManualOpen(true);
            }}
            className="
              group p-6 rounded-2xl bg-[#141b3d]/70 hover:bg-[#1a234f]/90
              border border-emerald-500/30 hover:border-emerald-400/80
              transition-all duration-200 hover:scale-[1.02] active:scale-98
              shadow-lg shadow-emerald-500/5 text-left flex flex-col justify-between min-h-[160px] cursor-pointer
            "
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                📖
              </span>
              <span className="text-xs font-mono text-emerald-400/90 font-bold uppercase tracking-wider">
                Manual →
              </span>
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg text-white group-hover:text-emerald-300 transition-colors">
                Astronaut Field Manual
              </h3>
              <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                Visual survival guides, life-support trade-offs, solar flare protocols, and rover repair specs.
              </p>
            </div>
          </button>
        </section>
      </main>

      {/* ── MODALS ── */}

      {/* Game Modes Hub Modal (2x2 Grid: Squad, BR, Tournaments, Pet Hangar) */}
      <GameModesModal
        isOpen={isGameModesOpen}
        onClose={() => setIsGameModesOpen(false)}
        onOpenMatchmaking={() => {
          setIsGameModesOpen(false);
          setIsMatchmakingOpen(true);
        }}
        onOpenBattleRoyale={() => {
          setIsGameModesOpen(false);
          setIsBROpen(true);
        }}
        onOpenTournaments={() => {
          setIsGameModesOpen(false);
          setIsTournamentOpen(true);
        }}
        onOpenHangar={() => {
          setIsGameModesOpen(false);
          setIsHangarOpen(true);
        }}
        onJoinPrivateSquad={(code) => {
          setIsGameModesOpen(false);
          setPrivateRoomCode(code);
          setIsSquadOpen(true);
        }}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <RoverGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      <FieldManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />

      <SquadRaceModal
        isOpen={isSquadOpen}
        onClose={() => {
          setIsSquadOpen(false);
          setPrivateRoomCode('');
        }}
        initialJoinCode={privateRoomCode}
      />

      <SquadMatchmakingModal
        isOpen={isMatchmakingOpen}
        onClose={() => setIsMatchmakingOpen(false)}
      />

      <TournamentModal
        isOpen={isTournamentOpen}
        onClose={() => setIsTournamentOpen(false)}
      />

      <MarsMarketplace
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
      />

      <BattleRoyaleModal
        isOpen={isBROpen}
        onClose={() => setIsBROpen(false)}
      />

      <PetHangarModal
        isOpen={isHangarOpen}
        onClose={() => setIsHangarOpen(false)}
        onPetEquipped={(pet) => {
          setEquippedPet(pet);
        }}
        onOpenBattleRoyale={() => {
          setIsHangarOpen(false);
          setIsBROpen(true);
        }}
      />
    </>
  );
}
