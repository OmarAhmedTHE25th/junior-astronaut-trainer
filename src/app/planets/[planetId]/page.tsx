'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSound } from '@/lib/sound';
import { useBattlePass } from '@/lib/battlePass';
import { useWallet } from '@/context/WalletContext';
import { useProfile } from '@/lib/profile';
import {
  type PlanetId,
  PLANET_CARTRIDGES,
  isPlanetUnlocked,
  getPlanetBestScores,
  getPlanetCartridge,
} from '@/lib/planetCartridges';
import { getPlanetFacts, type PlanetFact } from '@/lib/planetFacts';
import { BOOST_CATALOG } from '@/lib/battleRoyaleTypes';

const ARCADE_OBJECTIVE_MAP: Record<string, {
  name: string;
  type: string;
  objective: string;
  parameters: { icon: string; label: string; value: string }[];
}> = {
  earth: {
    name: 'Asteroid Impact Triangulation',
    type: 'Orbital Reconnaissance & Seismic Grid',
    objective: 'Deploy TDRS-12 satellite radar pings to triangulate 3 kinetic bolide impact fragments before scan budget depletes.',
    parameters: [
      { icon: '📡', label: 'Scan Budget', value: '10 Pings' },
      { icon: '🎯', label: 'Hidden Targets', value: '3 Impact Zones' },
      { icon: '🚨', label: 'Tactical Tool', value: 'Evacuation Beacon' },
      { icon: '🌡️', label: 'Sensor Grid', value: '8×8 Chebyshev Telemetry' },
    ],
  },
  venus: {
    name: 'HAVOC Cloud-City Altitude Wave-Rider',
    type: 'Super-Rotation Aerostat Flight',
    objective: 'Ride 400 km/h winds in the 50–60 km temperate band. Balance thermal heaters & ballast while dodging sulfuric acid clouds.',
    parameters: [
      { icon: '⏱️', label: 'Flight Duration', value: '45 Seconds' },
      { icon: '🟢', label: 'Safe Corridor', value: '50 – 60 km' },
      { icon: '⚠️', label: 'Atmospheric Threat', value: 'H₂SO₄ Acid Cells' },
      { icon: '🌪️', label: 'Wind Velocity', value: '400 km/h Super-Rotation' },
    ],
  },
  mercury: {
    name: 'Sungrazing Meteor Interceptor',
    type: 'Polar Outpost Kinetic Defense',
    objective: 'Protect the Mercury Polar Ice Outpost against 3 escalating waves of sungrazing comet fragments with shockwave interceptors.',
    parameters: [
      { icon: '🛡️', label: 'Defense Waves', value: '3 Waves (45s)' },
      { icon: '💥', label: 'Multi-Kill', value: 'Combo Multipliers (x2-x5)' },
      { icon: '☄️', label: 'Target Type', value: 'Iron-Silicate Fragments' },
      { icon: '⚡', label: 'Turret Network', value: 'Kinetic Shockwave Beam' },
    ],
  },
  jupiter: {
    name: 'Juno Gravity-Assist Slingshot',
    type: 'Orbital Mechanics & Perijove Skim',
    objective: 'Execute 5 perijove slingshot passes around Jupiter. Skim golden science rings while dodging moon Io\'s volcanic radiation torus.',
    parameters: [
      { icon: '🪐', label: 'Orbital Passes', value: '5 Perijove Passes' },
      { icon: '🟡', label: 'Science Target', value: 'Jovian Cloud Tops' },
      { icon: '☢️', label: 'Radiation Hazard', value: 'Io Plasma Torus' },
      { icon: '🌀', label: 'Storm Anomaly', value: 'Great Red Spot Vortex' },
    ],
  },
  saturn: {
    name: 'Ring-Plane Reflex Threader',
    type: 'High-Velocity Gap Navigation',
    objective: 'Thread through the Cassini Division at 70,000 km/h. Weave through moving ice boulder fields and skim Enceladus cryovolcanic plumes.',
    parameters: [
      { icon: '⏱️', label: 'Transit Duration', value: '45 Seconds' },
      { icon: '🚀', label: 'Crossing Speed', value: '70,000 km/h' },
      { icon: '🧊', label: 'Hazard Field', value: 'Water-Ice Boulders' },
      { icon: '💧', label: 'Shield Recharger', value: 'Enceladus Geyser Plumes' },
    ],
  },
  uranus: {
    name: 'Diamond Mantle Atmospheric Scoop',
    type: 'High-Pressure Catch & Dodge',
    objective: 'Descend into Uranus\'s mantle and catch falling methane diamond hail while dodging 98°-tilted sideways lightning bolts.',
    parameters: [
      { icon: '⏱️', label: 'Harvest Duration', value: '40 Seconds' },
      { icon: '💎', label: 'Target Quota', value: '20 Diamonds' },
      { icon: '⚡', label: 'Tilted Hazard', value: '98° Sideways Lightning' },
      { icon: '🛡️', label: 'Vessel Hull', value: 'Reinforced Tungsten Scoop' },
    ],
  },
  neptune: {
    name: 'Supersonic Jetstream Surfer',
    type: '4-Lane High-Speed Runner',
    objective: 'Surf 2,100 km/h methane jetstreams across 4 altitude lanes. Catch cyan slipstreams while dodging Great Dark Spot storm vortices.',
    parameters: [
      { icon: '⏱️', label: 'Surfing Clock', value: '45 Seconds' },
      { icon: '🌊', label: 'Supersonic Speed', value: '2,100 km/h Winds' },
      { icon: '🌀', label: 'Storm Obstacle', value: 'Great Dark Spot Vortices' },
      { icon: '🕹️', label: 'Altitude Channels', value: '4 Stratospheric Lanes' },
    ],
  },
  planet_x: {
    name: 'Planet Nine Anomaly Boss Battle',
    type: 'Deep Space Hybrid Tactical Encounter',
    objective: 'Survive the 600 AU singularity anomaly across 3 escalating phases while allocating reactor energy to charge Alcubierre Drive to 100%.',
    parameters: [
      { icon: '🌌', label: 'Anomaly Distance', value: '600 AU (Oort Void)' },
      { icon: '⚡', label: 'Escape Condition', value: '100% Warp Drive Charge' },
      { icon: '🌀', label: 'Boss Threat', value: 'Gravitational Lensing Crush' },
      { icon: '🕹️', label: 'Consoles', value: 'Warp, Shield, Graviton Pulse' },
    ],
  },
};

const ARCADE_MODIFIERS = [
  {
    id: 'standard_recon',
    name: 'Standard Trajectory',
    tagline: 'Balanced Arcade Simulation',
    description: 'Standard speed and obstacle density. Official campaign score progression with 1.0x baseline score.',
    icon: '🎯',
    perk: '1.0x Baseline Score',
    perkColor: 'text-emerald-300',
  },
  {
    id: 'high_yield',
    name: 'High-Yield Telemetry Sector',
    tagline: 'Increased Score Multiplier',
    description: 'Dense telemetry orbs and high-value data nodes with a +25% total score bonus.',
    icon: '💰',
    perk: '+25% Score Multiplier',
    perkColor: 'text-amber-300',
  },
  {
    id: 'hazard_storm',
    name: 'Hyper-Velocity Hazard Zone',
    tagline: 'Intense Speed & Danger',
    description: '1.25x faster hazards and high-frequency storms for elite commanders (+50% High-Risk Bonus).',
    icon: '🔥',
    perk: '1.25x Speed / +50% Bonus',
    perkColor: 'text-rose-400',
  },
];

export const UNIVERSAL_TACTICAL_ITEMS = [
  {
    slug: 'none',
    name: 'Standard Cargo Pod',
    icon: '📦',
    summary: 'Standard flight configuration without external tactical booster.',
    perk: 'Standard Baseline',
    perkColor: 'text-slate-400',
  },
  {
    slug: 'kinetic-overcharger',
    name: 'Kinetic Railgun Overcharger',
    icon: '💥',
    summary: 'Doubles projectile blast radius and grants a +25% score multiplier across all worlds (+15 Power on Mars).',
    perk: '+25% Score & Double Blast Radius',
    perkColor: 'text-amber-300',
  },
  {
    slug: 'quantum-scanner',
    name: 'Quantum Deep-Scan Pulse',
    icon: '📡',
    summary: 'Grants +3 extra scan sweeps on Earth, highlights ring ice & slipstream hazards on Saturn/Neptune, and boosts Mars research by +15%.',
    perk: '+3 Radar Scans & Hazard Radar',
    perkColor: 'text-cyan-300',
  },
  {
    slug: 'aegis-hull-matrix',
    name: 'Aegis Hull Reinforcement',
    icon: '🛡️',
    summary: 'Provides +35% starting hull/shield buffer across all arcade mini-games (+20 Shielding on Mars).',
    perk: '+35% Initial Hull & Shield Buffer',
    perkColor: 'text-emerald-300',
  },
  {
    slug: 'chrono-stabilizer',
    name: 'Chrono-Stasis Capacitor',
    icon: '⏱️',
    summary: 'Adds +10 seconds of extra clock time to countdowns and survival timers (+10 Morale on Mars).',
    perk: '+10s Clock Buffer Time',
    perkColor: 'text-purple-300',
  },
];

function PlanetBriefingContent() {
  const router = useRouter();
  const rawParams = useParams();
  const planetParam = (Array.isArray(rawParams?.planetId) ? rawParams.planetId[0] : rawParams?.planetId) as PlanetId;

  const { playClick, playAction, playAlert } = useSound();
  const { profile } = useProfile();
  const { state: bpState } = useBattlePass();
  const { creditsBalance, isFiveStarGeneral: walletVip, inventory } = useWallet();
  const isFiveStar = walletVip || Boolean(bpState.isFiveStarGeneral);

  const cartridge = useMemo(() => getPlanetCartridge(planetParam), [planetParam]);
  const isMars = cartridge.id === 'mars';
  const arcadeObjective = ARCADE_OBJECTIVE_MAP[cartridge.id];
  const planetFacts = useMemo(() => getPlanetFacts(cartridge.id), [cartridge.id]);

  const [mounted, setMounted] = useState<boolean>(false);
  const [selectedSite, setSelectedSite] = useState<string>(() => isMars ? (cartridge.locations[0]?.id || 'site_1') : 'standard_recon');
  const [selectedTactical, setSelectedTactical] = useState<string>('none');
  const [gameMode, setGameMode] = useState<'standard' | 'timed' | 'endless'>('standard');
  const [imageError, setImageError] = useState<boolean>(false);
  const [bestScores, setBestScores] = useState<Record<PlanetId, number>>({} as Record<PlanetId, number>);
  const [factIndex, setFactIndex] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setBestScores(getPlanetBestScores());
    }
    if (isMars && cartridge.locations[0]) {
      setSelectedSite(cartridge.locations[0].id);
    } else if (!isMars) {
      setSelectedSite('standard_recon');
    }
  }, [cartridge, isMars]);

  const isUnlocked = useMemo(() => {
    return isPlanetUnlocked(cartridge.id, isFiveStar, mounted ? bestScores : {});
  }, [cartridge.id, isFiveStar, bestScores, mounted]);

  const prevCartridge = cartridge.prevPlanetId ? PLANET_CARTRIDGES[cartridge.prevPlanetId] : null;
  const prevScore = cartridge.prevPlanetId ? bestScores[cartridge.prevPlanetId] || 0 : 0;

  const handleLaunch = () => {
    playAction();
    const query = new URLSearchParams();
    query.set('planet', cartridge.id);
    query.set('site', selectedSite);
    query.set('launch', 'true');
    const savedDiff = typeof window !== 'undefined' ? localStorage.getItem('jat_mission_difficulty_v1') || 'commander' : 'commander';
    query.set('difficulty', savedDiff);
    if (gameMode === 'timed') {
      query.set('timed', 'true');
    }
    if (gameMode === 'endless') {
      query.set('tournamentId', 'campaign-endless');
    }
    if (selectedTactical && selectedTactical !== 'none') {
      query.set('tactical', selectedTactical);
    }
    query.set('nonce', Date.now().toString());
    try {
      localStorage.removeItem('jat_active_save_v1');
    } catch {}
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

          {/* VIP Status, Balance or Best Score */}
          <div className="flex items-center gap-2">
            <Link
              href="/store"
              onClick={playClick}
              className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5 shadow-sm"
              title="Colony Store & Gear"
            >
              <span>💰</span>
              <span>{creditsBalance} GC</span>
            </Link>
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

              {/* Dual Custom Telemetry Gauges Preview (Mars) OR Arcade Objective Dossier (Other Planets) */}
              {isMars ? (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold text-starlight/60 uppercase tracking-widest block">
                    Sector Telemetry Gauges (HUD Slots 3 &amp; 4):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {cartridge.customMetrics.map((metric) => (
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
              ) : arcadeObjective ? (
                <div className="space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
                      <span>🕹️</span>
                      <span>Arcade Operation: {arcadeObjective.name}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 w-fit">
                      {arcadeObjective.type}
                    </span>
                  </div>
                  <p className="text-xs text-starlight/90 bg-black/50 border border-white/10 rounded-xl p-3 leading-relaxed">
                    {arcadeObjective.objective}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    {arcadeObjective.parameters.map((param, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-black/60 border border-white/10 flex flex-col justify-between">
                        <div className="text-[10px] text-starlight/60 font-mono flex items-center gap-1">
                          <span>{param.icon}</span>
                          <span className="truncate">{param.label}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-white mt-1">
                          {param.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

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

        {/* NASA Planetary Science Telemetry & Fun Facts Card */}
        {planetFacts.length > 0 && (
          <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0B132B]/90 via-[#1C2541]/80 to-[#0B132B]/90 border border-cyan-500/30 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛰️</span>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-cyan-200 tracking-wide flex items-center gap-2">
                    <span>NASA Planetary Science Telemetry &amp; Fun Facts</span>
                    <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/40">
                      Telemetry #{factIndex + 1} of {planetFacts.length}
                    </span>
                  </h3>
                  <p className="text-xs text-starlight/70 font-mono">
                    Authenticated planetary science and mission facts for {cartridge.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setFactIndex((prev) => (prev + 1) % planetFacts.length);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <span>Cycle Transmission</span>
                <span>↻</span>
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-amber-300 flex items-center gap-1.5">
                  <span>📌</span>
                  <span>{planetFacts[factIndex]?.title}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-starlight/80">
                  {planetFacts[factIndex]?.category.toUpperCase()}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-starlight/90 leading-relaxed font-sans">
                {planetFacts[factIndex]?.fact}
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-cyan-300/70 border-t border-white/5">
                <span>NASA Source: {planetFacts[factIndex]?.nasaSource}</span>
                <span className="text-amber-400">{'★'.repeat(planetFacts[factIndex]?.funRating || 5)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Configuration Bay: Landing Site / Arcade Modifier & Game Mode */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: 3 Landing Locations OR 3 Arcade Modifiers */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                <span>{isMars ? '📍' : '🕹️'}</span>
                <span>{isMars ? 'Select Landing Site' : 'Select Mission Sector / Arcade Modifier'}</span>
              </h3>
              <span className="text-xs font-mono text-starlight/60">
                {isMars ? `${cartridge.locations.length} Sites Available` : `${ARCADE_MODIFIERS.length} Modifiers Available`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {isMars ? (
                cartridge.locations.map((loc) => {
                  const isSelected = selectedSite === loc.id;
                  const perks: { label: string; isNegative: boolean }[] = [];
                  if (loc.bonusStats.power) {
                    perks.push({
                      label: `${loc.bonusStats.power > 0 ? `+${loc.bonusStats.power}` : loc.bonusStats.power}%⚡`,
                      isNegative: loc.bonusStats.power < 0,
                    });
                  }
                  if (loc.bonusStats.oxygen) {
                    perks.push({
                      label: `${loc.bonusStats.oxygen > 0 ? `+${loc.bonusStats.oxygen}` : loc.bonusStats.oxygen}%🫁`,
                      isNegative: loc.bonusStats.oxygen < 0,
                    });
                  }
                  if (loc.bonusStats.shielding) {
                    perks.push({
                      label: `${loc.bonusStats.shielding > 0 ? `+${loc.bonusStats.shielding}` : loc.bonusStats.shielding}%🛡️`,
                      isNegative: loc.bonusStats.shielding < 0,
                    });
                  }

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

                      <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono font-bold flex flex-wrap items-center gap-1">
                        {perks.length > 0 ? (
                          perks.map((p, idx) => (
                            <span key={idx} className="inline-flex items-center">
                              {idx > 0 && <span className="text-white/30 mx-1">•</span>}
                              <span className={p.isNegative ? 'text-rose-400' : 'text-emerald-300'}>
                                {p.label}
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-emerald-300/80">Standard Baseline</span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                ARCADE_MODIFIERS.map((mod) => {
                  const isSelected = selectedSite === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedSite(mod.id);
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
                          <span className="text-2xl">{mod.icon}</span>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-400 text-slate-950">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <h4 className="font-heading font-black text-sm text-white">
                          {mod.name}
                        </h4>
                        <p className="text-[10px] text-cyan-300/80 font-mono mt-0.5">
                          {mod.tagline}
                        </p>
                        <p className="text-[11px] text-starlight/70 line-clamp-2 mt-1">
                          {mod.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono font-bold">
                        <span className={mod.perkColor}>{mod.perk}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Tactical Supply Module / Power-Up Selector [ALL WORLDS] */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-heading font-black text-white flex items-center gap-2">
                    <span>⚡</span>
                    <span>Equip Tactical Supply Module [ALL WORLDS]</span>
                  </h4>
                  <p className="text-[11px] text-starlight/60">
                    Slot 1 universal arcade &amp; survival power-up from your colony cargo depot
                  </p>
                </div>
                <Link
                  href="/store"
                  onClick={playClick}
                  className="text-[10px] font-mono text-cyan-300 hover:text-cyan-200 underline"
                >
                  Depot Store →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {UNIVERSAL_TACTICAL_ITEMS.map((item) => {
                  const isSelected = selectedTactical === item.slug;
                  const isOwned = item.slug === 'none' || Boolean(inventory?.some((inv) => inv.itemSlug === item.slug && inv.quantity > 0)) || isFiveStar;
                  const count = item.slug === 'none' ? null : inventory?.find((inv) => inv.itemSlug === item.slug)?.quantity || (isFiveStar ? 'VIP' : 0);

                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedTactical(item.slug);
                      }}
                      className={`
                        p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer min-h-[110px]
                        ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md ring-2 ring-cyan-400/40'
                            : isOwned
                            ? 'bg-black/40 hover:bg-[#1a234f] border-white/10 text-slate-300'
                            : 'bg-black/20 border-white/5 text-slate-500 opacity-70'
                        }
                      `}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl">{item.icon}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            isSelected
                              ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                              : isOwned
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 text-white/40 border-white/10'
                          }`}>
                            {isSelected ? 'EQUIPPED' : count !== null ? (typeof count === 'number' ? `x${count} Cargo` : count) : 'Ready'}
                          </span>
                        </div>
                        <h5 className="font-heading font-extrabold text-xs text-white leading-tight">
                          {item.name}
                        </h5>
                        <p className="text-[10px] text-starlight/70 line-clamp-2 mt-0.5">
                          {item.summary}
                        </p>
                      </div>

                      <div className="mt-2 pt-1 border-t border-white/10 text-[9px] font-mono font-bold">
                        <span className={item.perkColor}>{item.perk}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Game Mode & Initiate Launch */}
          <div className="lg:col-span-4 p-6 rounded-3xl bg-[#111827]/90 border border-slate-700/80 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                <span>⏱️</span>
                <span>{isMars ? 'Expedition Mode' : 'Arcade Mission Mode'}</span>
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
                      <span>🛡️</span> {isMars ? `Standard Mode (30 ${cartridge.dayUnit.plural})` : 'Standard Arcade Operation'}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {isMars
                        ? 'Untimed strategic survival • Official campaign score progression'
                        : 'Standard speed & obstacles • Official campaign score progression'}
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
                      <span>⏱️</span> {isMars ? 'Timed Crisis (15s Clock)' : 'Blitz Speed-Run (1.5x Score)'}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {isMars
                        ? 'Instant failure on 0s • Rapid response speed bonus points'
                        : 'High-speed hazard blitz • 1.5x Rapid Response Score Multiplier'}
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
                      <span>♾️</span> {isMars ? 'Endless Survival' : 'Endless Sector Challenge'}
                    </div>
                    <div className="text-[10px] opacity-70">
                      {isMars
                        ? `Survive past ${cartridge.dayUnit.singular} 30 • Compounding decay curves`
                        : 'Survive infinite hazard escalations • High-risk leaderboard run'}
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
