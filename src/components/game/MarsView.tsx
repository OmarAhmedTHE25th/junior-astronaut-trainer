'use client';

import React from 'react';
import { useGame } from './GameProvider';
import { getPlanetCartridge, type PlanetId } from '@/lib/planetCartridges';

interface PlanetVisualConfig {
  skyGradient: string;
  mountainFill: string;
  nearFill: string;
  groundFill: string;
  celestialElement?: React.ReactNode;
}

const PLANET_VISUALS: Record<PlanetId, PlanetVisualConfig> = {
  mars: {
    skyGradient: 'bg-gradient-to-b from-[#1a0a00] via-[#8B3A0A] to-[#E87040]/30',
    mountainFill: '#6B3320',
    nearFill: '#8B4513',
    groundFill: '#A0522D',
  },
  earth: {
    skyGradient: 'bg-gradient-to-b from-[#020617] via-[#0c4a6e] to-[#0284c7]/25',
    mountainFill: '#0f172a',
    nearFill: '#1e293b',
    groundFill: '#334155',
    celestialElement: (
      <div className="absolute top-10 right-16 w-24 h-24 rounded-full bg-blue-500/20 border border-blue-400/30 shadow-[0_0_30px_rgba(56,189,248,0.4)] flex items-center justify-center">
        <span className="text-3xl">🌍</span>
      </div>
    ),
  },
  venus: {
    skyGradient: 'bg-gradient-to-b from-[#1c1902] via-[#854d0e] to-[#eab308]/20',
    mountainFill: '#422006',
    nearFill: '#713f12',
    groundFill: '#a16207',
    celestialElement: (
      <div className="absolute top-8 left-1/3 w-32 h-16 rounded-full bg-yellow-400/10 blur-xl animate-pulse" />
    ),
  },
  mercury: {
    skyGradient: 'bg-gradient-to-b from-[#000000] via-[#1c1917] to-[#ea580c]/25',
    mountainFill: '#1c1917',
    nearFill: '#292524',
    groundFill: '#44403c',
    celestialElement: (
      <div className="absolute top-6 left-12 w-28 h-28 rounded-full bg-amber-500/30 blur-2xl animate-pulse" />
    ),
  },
  jupiter: {
    skyGradient: 'bg-gradient-to-b from-[#1c0c04] via-[#78350f] to-[#f59e0b]/25',
    mountainFill: '#78350f',
    nearFill: '#92400e',
    groundFill: '#b45309',
    celestialElement: (
      <div className="absolute top-4 right-12 w-48 h-48 rounded-full bg-gradient-to-r from-amber-600/30 via-orange-500/30 to-amber-700/30 blur-sm border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.2)] flex items-center justify-center">
        <div className="w-12 h-8 rounded-full bg-rose-600/50 blur-[2px]" title="Great Red Spot" />
      </div>
    ),
  },
  saturn: {
    skyGradient: 'bg-gradient-to-b from-[#1c1404] via-[#713f12] to-[#fde047]/20',
    mountainFill: '#713f12',
    nearFill: '#854d0e',
    groundFill: '#a16207',
    celestialElement: (
      <div className="absolute top-8 left-16 w-56 h-28 flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 rounded-full bg-amber-400/20 border border-amber-300/30" />
        <div className="absolute w-56 h-12 rounded-[100%] border-4 border-amber-300/40 [transform:rotate(-20deg)]" />
      </div>
    ),
  },
  uranus: {
    skyGradient: 'bg-gradient-to-b from-[#02181e] via-[#0e7490] to-[#06b6d4]/25',
    mountainFill: '#155e75',
    nearFill: '#0e7490',
    groundFill: '#0891b2',
    celestialElement: (
      <div className="absolute top-8 right-20 w-32 h-32 rounded-full bg-cyan-400/15 border border-cyan-300/30 blur-sm shadow-[0_0_25px_rgba(6,182,212,0.3)]" />
    ),
  },
  neptune: {
    skyGradient: 'bg-gradient-to-b from-[#03071e] via-[#1e3a8a] to-[#3b82f6]/25',
    mountainFill: '#1e3a8a',
    nearFill: '#1d4ed8',
    groundFill: '#2563eb',
    celestialElement: (
      <div className="absolute top-10 left-20 w-36 h-36 rounded-full bg-blue-600/25 border border-blue-400/40 shadow-[0_0_35px_rgba(59,130,246,0.35)]" />
    ),
  },
  planet_x: {
    skyGradient: 'bg-gradient-to-b from-[#090014] via-[#3b0764] to-[#a855f7]/25',
    mountainFill: '#2e1065',
    nearFill: '#4c1d95',
    groundFill: '#581c87',
    celestialElement: (
      <div className="absolute top-6 right-24 w-32 h-32 rounded-full bg-fuchsia-600/30 border-2 border-fuchsia-400/60 shadow-[0_0_50px_rgba(168,85,247,0.5)] animate-pulse flex items-center justify-center">
        <span className="text-2xl animate-spin">🌀</span>
      </div>
    ),
  },
};

export default function MarsView() {
  const { state } = useGame();
  const planetId = state.planetId || 'mars';
  const visual = PLANET_VISUALS[planetId] || PLANET_VISUALS.mars;
  const powerLevel = state.power;
  const shieldLevel = state.shielding;

  const domeGlow = shieldLevel > 60;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Dynamic Sky gradient */}
      <div className={`absolute inset-0 ${visual.skyGradient}`} />

      {/* Celestial body */}
      {visual.celestialElement}

      {/* Stars */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 50 }, (_, i) => (
          <circle
            key={i}
            cx={`${(i * 37 + 13) % 100}%`}
            cy={`${(i * 23 + 7) % 45}%`}
            r={Math.random() > 0.7 ? 1.5 : 0.8}
            fill="#F8FAFC"
            opacity={0.3 + Math.random() * 0.5}
          >
            <animate
              attributeName="opacity"
              values={`${0.2 + Math.random() * 0.3};${0.6 + Math.random() * 0.4};${0.2 + Math.random() * 0.3}`}
              dur={`${2 + Math.random() * 4}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* Terrain */}
      <svg
        className="absolute bottom-0 w-full h-[45%]"
        viewBox="0 0 1200 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Far mountains */}
        <path
          d="M0 250 L100 180 L200 220 L350 140 L500 200 L650 120 L800 190 L950 150 L1100 210 L1200 170 L1200 400 L0 400Z"
          fill={visual.mountainFill}
          opacity="0.7"
        />
        {/* Near terrain */}
        <path
          d="M0 320 L100 290 L250 310 L400 280 L550 300 L700 270 L850 295 L1000 275 L1150 300 L1200 285 L1200 400 L0 400Z"
          fill={visual.nearFill}
        />
        {/* Ground */}
        <path
          d="M0 350 L200 340 L400 355 L600 345 L800 350 L1000 340 L1200 348 L1200 400 L0 400Z"
          fill={visual.groundFill}
        />
      </svg>

      {/* Habitat Dome */}
      <svg
        className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[200px] h-[140px]"
        viewBox="0 0 200 140"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dome glow */}
        {domeGlow && (
          <ellipse
            cx="100"
            cy="100"
            rx="80"
            ry="60"
            fill="#22C55E"
            opacity="0.15"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.2;0.1"
              dur="3s"
              repeatCount="indefinite"
            />
          </ellipse>
        )}
        {/* Dome body */}
        <path
          d="M30 110 Q30 30 100 20 Q170 30 170 110 Z"
          fill="#374151"
          stroke="#6B7280"
          strokeWidth="2"
          opacity="0.9"
        />
        {/* Dome grid lines */}
        <line x1="100" y1="20" x2="100" y2="110" stroke="#4B5563" strokeWidth="1" />
        <line x1="55" y1="40" x2="65" y2="110" stroke="#4B5563" strokeWidth="1" />
        <line x1="145" y1="40" x2="135" y2="110" stroke="#4B5563" strokeWidth="1" />
        <path d="M45 70 Q100 55 155 70" fill="none" stroke="#4B5563" strokeWidth="1" />
        {/* Airlock door */}
        <rect x="90" y="85" width="20" height="25" rx="3" fill="#1F2937" stroke="#9CA3AF" strokeWidth="1" />
        <circle cx="95" cy="97" r="1.5" fill="#22C55E" />
      </svg>

      {/* Solar Panels (left) */}
      <svg
        className="absolute bottom-[12%] left-[15%] w-[100px] h-[80px]"
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: Math.max(0.2, powerLevel / 100) }}
      >
        <rect x="47" y="30" width="6" height="35" fill="#6B7280" />
        <rect x="5" y="10" width="40" height="28" rx="2" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" transform="rotate(-10, 25, 24)" />
        <rect x="55" y="10" width="40" height="28" rx="2" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" transform="rotate(-10, 75, 24)" />
        <rect x="35" y="62" width="30" height="5" rx="2" fill="#4B5563" />
      </svg>

      {/* Solar Panels (right) */}
      <svg
        className="absolute bottom-[12%] right-[15%] w-[100px] h-[80px]"
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: Math.max(0.2, powerLevel / 100) }}
      >
        <rect x="47" y="30" width="6" height="35" fill="#6B7280" />
        <rect x="5" y="10" width="40" height="28" rx="2" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" transform="rotate(10, 25, 24)" />
        <rect x="55" y="10" width="40" height="28" rx="2" fill="#1e3a5f" stroke="#3B82F6" strokeWidth="1" transform="rotate(10, 75, 24)" />
        <rect x="35" y="62" width="30" height="5" rx="2" fill="#4B5563" />
      </svg>

      {/* Antenna */}
      <svg
        className="absolute bottom-[18%] right-[30%] w-[40px] h-[90px]"
        viewBox="0 0 40 90"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="18" y="20" width="4" height="60" fill="#9CA3AF" />
        <path d="M5 25 Q20 5 35 25" fill="none" stroke="#D1D5DB" strokeWidth="2" />
        <circle cx="20" cy="20" r="3" fill="#EF4444">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <rect x="10" y="78" width="20" height="4" rx="2" fill="#4B5563" />
      </svg>

      {/* Subtle dust overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
