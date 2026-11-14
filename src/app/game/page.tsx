"use client";

import { useState, useEffect } from "react";
import { GameProvider } from "@/components/game/GameProvider";
import GameBoard from "@/components/game/GameBoard";
import type { Difficulty, GameState, LandingSiteId } from "@/lib/types";
import { SPECIALTY_METAS } from "@/lib/types";
import { useProfile, getOrCreateCadetProfile } from "@/lib/profile";
import { playClick, playAction } from "@/lib/sound";
import MarsGlobeSelector from "@/components/game/MarsGlobeSelector";

const difficulties: { value: Difficulty; label: string; emoji: string; desc: string }[] = [
  {
    value: "cadet",
    label: "Cadet",
    emoji: "🌟",
    desc: "Easy mode — perfect for your first mission! More resources, fewer storms.",
  },
  {
    value: "commander",
    label: "Commander",
    emoji: "🎖️",
    desc: "Standard challenge — balanced resources and real NASA solar events.",
  },
  {
    value: "pioneer",
    label: "Pioneer",
    emoji: "🔥",
    desc: "Expert mode — low resources, intense storms. Only the bravest survive!",
  },
];

export default function GamePage() {
  const { profile, isLoaded } = useProfile();
  const [launched, setLaunched] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("commander");
  const [landingSite, setLandingSite] = useState<LandingSiteId>("jezero");
  const [savedRun, setSavedRun] = useState<GameState | null>(null);

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  const activeSpecialty = SPECIALTY_METAS.find((s) => s.id === (activeCadet.specialty || 'commander'));

  useEffect(() => {
    try {
      const search = window.location.search;
      const raw = localStorage.getItem("jat_active_save_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as GameState;
        if (parsed && parsed.sol && parsed.phase !== "victory" && parsed.phase !== "gameover") {
          setSavedRun(parsed);
          if (search.includes("resume=true")) {
            setLaunched(true);
          }
        }
      }
    } catch {}
  }, []);

  if (!launched) {
    return (
      <>
        <div className="starfield-bg" aria-hidden="true" />

        <main className="relative z-10 flex flex-col items-center justify-center min-h-dvh px-4 py-12">
          {/* Briefing card */}
          <div className="max-w-2xl w-full rounded-3xl border border-starlight/10 bg-space-navy/80 backdrop-blur-lg shadow-2xl p-8 md:p-12 animate-slide-up">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="text-5xl animate-float inline-block" aria-hidden="true">
                🛸
              </span>
              <h1 className="font-heading text-3xl md:text-4xl font-extrabold mt-4">
                Mission Briefing
              </h1>
              <p className="text-starlight/60 mt-3 leading-relaxed max-w-lg mx-auto">
                Commander, you&apos;ve been selected to lead a crew of four on
                a <span className="text-mars-orange font-semibold">30-sol mission</span> to
                the Red Planet. You must manage your outpost&apos;s power,
                oxygen, and radiation shielding to keep everyone safe.
              </p>
              <p className="text-starlight/50 mt-2 text-sm">
                Real solar flare and radiation data from NASA will challenge you
                along the way. Good luck, astronaut!
              </p>
            </div>

            {/* Active Cadet Profile Callout */}
            <div className="mb-6 p-3.5 rounded-2xl bg-[#0B1026]/90 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeCadet.avatar}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{activeCadet.callsign}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {activeSpecialty?.icon} {activeSpecialty?.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#F8FAFC]/70 mt-0.5">
                    ⚡ {activeSpecialty?.perkDescription}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-xs font-mono text-[#22C55E]">
                ● Ready for Launch
              </span>
            </div>

            {/* Resume button if active run exists */}
            {savedRun && (
              <div className="mb-8 p-4 rounded-2xl bg-[#E87040]/15 border-2 border-[#E87040] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs font-mono font-bold text-[#E87040] uppercase tracking-wider block">
                    Telemetry Check: Active Run Detected
                  </span>
                  <p className="text-sm font-bold text-white mt-0.5">
                    Sol {savedRun.sol} of 30 • {savedRun.difficulty.toUpperCase()} MODE
                  </p>
                  <p className="text-xs text-white/60">
                    Power: {savedRun.power}% • O₂: {savedRun.oxygen}% • Shield: {savedRun.shielding}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playAction();
                    setLaunched(true);
                  }}
                  className="
                    px-6 py-3 rounded-xl bg-gradient-to-r from-[#E87040] to-[#6B3FA0]
                    text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all
                    cursor-pointer shadow-lg shadow-[#E87040]/20 flex-shrink-0 min-h-[44px]
                  "
                >
                  ▶️ Resume Mission
                </button>
              </div>
            )}

            {/* 3D Martian Globe Landing Zone Selector */}
            <div className="mb-8">
              <MarsGlobeSelector
                selectedSite={landingSite}
                onSelectSite={setLandingSite}
              />
            </div>

            {/* Difficulty selector */}
            <fieldset className="mb-8">
              <legend className="font-heading text-lg font-bold mb-4 text-center">
                Select Difficulty
              </legend>

              <div className="grid gap-4 sm:grid-cols-3">
                {difficulties.map((d) => {
                  const selected = difficulty === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        playClick();
                        setDifficulty(d.value);
                        setSavedRun(null); // start fresh on difficulty click
                      }}
                      className={`
                        relative flex flex-col items-center gap-2 p-5 rounded-2xl border-2
                        transition-all duration-200 cursor-pointer text-center
                        focus:outline-none focus:ring-4 focus:ring-mars-orange/40
                        ${
                          selected
                            ? "border-mars-orange bg-mars-orange/10 shadow-lg shadow-mars-orange/10"
                            : "border-starlight/10 bg-starlight/5 hover:border-starlight/30"
                        }
                      `}
                      aria-pressed={selected}
                    >
                      <span className="text-3xl">{d.emoji}</span>
                      <span className="font-heading font-bold text-lg">{d.label}</span>
                      <span className="text-xs text-starlight/50 leading-snug">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Launch button */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  playAction();
                  setSavedRun(null); // Launch new mission
                  setLaunched(true);
                }}
                className="
                  inline-flex items-center gap-3
                  px-10 py-4 rounded-2xl
                  bg-gradient-to-r from-mars-orange to-cosmic-purple
                  text-white font-heading font-bold text-xl
                  animate-glow-pulse hover:scale-105
                  transition-transform duration-200
                  focus:outline-none focus:ring-4 focus:ring-mars-orange/50
                  cursor-pointer
                "
              >
                Launch New Mission
                <span className="text-2xl" aria-hidden="true">🚀</span>
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <GameProvider
      difficulty={difficulty}
      specialty={activeCadet.specialty}
      landingSite={landingSite}
      cadet={{
        cadetId: activeCadet.cadetId,
        callsign: activeCadet.callsign,
        avatar: activeCadet.avatar,
      }}
      initialState={savedRun || undefined}
    >
      <GameBoard
        onChangeDifficulty={() => {
          setSavedRun(null);
          setLaunched(false);
        }}
      />
    </GameProvider>
  );
}
