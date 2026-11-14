'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RoverGalleryModal from './RoverGalleryModal';
import FieldManualModal from './FieldManualModal';
import ProfileModal from './ProfileModal';
import LeaderboardModal from './LeaderboardModal';
import LiveTelemetryTicker from './LiveTelemetryTicker';
import SquadRaceModal from './SquadRaceModal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import { SPECIALTY_METAS } from '@/lib/types';
import type { GameState } from '@/lib/types';

export default function MainMenu() {
  const { isMuted, toggleSound, playClick } = useSound();
  const { profile, isLoaded } = useProfile();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSquadOpen, setIsSquadOpen] = useState(false);
  const [activeSave, setActiveSave] = useState<GameState | null>(null);

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
        if (parsed && parsed.sol && parsed.phase !== 'victory' && parsed.phase !== 'gameover') {
          setActiveSave(parsed);
        }
      }
    } catch {}
  }, []);

  return (
    <>
      {/* Live NASA Space Weather Telemetry Ticker */}
      <LiveTelemetryTicker />

      {/* Top Command Bar with Cadet Profile and Sound Controls */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-4 pb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">🪐</span>
          <span className="font-heading font-extrabold text-sm sm:text-base tracking-wider text-starlight uppercase">
            NASA Space Apps 2026
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Cadet Profile Pill */}
          <button
            onClick={() => {
              playClick();
              setIsProfileOpen(true);
            }}
            className="
              flex items-center gap-2.5 px-3 py-1.5 rounded-xl
              bg-[#1a1f3d] border border-white/10 hover:border-[#E87040]
              transition-all hover:scale-105 active:scale-95 cursor-pointer
              shadow-md min-h-[44px]
            "
            title="Open Cadet Dossier & Flight Credentials"
            aria-label="Open Cadet Dossier"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0B1026] flex items-center justify-center text-lg">
              {activeCadet.avatar}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-white block leading-tight">
                  {activeCadet.callsign}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {SPECIALTY_METAS.find((s) => s.id === (activeCadet.specialty || 'commander'))?.icon || '🎖️'} {SPECIALTY_METAS.find((s) => s.id === (activeCadet.specialty || 'commander'))?.badge || 'Commander'}
                </span>
              </div>
              <span className="text-[10px] text-[#E87040] font-semibold block leading-tight mt-0.5">
                ⭐ {activeCadet.highestScore} pts • 🎖️ {activeCadet.badges.length} badges
              </span>
            </div>
          </button>

          {/* Sound Toggle Button */}
          <button
            onClick={toggleSound}
            className="
              flex items-center justify-center p-2.5 rounded-xl
              bg-[#1a1f3d] border border-white/10 hover:border-[#6B3FA0]
              text-lg text-white transition-all hover:scale-105 active:scale-95
              cursor-pointer min-h-[44px] min-w-[44px] shadow-md
            "
            title={isMuted ? 'Turn Sound ON' : 'Turn Sound OFF'}
            aria-label={isMuted ? 'Sound is currently muted' : 'Sound is active'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Main Interactive Menu Hub */}
      <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-4">
        {/* Active Mission Resume Banner (Prominent if active save exists) */}
        {activeSave && (
          <div className="rounded-3xl border-2 border-[#E87040] bg-gradient-to-r from-[#E87040]/25 via-[#6B3FA0]/20 to-[#0B1026] p-6 shadow-2xl shadow-[#E87040]/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="w-3 h-3 rounded-full bg-[#E87040] animate-ping" />
                <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E87040]">
                  Active Telemetry Feed Available
                </span>
              </div>
              <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-white">
                Mars Outpost Sol {activeSave.sol} of 30 ({activeSave.difficulty.toUpperCase()})
              </h3>
              <p className="text-xs text-[#F8FAFC]/80">
                ⚡ Power: <strong className="text-white">{activeSave.power}%</strong> • 🫁 O₂: <strong className="text-white">{activeSave.oxygen}%</strong> • 🛡️ Shield: <strong className="text-white">{activeSave.shielding}%</strong> • Score: <strong className="text-[#22C55E]">{activeSave.score} pts</strong>
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

        {/* Command Station Cards Grid */}
        <div className="bg-[#1a1f3d]/70 backdrop-blur-md rounded-3xl border border-[#6B3FA0]/30 p-6 md:p-8 shadow-2xl shadow-[#6B3FA0]/15">
          <div className="text-center mb-6">
            <span className="text-xs font-mono font-bold tracking-widest text-[#E87040] uppercase">
              Mission Operations Command Center
            </span>
            <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mt-1">
              Select Command Station
            </h2>
          </div>

          {/* Additive Mode Selector: Solo Mission vs Squad Race */}
          <div className="mb-6 p-1.5 rounded-2xl bg-[#0B1026]/90 border border-white/10 flex flex-col sm:flex-row gap-2">
            <Link
              href="/game"
              onClick={playClick}
              className="
                flex-1 py-3 px-4 rounded-xl text-center font-heading font-extrabold text-sm tracking-wider
                bg-gradient-to-r from-[#E87040] to-[#E87040]/70 text-white shadow-lg shadow-[#E87040]/25
                hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer
              "
            >
              <span>🚀</span>
              <span>SOLO MISSION</span>
              <span className="text-xs font-mono font-normal opacity-75">(Standard 30 Sols)</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                playClick();
                setIsSquadOpen(true);
              }}
              className="
                flex-1 py-3 px-4 rounded-xl text-center font-heading font-extrabold text-sm tracking-wider
                bg-gradient-to-r from-cyan-600 to-[#6B3FA0] text-white shadow-lg shadow-cyan-500/20
                hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer
                border border-cyan-400/40 relative overflow-hidden group
              "
            >
              <span className="animate-bounce">🏁</span>
              <span>SQUAD RACE</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 uppercase font-bold">
                4-Cadet Co-op
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Start Solo Mission */}
            <Link
              href="/game"
              onClick={playClick}
              className="
                group relative flex flex-col items-center justify-between p-4.5 rounded-2xl
                bg-gradient-to-b from-[#E87040]/20 to-[#E87040]/5 border-2 border-[#E87040]
                hover:from-[#E87040]/30 hover:to-[#E87040]/10 hover:scale-[1.03]
                transition-all duration-200 shadow-lg shadow-[#E87040]/20 text-center
                cursor-pointer min-h-[170px]
              "
            >
              <div className="w-11 h-11 rounded-xl bg-[#E87040]/20 flex items-center justify-center text-2xl mb-1 group-hover:scale-110 transition-transform">
                🚀
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm sm:text-base text-white group-hover:text-[#E87040] transition-colors">
                  {activeSave ? 'Resume / Solo' : 'Solo Mission'}
                </h3>
                <p className="text-[11px] text-[#F8FAFC]/70 mt-1 leading-snug">
                  Choose difficulty &amp; launch standard 30-sol expedition.
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-[#E87040] flex items-center gap-1">
                Launch Solo →
              </span>
            </Link>

            {/* 2. Squad Race */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsSquadOpen(true);
              }}
              className="
                group relative flex flex-col items-center justify-between p-4.5 rounded-2xl
                bg-gradient-to-b from-cyan-500/20 to-purple-500/5 border-2 border-cyan-500/60
                hover:border-cyan-400 hover:from-cyan-500/30 hover:to-purple-500/15 hover:scale-[1.03]
                transition-all duration-200 shadow-lg shadow-cyan-500/20 text-center
                cursor-pointer min-h-[170px]
              "
            >
              <div className="w-11 h-11 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl mb-1 group-hover:scale-110 transition-transform">
                🏁
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm sm:text-base text-white group-hover:text-cyan-300 transition-colors">
                  Squad Race
                </h3>
                <p className="text-[11px] text-[#F8FAFC]/70 mt-1 leading-snug">
                  Compete with up to 4 cadets on shared terrain &amp; solar seeds.
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-cyan-300 flex items-center gap-1">
                Lobby &amp; Codes 🛰️
              </span>
            </button>

            {/* 3. Global Leaderboard */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsLeaderboardOpen(true);
              }}
              className="
                group relative flex flex-col items-center justify-between p-5 rounded-2xl
                bg-gradient-to-b from-[#F59E0B]/20 to-[#F59E0B]/5 border-2 border-[#F59E0B]/50
                hover:border-[#F59E0B] hover:from-[#F59E0B]/30 hover:to-[#F59E0B]/10 hover:scale-[1.03]
                transition-all duration-200 shadow-lg shadow-[#F59E0B]/15 text-center
                cursor-pointer min-h-[170px]
              "
            >
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B]/20 flex items-center justify-center text-3xl mb-1 group-hover:scale-110 transition-transform">
                🏆
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-white group-hover:text-[#F59E0B] transition-colors">
                  Leaderboard
                </h3>
                <p className="text-xs text-[#F8FAFC]/70 mt-1 leading-snug">
                  View top cadet rankings &amp; anti-cheat validated scores.
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-[#F59E0B] flex items-center gap-1">
                Rankings 🎖️
              </span>
            </button>

            {/* 3. NASA Rover & Science Gallery */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsGalleryOpen(true);
              }}
              className="
                group relative flex flex-col items-center justify-between p-5 rounded-2xl
                bg-gradient-to-b from-[#3B82F6]/20 to-[#3B82F6]/5 border-2 border-[#3B82F6]/50
                hover:border-[#3B82F6] hover:from-[#3B82F6]/30 hover:to-[#3B82F6]/10 hover:scale-[1.03]
                transition-all duration-200 shadow-lg shadow-[#3B82F6]/15 text-center
                cursor-pointer min-h-[170px]
              "
            >
              <div className="w-12 h-12 rounded-xl bg-[#3B82F6]/20 flex items-center justify-center text-3xl mb-1 group-hover:scale-110 transition-transform">
                🔭
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-white group-hover:text-[#3B82F6] transition-colors">
                  Rover Gallery
                </h3>
                <p className="text-xs text-[#F8FAFC]/70 mt-1 leading-snug">
                  Inspect 17 real Mars rover photos &amp; DONKI / RadLab data.
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-[#3B82F6] flex items-center gap-1">
                Open Gallery 🔍
              </span>
            </button>

            {/* 4. Field Manual / How to Play */}
            <button
              type="button"
              onClick={() => {
                playClick();
                setIsManualOpen(true);
              }}
              className="
                group relative flex flex-col items-center justify-between p-5 rounded-2xl
                bg-gradient-to-b from-[#22C55E]/20 to-[#22C55E]/5 border-2 border-[#22C55E]/50
                hover:border-[#22C55E] hover:from-[#22C55E]/30 hover:to-[#22C55E]/10 hover:scale-[1.03]
                transition-all duration-200 shadow-lg shadow-[#22C55E]/15 text-center
                cursor-pointer min-h-[170px]
              "
            >
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/20 flex items-center justify-center text-3xl mb-1 group-hover:scale-110 transition-transform">
                📖
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-base text-white group-hover:text-[#22C55E] transition-colors">
                  Field Manual
                </h3>
                <p className="text-xs text-[#F8FAFC]/70 mt-1 leading-snug">
                  Visual rules, trade-off dynamics, and survival tactics.
                </p>
              </div>
              <span className="mt-2 text-xs font-bold text-[#22C55E] flex items-center gap-1">
                Read Handbook 📜
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        onClose={() => setIsSquadOpen(false)}
      />
    </>
  );
}
