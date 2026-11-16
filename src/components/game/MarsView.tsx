'use client';

import React from 'react';
import { useGame } from './GameProvider';
import { getPlanetCartridge, type PlanetId } from '@/lib/planetCartridges';

// Base Stars Component
function Starfield({ count = 40, className = 'opacity-70' }: { count?: number; className?: string }) {
  // Deterministic positions based on index
  const stars = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: ((i * 37 + 13) % 100),
      y: ((i * 59 + 23) % 85),
      size: (i % 3 === 0 ? 2 : (i % 2 === 0 ? 1.5 : 1)),
      opacity: 0.3 + ((i * 17) % 70) / 100,
      pulse: i % 4 === 0,
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {stars.map((s, idx) => (
        <div
          key={idx}
          className={`absolute rounded-full bg-white ${s.pulse ? 'animate-pulse' : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

// 1. EARTH: Low Earth Orbit View (Atmospheric Limb, Continents, ISS Trusses)
function EarthBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020617]">
      <Starfield count={50} />

      {/* Earth Curved Atmospheric Limb & Ocean/Continent Body */}
      <svg className="absolute bottom-[-15%] -left-[10%] w-[120%] h-[80%] min-h-[420px]" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="earthAtmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="8%" stopColor="#0284c7" stopOpacity="0.5" />
            <stop offset="25%" stopColor="#0369a1" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#082f49" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="cloudGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="cityLights" cx="35%" cy="65%" r="40%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer Atmospheric Glow / Ionosphere */}
        <path d="M0,280 Q500,120 1000,280 L1000,600 L0,600 Z" fill="url(#earthAtmosphere)" />

        {/* Atmospheric Blue Ribbon Horizon */}
        <path d="M0,280 Q500,120 1000,280" fill="none" stroke="#38bdf8" strokeWidth="4" className="shadow-[0_0_20px_#38bdf8]" />
        <path d="M0,284 Q500,124 1000,284" fill="none" stroke="#7dd3fc" strokeWidth="2" opacity="0.6" />

        {/* Ocean Body */}
        <path d="M0,285 Q500,125 1000,285 L1000,600 L0,600 Z" fill="#032b43" opacity="0.95" />

        {/* Continent landmass silhouettes */}
        <path d="M150,330 Q220,300 280,340 Q350,370 310,420 Q240,450 180,410 Z" fill="#155e75" opacity="0.8" />
        <path d="M520,290 Q620,240 700,280 Q780,330 720,380 Q610,390 540,340 Z" fill="#1e3a5f" opacity="0.85" />
        <path d="M780,350 Q850,320 920,360 Q960,400 900,430 Z" fill="#164e63" opacity="0.75" />

        {/* Night terminator city light clusters */}
        <ellipse cx="230" cy="370" rx="40" ry="25" fill="url(#cityLights)" />
        <ellipse cx="640" cy="330" rx="55" ry="30" fill="url(#cityLights)" />
        <circle cx="210" cy="355" r="1.5" fill="#fef08a" className="animate-pulse" />
        <circle cx="235" cy="380" r="1.5" fill="#fef08a" />
        <circle cx="255" cy="365" r="1.5" fill="#fde047" />
        <circle cx="630" cy="320" r="2" fill="#fde047" className="animate-pulse" />
        <circle cx="660" cy="340" r="1.5" fill="#fef08a" />

        {/* Weather swirls / Cloud bands */}
        <path d="M80,310 Q220,270 380,320 Q300,340 180,330 Z" fill="url(#cloudGlow)" />
        <path d="M460,270 Q600,230 750,290 Q680,310 520,300 Z" fill="url(#cloudGlow)" />
        <path d="M680,310 Q820,280 960,330 Q880,350 750,330 Z" fill="url(#cloudGlow)" />
      </svg>

      {/* ISS Solar Array Trusses Framing Upper Viewport Corners */}
      <svg className="absolute -top-4 -left-6 w-56 h-36 opacity-75 pointer-events-none" viewBox="0 0 200 120">
        {/* Main Truss Bar */}
        <rect x="0" y="40" width="180" height="6" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="170" cy="43" r="5" fill="#38bdf8" opacity="0.8" />
        {/* Solar Mast & Cells */}
        <rect x="40" y="10" width="40" height="65" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="60" y1="10" x2="60" y2="75" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="40" y1="30" x2="80" y2="30" stroke="#0ea5e9" strokeWidth="0.5" />
        <line x1="40" y1="50" x2="80" y2="50" stroke="#0ea5e9" strokeWidth="0.5" />
        <rect x="95" y="10" width="40" height="65" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="115" y1="10" x2="115" y2="75" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="95" y1="30" x2="135" y2="30" stroke="#0ea5e9" strokeWidth="0.5" />
        <line x1="95" y1="50" x2="135" y2="50" stroke="#0ea5e9" strokeWidth="0.5" />
      </svg>
      <svg className="absolute -top-4 -right-6 w-56 h-36 opacity-75 pointer-events-none" viewBox="0 0 200 120">
        <rect x="20" y="40" width="180" height="6" fill="#64748b" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="30" cy="43" r="5" fill="#38bdf8" opacity="0.8" />
        <rect x="65" y="10" width="40" height="65" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="85" y1="10" x2="85" y2="75" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="65" y1="30" x2="105" y2="30" stroke="#0ea5e9" strokeWidth="0.5" />
        <line x1="65" y1="50" x2="105" y2="50" stroke="#0ea5e9" strokeWidth="0.5" />
        <rect x="120" y="10" width="40" height="65" rx="1" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="140" y1="10" x2="140" y2="75" stroke="#38bdf8" strokeWidth="0.8" />
        <line x1="120" y1="30" x2="160" y2="30" stroke="#0ea5e9" strokeWidth="0.5" />
        <line x1="120" y1="50" x2="160" y2="50" stroke="#0ea5e9" strokeWidth="0.5" />
      </svg>
    </div>
  );
}

// 2. VENUS: Aerostat Altitude View (Golden Sulfuric Acid Cloud Tops, Distant Lightning, No Craters)
function VenusBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#1c1204] via-[#4d2800] to-[#b45309]/30">
      {/* High atmosphere super-rotation wind haze */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-300 via-yellow-600 to-transparent" />

      {/* Lightning Flash Simulation */}
      <div className="absolute top-[35%] left-[25%] w-48 h-32 bg-amber-200/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-[40%] right-[30%] w-64 h-24 bg-yellow-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.2s' }} />

      {/* Billowing Sulfuric Acid Cloud Decks (Aerostat View - No Rocky Craters) */}
      <svg className="absolute bottom-0 left-0 w-full h-[65%] min-h-[340px]" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="venusCloudTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="30%" stopColor="#d97706" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="venusCloudMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#92400e" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="venusCloudDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#271004" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Distant Lightning Fork */}
        <path d="M260,110 L275,140 L265,150 L285,180" stroke="#fef08a" strokeWidth="1.5" fill="none" opacity="0.7" className="animate-pulse" />
        <path d="M720,130 L710,155 L725,170 L715,195" stroke="#fef08a" strokeWidth="1.5" fill="none" opacity="0.6" className="animate-pulse" style={{ animationDelay: '0.8s' }} />

        {/* Distant cloud billow layer */}
        <path
          d="M0,140 Q120,110 240,135 Q380,105 520,130 Q680,100 820,125 Q920,110 1000,130 L1000,400 L0,400 Z"
          fill="url(#venusCloudTop)"
        />

        {/* Mid-altitude rolling cumulus-style dense vapor swell */}
        <path
          d="M0,190 Q90,165 200,185 Q320,155 450,180 Q600,150 740,175 Q880,155 1000,180 L1000,400 L0,400 Z"
          fill="url(#venusCloudMid)"
        />

        {/* Foreground dense sulfuric cloud floor */}
        <path
          d="M0,250 Q140,225 300,245 Q460,220 620,245 Q780,220 1000,240 L1000,400 L0,400 Z"
          fill="url(#venusCloudDeep)"
        />
      </svg>

      {/* Aerostat Station Truss Silhouette & Stabilizer Cables */}
      <div className="absolute top-10 left-[8%] flex flex-col items-center opacity-40">
        <div className="w-16 h-8 rounded-full border border-amber-400/60 bg-amber-950/80" />
        <div className="w-[1px] h-32 bg-amber-400/40" />
      </div>
      <div className="absolute top-14 right-[12%] flex flex-col items-center opacity-40">
        <div className="w-20 h-10 rounded-full border border-amber-400/60 bg-amber-950/80" />
        <div className="w-[1px] h-36 bg-amber-400/40" />
      </div>
    </div>
  );
}

// 3. MERCURY: Airless Basalt Horizon with Blazing Solar Corona & Sharp Terminator
function MercuryBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Intense Starfield (Airless vacuum) */}
      <Starfield count={65} className="opacity-90" />

      {/* Blazing Giant Sun Horizon Corona */}
      <div className="absolute top-6 left-1/4 -translate-x-1/2 w-48 h-48 rounded-full bg-amber-500/25 blur-3xl" />
      <div className="absolute top-12 left-1/4 -translate-x-1/2 w-28 h-28 rounded-full bg-yellow-400/40 blur-xl" />
      <div className="absolute top-16 left-1/4 -translate-x-1/2 w-16 h-16 rounded-full bg-white shadow-[0_0_50px_#fde047]" />

      {/* Stark, Airless Jagged Basalt Craters & Sharp Terminator Shadows */}
      <svg className="absolute bottom-0 left-0 w-full h-[55%] min-h-[300px]" viewBox="0 0 1000 350" preserveAspectRatio="none">
        <defs>
          <linearGradient id="mercurySunlit" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="40%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>

        {/* Distant crater rim silhouette */}
        <polygon points="0,170 80,140 160,175 250,130 380,180 490,135 600,165 720,120 850,160 940,135 1000,150 1000,350 0,350" fill="#1e293b" />

        {/* Midground crater wall with stark terminator light */}
        <polygon points="0,210 120,180 220,225 350,170 470,215 580,175 700,220 840,165 1000,210 1000,350 0,350" fill="#334155" />

        {/* Foreground sharp impact crater basin */}
        <path
          d="M0,260 Q180,240 320,270 Q450,230 600,265 Q780,235 1000,260 L1000,350 L0,350 Z"
          fill="#1e2530"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* Crater bowl rims */}
        <ellipse cx="280" cy="275" rx="55" ry="12" fill="#090d16" stroke="#64748b" strokeWidth="1.5" />
        <ellipse cx="720" cy="285" rx="80" ry="16" fill="#090d16" stroke="#64748b" strokeWidth="1.5" />
        <ellipse cx="490" cy="310" rx="35" ry="8" fill="#090d16" stroke="#475569" strokeWidth="1" />
      </svg>
    </div>
  );
}

// 4. MARS: Classic Rust-Red Mesas, Olympus Mons Silhouette, Phobos/Deimos & Dust
function MarsBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#180a04] via-[#5c1d0c] to-[#9a3412]/30">
      <Starfield count={35} className="opacity-60" />

      {/* Phobos & Deimos Moons */}
      <div className="absolute top-12 right-28 w-4 h-3.5 rounded-full bg-[#cbd5e1] opacity-70 shadow-[0_0_8px_rgba(255,255,255,0.4)] rotate-12" />
      <div className="absolute top-8 right-44 w-2 h-1.5 rounded-full bg-[#94a3b8] opacity-50 rotate-45" />

      {/* Olympus Mons & Distant Martian Ridge Silhouette */}
      <svg className="absolute bottom-0 left-0 w-full h-[60%] min-h-[320px]" viewBox="0 0 1000 360" preserveAspectRatio="none">
        <defs>
          <linearGradient id="marsSkyGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="marsForeground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9a3412" />
            <stop offset="100%" stopColor="#431407" />
          </linearGradient>
        </defs>

        {/* Distant Olympus Mons Giant Shield Volcano Shape */}
        <path d="M120,200 Q360,110 600,200 L1000,200 L1000,360 L0,360 L0,200 Z" fill="#581c0c" opacity="0.75" />

        {/* Mid-range jagged canyon mesas */}
        <polygon points="0,210 90,195 180,225 310,185 450,220 560,190 680,230 820,185 930,215 1000,195 1000,360 0,360" fill="#7c2d12" />

        {/* Foreground rolling rusty regolith dunes */}
        <path
          d="M0,265 Q180,240 380,270 Q580,235 780,260 Q890,250 1000,265 L1000,360 L0,360 Z"
          fill="url(#marsForeground)"
        />

        {/* Foreground boulder field */}
        <polygon points="140,295 155,280 170,295" fill="#431407" stroke="#9a3412" strokeWidth="0.5" />
        <polygon points="420,315 435,298 450,315" fill="#431407" stroke="#9a3412" strokeWidth="0.5" />
        <polygon points="810,305 830,290 845,305" fill="#431407" stroke="#9a3412" strokeWidth="0.5" />
      </svg>

      {/* Atmospheric Dust Stream */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-orange-950/60 to-transparent pointer-events-none" />
    </div>
  );
}

// 5. JUPITER: Swirling Banded Belts, Great Red Spot Vortex, Galilean Moons
function JupiterBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#0a0705]">
      <Starfield count={40} className="opacity-60" />

      {/* Galilean Moons in upper sky */}
      {/* Io with volcanic sulfur yellow tint */}
      <div className="absolute top-10 left-[18%] w-5 h-5 rounded-full bg-amber-400 border border-amber-300 shadow-[0_0_12px_#f59e0b]" />
      {/* Europa icy white */}
      <div className="absolute top-14 left-[28%] w-3.5 h-3.5 rounded-full bg-blue-100 border border-cyan-200 shadow-[0_0_8px_#bae6fd]" />

      {/* Banded Gas Giant Clouds Horizon Filling Lower Half */}
      <svg className="absolute bottom-0 left-0 w-full h-[70%] min-h-[380px]" viewBox="0 0 1000 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="jupBelt1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="35%" stopColor="#9a3412" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
          <linearGradient id="jupBelt2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="40%" stopColor="#fed7aa" />
            <stop offset="75%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <radialGradient id="grsGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="60%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#c2410c" />
          </radialGradient>
        </defs>

        {/* Polar Aurora / Atmosphere Transition */}
        <path d="M0,80 Q500,40 1000,80 L1000,420 L0,420 Z" fill="#451a03" opacity="0.6" />

        {/* North Temperate Belt (Cream/Peach) */}
        <path d="M0,110 Q500,75 1000,110 L1000,165 Q500,130 0,165 Z" fill="url(#jupBelt2)" opacity="0.85" />

        {/* North Equatorial Belt (Ochre/Brown) */}
        <path d="M0,160 Q500,128 1000,160 L1000,225 Q500,195 0,225 Z" fill="url(#jupBelt1)" opacity="0.95" />

        {/* Equatorial Zone (Terracotta swirls) */}
        <path d="M0,220 Q500,190 1000,220 L1000,285 Q500,255 0,285 Z" fill="#d97706" opacity="0.75" />

        {/* South Equatorial Belt & The Great Red Spot (GRS) */}
        <path d="M0,280 Q500,250 1000,280 L1000,360 Q500,330 0,360 Z" fill="url(#jupBelt1)" />

        {/* THE GREAT RED SPOT (Iconic anticyclonic vortex) */}
        <ellipse cx="640" cy="305" rx="90" ry="42" fill="url(#grsGradient)" stroke="#f87171" strokeWidth="2" className="shadow-[0_0_20px_#ef4444]" />
        {/* Core storm filaments */}
        <ellipse cx="640" cy="305" rx="50" ry="20" fill="#7f1d1d" opacity="0.9" />
        <ellipse cx="640" cy="305" rx="20" ry="8" fill="#fca5a5" opacity="0.6" />

        {/* South Polar Zone */}
        <path d="M0,355 Q500,325 1000,355 L1000,420 L0,420 Z" fill="#291305" />
      </svg>
    </div>
  );
}

// 6. SATURN: Golden-Ice Ring Arcs Cutting Diagonally Above Pale Cream Ammonia Clouds
function SaturnBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#04060c]">
      <Starfield count={55} className="opacity-75" />

      {/* Saturn Cloud Deck & Majestic Rings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <defs>
          <linearGradient id="saturnAtmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#d97706" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="saturnRingA" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="saturnRingB" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* DIAGONAL RING SYSTEM ARC (Cutting across space from top-left to mid-right) */}
        {/* Outer Ring A */}
        <path d="M -50,150 Q 450,260 1050,10" fill="none" stroke="url(#saturnRingA)" strokeWidth="36" opacity="0.8" />
        {/* Cassini Division (Dark gap) */}
        <path d="M -50,165 Q 450,275 1050,25" fill="none" stroke="#04060c" strokeWidth="6" opacity="0.95" />
        {/* Dense Bright Ring B */}
        <path d="M -50,185 Q 450,295 1050,45" fill="none" stroke="url(#saturnRingB)" strokeWidth="48" opacity="0.9" />
        {/* Ring Shadow across sky */}
        <path d="M -50,215 Q 450,325 1050,75" fill="none" stroke="#000000" strokeWidth="12" opacity="0.7" />

        {/* Pale Cream Ammonia Cloud Belts (Lower Horizon) */}
        <path d="M0,320 Q500,280 1000,320 L1000,600 L0,600 Z" fill="#d97706" opacity="0.5" />
        <path d="M0,360 Q500,330 1000,360 L1000,600 L0,600 Z" fill="#ca8a04" opacity="0.6" />
        <path d="M0,410 Q500,380 1000,410 L1000,600 L0,600 Z" fill="#854d0e" opacity="0.75" />
        <path d="M0,470 Q500,440 1000,470 L1000,600 L0,600 Z" fill="#3f1c04" opacity="0.9" />
      </svg>

      {/* Tiny Crescent Moon Enceladus with Geyser Plume */}
      <div className="absolute top-24 left-[14%] flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-cyan-100 shadow-[0_0_10px_#e0f2fe]" />
        <div className="w-1 h-6 bg-gradient-to-b from-cyan-300/60 to-transparent blur-xs animate-pulse" />
      </div>
    </div>
  );
}

// 7. URANUS: Tilted Cyan-Aquamarine Ice Giant Horizon with Vertical Ring Arcs (98° Tilt)
function UranusBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#02181d] via-[#052b36] to-[#0e7490]/25">
      <Starfield count={45} className="opacity-70" />

      {/* Vertical Ring Arc (98-degree extreme planetary tilt) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600">
        <defs>
          <linearGradient id="uranusVerticalRings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Faint nearly-vertical icy ring sliver */}
        <path d="M 380,-50 Q 420,300 380,650" fill="none" stroke="url(#uranusVerticalRings)" strokeWidth="18" />
        <path d="M 395,-50 Q 435,300 395,650" fill="none" stroke="#a5f3fc" strokeWidth="4" opacity="0.6" />
      </svg>

      {/* Cyan-Aquamarine Methane Atmosphere Lower Horizon */}
      <svg className="absolute bottom-0 left-0 w-full h-[55%] min-h-[300px]" viewBox="0 0 1000 350" preserveAspectRatio="none">
        <defs>
          <linearGradient id="uranusMethaneGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="35%" stopColor="#0891b2" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#083344" stopOpacity="1" />
          </linearGradient>
        </defs>

        <path d="M0,150 Q500,100 1000,150 L1000,350 L0,350 Z" fill="url(#uranusMethaneGradient)" />
        <path d="M0,150 Q500,100 1000,150" fill="none" stroke="#a5f3fc" strokeWidth="2.5" opacity="0.8" />

        {/* Subtle pale icy cirrus streak */}
        <path d="M120,200 Q400,170 880,210" fill="none" stroke="#cffafe" strokeWidth="3" opacity="0.35" />
        <path d="M50,250 Q480,220 950,260" fill="none" stroke="#cffafe" strokeWidth="2" opacity="0.25" />
      </svg>

      {/* Miranda Moon with fractured icy cliff silhouette */}
      <div className="absolute top-12 right-[20%] w-6 h-6 rounded-full bg-slate-300 border border-cyan-300 shadow-[0_0_12px_#67e8f9]" />
    </div>
  );
}

// 8. NEPTUNE: Deep Cobalt-Blue Supersonic Methane Cloud Streaks with Great Dark Spot & Moon Triton
function NeptuneBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#020617] via-[#0c1e4a] to-[#1e40af]/30">
      <Starfield count={50} className="opacity-75" />

      {/* Retrograde Moon Triton in the Sky (Pinkish Nitrogen Frost Glow) */}
      <div className="absolute top-10 right-[15%] flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-[#fce7f3] border border-pink-300 shadow-[0_0_16px_rgba(244,114,182,0.6)]" />
        <span className="text-[8px] text-pink-200/70 uppercase tracking-widest mt-1">Triton</span>
      </div>

      {/* Deep Cobalt Ultramarine Atmosphere with Supersonic Cirrus & Dark Spot Oval */}
      <svg className="absolute bottom-0 left-0 w-full h-[65%] min-h-[350px]" viewBox="0 0 1000 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="neptuneDeep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#1e3a8a" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0a122c" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="neptuneDarkSpot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>
        </defs>

        {/* Main upper atmospheric boundary */}
        <path d="M0,130 Q500,85 1000,130 L1000,400 L0,400 Z" fill="url(#neptuneDeep)" />
        <path d="M0,130 Q500,85 1000,130" fill="none" stroke="#60a5fa" strokeWidth="3" opacity="0.85" />

        {/* GREAT DARK SPOT (Anticyclonic Storm Oval) */}
        <ellipse cx="380" cy="220" rx="75" ry="32" fill="url(#neptuneDarkSpot)" stroke="#3b82f6" strokeWidth="1.5" />
        {/* Bright white companion cirrus smudge (Scooter) */}
        <ellipse cx="440" cy="242" rx="28" ry="9" fill="#ffffff" opacity="0.75" className="blur-[1px]" />

        {/* Supersonic Methane Cloud Streaks (2,100 km/h) */}
        <path d="M40,165 Q350,135 700,170" fill="none" stroke="#93c5fd" strokeWidth="3" opacity="0.6" />
        <path d="M220,185 Q550,155 960,190" fill="none" stroke="#bfdbfe" strokeWidth="4" opacity="0.7" />
        <path d="M80,280 Q480,245 920,285" fill="none" stroke="#93c5fd" strokeWidth="2.5" opacity="0.5" />
      </svg>
    </div>
  );
}

// 9. PLANET X: Pitch-Black Kuiper/Oort Void, Pinpoint Distant Sun, Backlit Limb & Gravitational Lens Arcs
function PlanetXBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Pristine Dense Oort/Kuiper Starfield */}
      <Starfield count={85} className="opacity-95" />

      {/* Pinpoint Distant Sun (Piercing magnitude -18 star) */}
      <div className="absolute top-12 left-[15%] flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_20px_#ffffff]" />
        <div className="absolute w-8 h-[1px] bg-white/70" />
        <div className="absolute h-8 w-[1px] bg-white/70" />
      </div>

      {/* Gravitational Lensing Distorted Light Arcs */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 600">
        <path d="M 460,120 Q 500,100 540,120" fill="none" stroke="#c084fc" strokeWidth="1.5" opacity="0.5" />
        <path d="M 440,240 Q 500,270 560,240" fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.5" />
      </svg>

      {/* Backlit Super-Earth Planetary Body Rising from Deep Space */}
      <svg className="absolute bottom-[-10%] left-[-5%] w-[110%] h-[70%] min-h-[380px]" viewBox="0 0 1000 500" preserveAspectRatio="none">
        <defs>
          <linearGradient id="planetXAtmosphere" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.7" />
            <stop offset="15%" stopColor="#4c1d95" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#1e1b4b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Eerie Backlit Atmospheric Rim Arc */}
        <path d="M0,230 Q500,90 1000,230 L1000,500 L0,500 Z" fill="url(#planetXAtmosphere)" />
        <path d="M0,230 Q500,90 1000,230" fill="none" stroke="#c084fc" strokeWidth="2.5" className="shadow-[0_0_25px_#a855f7]" />
        <path d="M0,232 Q500,92 1000,232" fill="none" stroke="#e879f9" strokeWidth="1" opacity="0.8" />

        {/* Cryo-methane frost dunes in twilight */}
        <path d="M120,290 Q300,270 480,300 Q650,280 820,310 L1000,320 L1000,500 L0,500 Z" fill="#090514" />
      </svg>
    </div>
  );
}

export function MarsView() {
  const { state } = useGame();
  const planetId: PlanetId = state.planetId || 'mars';

  // Render planet-specific bespoke backdrop
  const renderBackdrop = () => {
    switch (planetId) {
      case 'earth':
        return <EarthBackdrop />;
      case 'venus':
        return <VenusBackdrop />;
      case 'mercury':
        return <MercuryBackdrop />;
      case 'mars':
        return <MarsBackdrop />;
      case 'jupiter':
        return <JupiterBackdrop />;
      case 'saturn':
        return <SaturnBackdrop />;
      case 'uranus':
        return <UranusBackdrop />;
      case 'neptune':
        return <NeptuneBackdrop />;
      case 'planet_x':
        return <PlanetXBackdrop />;
      default:
        return <MarsBackdrop />;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {renderBackdrop()}
      {/* Subtle vignette border */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}

export default MarsView;
