'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';

interface GameModesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMatchmaking: () => void;
  onOpenBattleRoyale: () => void;
  onOpenTournaments: () => void;
  onOpenHangar: () => void;
  onJoinPrivateSquad: (code: string) => void;
}

export default function GameModesModal({
  isOpen,
  onClose,
  onOpenMatchmaking,
  onOpenBattleRoyale,
  onOpenTournaments,
  onOpenHangar,
  onJoinPrivateSquad,
}: GameModesModalProps) {
  const { playClick, playAction } = useSound();
  const [privateCodeInput, setPrivateCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const handlePrivateJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = privateCodeInput.trim().toUpperCase();
    if (clean.length < 4) {
      setCodeError('Enter a valid room code');
      return;
    }
    setCodeError(null);
    playAction();
    onClose();
    onJoinPrivateSquad(clean);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🚀 MISSION OPERATIONS: SELECT GAME MODE"
      maxWidth="max-w-4xl lg:max-w-5xl"
    >
      <div className="space-y-6 max-h-[82vh] overflow-y-auto pr-1">
        {/* Subtitle Banner */}
        <div className="p-4 rounded-2xl bg-[#090d20] border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-starlight/80">
              Select an advanced mission simulation format below. All modes run live on synchronized NASA DONKI space weather seeds.
            </span>
          </div>
        </div>

        {/* ── 2x2 RESPONSIVE MODES GRID ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 font-mono">
          {/* 1. SQUAD MULTIPLAYER */}
          <div className="rounded-3xl bg-gradient-to-b from-[#141d40] to-[#0d122b] border-2 border-cyan-500/50 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4 hover:border-cyan-400 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-400/30">
                  ⚡
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/40 uppercase tracking-wider">
                  4-Cadet Co-Op
                </span>
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-white">
                  Squad Multiplayer
                </h3>
                <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                  Real-time 4-player co-op with role lock-in (Commander, Systems Engineer, Medic, Resource Specialist), shared habitat life-support telemetry, and instant NASA bot fill.
                </p>
              </div>

              {/* Inline Private Code Entry */}
              <form onSubmit={handlePrivateJoinSubmit} className="pt-2 border-t border-white/10">
                <span className="text-[10px] text-white/50 block mb-1">
                  Or join private room by invite code:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={privateCodeInput}
                    onChange={(e) => {
                      setPrivateCodeInput(e.target.value.toUpperCase());
                      setCodeError(null);
                    }}
                    placeholder="e.g. T9SWJN"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#090d20] border border-white/20 text-white font-mono text-xs focus:border-cyan-400 outline-none uppercase tracking-widest text-center"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-cyan-300 font-bold text-xs border border-white/15 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Join Code 🛰️
                  </button>
                </div>
                {codeError && (
                  <span className="text-[10px] text-red-400 mt-1 block">{codeError}</span>
                )}
              </form>
            </div>

            <button
              type="button"
              onClick={() => {
                playAction();
                onClose();
                onOpenMatchmaking();
              }}
              className="
                w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500
                text-white font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20
                active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
              "
            >
              <span>⚡ Find Random Squad (Live Queue)</span>
              <span>→</span>
            </button>
          </div>

          {/* 2. BATTLE ROYALE */}
          <div className="rounded-3xl bg-gradient-to-b from-[#26142c] to-[#120b17] border-2 border-rose-500/50 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4 hover:border-rose-400 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-2xl bg-rose-500/20 border border-rose-400/30">
                  🪂
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-400/20 text-rose-200 border border-rose-400/40 uppercase tracking-wider">
                  Drop Zone: Olympus
                </span>
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-white">
                  Mars Battle Royale
                </h3>
                <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                  32-Cadet sudden-death drop on a 6×6 Martian sector grid. Scavenge orbital supply drops, outrun the shrinking dust &amp; radiation storm, and climb competitive ELO ranks.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-rose-300 pt-2 border-t border-white/10">
                <span>🛡️ Tactical Stims</span>
                <span>•</span>
                <span>🐾 Active Pet Perks</span>
                <span>•</span>
                <span>🏆 Ranked RP</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playAction();
                onClose();
                onOpenBattleRoyale();
              }}
              className="
                w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-orange-600 to-purple-600 hover:opacity-95
                text-white font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20
                active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
              "
            >
              <span>🪂 Drop into Olympus</span>
              <span>→</span>
            </button>
          </div>

          {/* 3. ENDLESS TOURNAMENTS */}
          <div className="rounded-3xl bg-gradient-to-b from-[#2a1e12] to-[#150e09] border-2 border-amber-500/50 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4 hover:border-amber-400 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30">
                  🏆
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/40 uppercase tracking-wider">
                  No 30-Sol Cap
                </span>
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-white">
                  Endless Survival Tournaments
                </h3>
                <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                  Seeded single-elimination brackets (4, 8, 16 teams) running indefinitely until habitat failure. Synchronized rival telemetry, compounding decay, and champion podiums.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-300 pt-2 border-t border-white/10">
                <span>⚡ 100% Deterministic Seed</span>
                <span>•</span>
                <span>👑 Crown Champions</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playAction();
                onClose();
                onOpenTournaments();
              }}
              className="
                w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-purple-600 hover:opacity-95
                text-white font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20
                active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
              "
            >
              <span>🏆 Open Tournament Hub</span>
              <span>→</span>
            </button>
          </div>

          {/* 4. PET HANGAR & LOADOUT */}
          <div className="rounded-3xl bg-gradient-to-b from-[#1e1533] to-[#0f0b1a] border-2 border-purple-500/50 p-5 sm:p-6 shadow-xl flex flex-col justify-between gap-4 hover:border-purple-400 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl p-2.5 rounded-2xl bg-purple-500/20 border border-purple-400/30">
                  🐾
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-400/20 text-purple-200 border border-purple-400/40 uppercase tracking-wider">
                  Companion Bay
                </span>
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-lg text-white">
                  Loadout &amp; Companion Pet Bay
                </h3>
                <p className="text-xs text-starlight/70 mt-1 leading-relaxed">
                  Equip cybernetic/bio-engineered pets (Rover-Cat, Tardigrade, Solar Falcon), configure 3-slot tactical consumable stims, and inspect your persistent competitive rank tier crest.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-purple-300 pt-2 border-t border-white/10">
                <span>🐱 Pet Perks &amp; Leveling</span>
                <span>•</span>
                <span>🧪 Pre-Drop Stims</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playAction();
                onClose();
                onOpenHangar();
              }}
              className="
                w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:opacity-95
                text-white font-heading font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20
                active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2
              "
            >
              <span>🐾 Open Pet &amp; Loadout Bay</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
