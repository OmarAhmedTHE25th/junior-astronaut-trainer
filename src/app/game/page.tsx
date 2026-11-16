"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GameProvider } from "@/components/game/GameProvider";
import GameBoard from "@/components/game/GameBoard";
import type { Difficulty, GameState, LandingSiteId } from "@/lib/types";
import { type PlanetId, getPlanetCartridge, ORDERED_PLANET_IDS } from "@/lib/planetCartridges";
import { SPECIALTY_METAS } from "@/lib/types";
import { useProfile, getOrCreateCadetProfile, DEFAULT_PROFILE } from "@/lib/profile";
import { playClick, playAction } from "@/lib/sound";

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

function GamePageContent() {
  const searchParams = useSearchParams();
  const { profile, isLoaded } = useProfile();
  const [launched, setLaunched] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("commander");
  const [planetId, setPlanetId] = useState<PlanetId>("earth");
  const [landingSite, setLandingSite] = useState<LandingSiteId>("iss_zenith");
  const [squadCode, setSquadCode] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [weatherSeed, setWeatherSeed] = useState<number | null>(null);
  const [savedRun, setSavedRun] = useState<GameState | null>(null);
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [isTimedMode, setIsTimedMode] = useState<boolean>(false);
  const [equippedTactical, setEquippedTactical] = useState<string | null>(null);
  const [launchNonce, setLaunchNonce] = useState<number>(0);
  const [tournamentMeta, setTournamentMeta] = useState<{
    tournamentId?: string;
    matchId?: string;
    rngSeed?: number;
    rivalCallsign?: string;
    rivalAvatar?: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  const activeCadet = mounted && isLoaded ? profile : DEFAULT_PROFILE;

  const activeSpecialty = SPECIALTY_METAS.find((s) => s.id === (activeCadet.specialty || 'commander'));

  useEffect(() => {
    setMounted(true);
    try {
      const squadParam = searchParams.get("squad");
      const matchParam = searchParams.get("matchId");
      const timedParam = searchParams.get("timed");
      const tacticalParam = searchParams.get("tactical");
      if (tacticalParam) {
        setEquippedTactical(tacticalParam);
      }
      const tournamentIdParam = searchParams.get("tournamentId");
      const autoLaunchParam = searchParams.get("launch") === "true";
      const planetParam = searchParams.get("planet") as PlanetId | null;
      const runParam = searchParams.get("run");
      const isExplicitLaunch = autoLaunchParam || Boolean(planetParam) || Boolean(runParam);

      // Force fresh state on explicit launch
      if (isExplicitLaunch) {
        try {
          localStorage.removeItem("jat_active_save_v1");
        } catch {}
        setSavedRun(null);
        setIsResuming(false);
        setLaunchNonce(Date.now());
      }

      const diffParam = searchParams.get("difficulty") as Difficulty | null;
      if (diffParam && ["cadet", "commander", "pioneer"].includes(diffParam)) {
        setDifficulty(diffParam);
      } else {
        try {
          const savedDiff = localStorage.getItem("jat_mission_difficulty_v1") as Difficulty | null;
          if (savedDiff && ["cadet", "commander", "pioneer"].includes(savedDiff)) {
            setDifficulty(savedDiff);
          }
        } catch {}
      }

      if (timedParam === "true" || timedParam === "1") {
        setIsTimedMode(true);
      }

      const siteParam = searchParams.get("site");
      if (planetParam && ORDERED_PLANET_IDS.includes(planetParam)) {
        setPlanetId(planetParam);
        if (siteParam) {
          setLandingSite(siteParam as LandingSiteId);
        } else {
          const cart = getPlanetCartridge(planetParam);
          if (cart.locations[0]) {
            setLandingSite(cart.locations[0].id as LandingSiteId);
          }
        }
        if (autoLaunchParam || siteParam) {
          try {
            localStorage.removeItem("jat_active_save_v1");
          } catch {}
          setSavedRun(null);
          setIsResuming(false);
          setLaunchNonce(Date.now());
          setLaunched(true);
          return;
        }
      }

      if (tournamentIdParam) {
        const tMatchId = searchParams.get("matchId") || "match-1";
        const tSeed = Number(searchParams.get("seed")) || 777777;
        const rivalName = searchParams.get("rival") || "Rival Cadet";
        const rivalAvatar = searchParams.get("rivalAvatar") || "🤖";

        setTournamentMeta({
          tournamentId: tournamentIdParam,
          matchId: tMatchId,
          rngSeed: tSeed,
          rivalCallsign: rivalName,
          rivalAvatar: rivalAvatar,
        });
        setDifficulty("commander");
        setWeatherSeed(tSeed);
        try {
          localStorage.removeItem("jat_active_save_v1");
        } catch {}
        setSavedRun(null);
        setIsResuming(false);
        setLaunchNonce(Date.now());
        setLaunched(true);
        return;
      }

      if (matchParam) {
        const cleanMatch = matchParam.trim();
        setMatchId(cleanMatch);
        setDifficulty("commander");
        try {
          localStorage.removeItem("jat_active_save_v1");
        } catch {}
        setSavedRun(null);
        setIsResuming(false);
        setLaunchNonce(Date.now());

        fetch(`/api/match/${cleanMatch}/stream?poll=true`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.match) {
              setLandingSite(data.match.landingZone || "jezero");
              setWeatherSeed(data.match.weatherSeed || 424242);
            }
          })
          .catch(() => {})
          .finally(() => {
            setLaunched(true);
          });
        return;
      }

      if (squadParam) {
        const cleanSquad = squadParam.trim().toUpperCase();
        setSquadCode(cleanSquad);
        setDifficulty("commander");
        try {
          localStorage.removeItem("jat_active_save_v1");
        } catch {}
        setSavedRun(null);
        setIsResuming(false);
        setLaunchNonce(Date.now());

        fetch(`/api/squad/${cleanSquad}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.success && data.room) {
              setLandingSite(data.room.landingZone || "jezero");
              setWeatherSeed(data.room.weatherSeed || 424242);
              if (data.room.isTimedMode) {
                setIsTimedMode(true);
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setLaunched(true);
          });
        return;
      }

      if (!isExplicitLaunch) {
        const raw = localStorage.getItem("jat_active_save_v1");
        if (raw) {
          const parsed = JSON.parse(raw) as GameState;
          if (
            !parsed ||
            !parsed.sol ||
            parsed.phase === "victory" ||
            parsed.phase === "gameover" ||
            parsed.power <= 0 ||
            parsed.oxygen <= 0 ||
            parsed.shielding <= 0
          ) {
            // Mission ended or flatlined: purge save immediately
            try {
              localStorage.removeItem("jat_active_save_v1");
            } catch {}
            const activeCadetId =
              parsed?.cadetId ||
              (typeof window !== "undefined" ? getOrCreateCadetProfile().cadetId : undefined);
            if (activeCadetId) {
              fetch(`/api/save?cadetId=${encodeURIComponent(activeCadetId)}`, {
                method: "DELETE",
                keepalive: true,
              }).catch(() => {});
            }
            setSavedRun(null);
            setIsResuming(false);
          } else {
            // Active, surviving mission
            setSavedRun(parsed);
            if (parsed.planetId) {
              setPlanetId(parsed.planetId);
            }
            if (parsed.isTimedMode !== undefined) {
              setIsTimedMode(parsed.isTimedMode);
            }
            if (searchParams.get("resume") === "true") {
              setIsResuming(true);
              setLaunched(true);
            } else {
              setIsResuming(false);
            }
          }
        } else {
          setSavedRun(null);
          setIsResuming(false);
        }
      }
    } catch {}
  }, [searchParams]);

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
                    setIsResuming(true);
                    setLaunched(true);
                  }}
                  className="
                    px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 border border-cyan-200
                    text-slate-950 font-extrabold text-sm hover:scale-105 active:scale-95 transition-all
                    cursor-pointer shadow-sm flex-shrink-0 min-h-[44px]
                  "
                >
                  ▶️ Resume Mission
                </button>
              </div>
            )}

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

            {/* Mode Selection Toggle: Standard (Untimed) vs Timed Crisis Mode */}
            <div className="mb-8 p-4 rounded-2xl bg-[#0B1026]/90 border border-white/10">
              <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E87040] block mb-2 text-center">
                Select Mission Pace &amp; Crisis Protocol
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsTimedMode(false);
                  }}
                  className={`
                    p-3.5 rounded-xl border text-left transition-all cursor-pointer
                    ${
                      !isTimedMode
                        ? 'bg-[#1a1f3d] border-[#22C55E] ring-1 ring-[#22C55E]/40 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:border-white/20 opacity-75'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🛡️</span>
                    <span className="font-heading font-bold text-sm text-white">
                      Standard Mode
                    </span>
                    {!isTimedMode && (
                      <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#F8FAFC]/70 leading-snug">
                    Untimed tactical decision making. Plan each Sol carefully at your own pace.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsTimedMode(true);
                  }}
                  className={`
                    p-3.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden
                    ${
                      isTimedMode
                        ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/40 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:border-white/20 opacity-75'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">⏱️</span>
                    <span className="font-heading font-bold text-sm text-white">
                      Timed Crisis Mode
                    </span>
                    {isTimedMode && (
                      <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse font-bold">
                        15s / SOL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#F8FAFC]/70 leading-snug">
                    Strict 15s decision clock! Hit 0s and the mission is lost! Earn Rapid Response speed bonuses for fast choices.
                  </p>
                </button>
              </div>
            </div>

            {/* Launch button */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('jat_active_save_v1');
                  } catch {}
                  setIsResuming(false);
                  setSavedRun(null); // Launch new mission
                  setLaunchNonce(Date.now());
                  playAction();
                  setLaunched(true);
                }}
                className="
                  inline-flex items-center gap-3
                  px-10 py-4 rounded-2xl
                  bg-cyan-400 hover:bg-cyan-300 border border-cyan-200
                  text-slate-950 font-heading font-extrabold text-xl
                  animate-glow-pulse hover:scale-105
                  transition-transform duration-200
                  focus:outline-none focus:ring-4 focus:ring-cyan-400/50
                  cursor-pointer shadow-md
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
      key={`${planetId}-${landingSite}-${searchParams.get('run') || 'init'}`}
      difficulty={difficulty}
      specialty={activeCadet.specialty}
      landingSite={landingSite}
      planetId={planetId}
      cadet={{
        cadetId: activeCadet.cadetId,
        callsign: activeCadet.callsign,
        avatar: activeCadet.avatar,
      }}
      squadCode={squadCode || undefined}
      weatherSeed={weatherSeed || undefined}
      initialState={
        isResuming &&
        savedRun &&
        savedRun.phase !== "victory" &&
        savedRun.phase !== "gameover" &&
        savedRun.power > 0 &&
        savedRun.oxygen > 0 &&
        savedRun.shielding > 0
          ? savedRun
          : undefined
      }
      isTimedMode={isTimedMode}
      equippedTacticalItem={equippedTactical || undefined}
      tournament={tournamentMeta || undefined}
    >
      <GameBoard
        matchId={matchId}
        cadetId={activeCadet.cadetId}
        cadetName={activeCadet.callsign}
        onChangeDifficulty={() => {
          try {
            localStorage.removeItem('jat_active_save_v1');
          } catch {}
          setIsResuming(false);
          setSavedRun(null);
          setLaunchNonce(Date.now());
          setLaunched(false);
        }}
      />
    </GameProvider>
  );
}

export default function GamePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1026] flex items-center justify-center text-cyan-400 font-mono text-sm">
          INITIALIZING TELEMETRY...
        </div>
      }
    >
      <GamePageContent />
    </Suspense>
  );
}
