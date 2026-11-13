'use client';

import React from 'react';
import { useGame } from './GameProvider';

export default function MarsView() {
  const { state } = useGame();
  const powerLevel = state.power;
  const shieldLevel = state.shielding;

  // Reactivity: panels dim when power low, dome glows when shielding high
  const panelOpacity = Math.max(0.2, powerLevel / 100);
  const domeGlow = shieldLevel > 60;

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a00] via-[#8B3A0A] to-[#E87040]/30" />

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
          fill="#6B3320"
          opacity="0.7"
        />
        {/* Near terrain */}
        <path
          d="M0 320 L100 290 L250 310 L400 280 L550 300 L700 270 L850 295 L1000 275 L1150 300 L1200 285 L1200 400 L0 400Z"
          fill="#8B4513"
        />
        {/* Ground */}
        <path
          d="M0 350 L200 340 L400 355 L600 345 L800 350 L1000 340 L1200 348 L1200 400 L0 400Z"
          fill="#A0522D"
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
        {/* Dome panels */}
        <path
          d="M60 110 Q60 55 100 45 Q140 55 140 110"
          fill="none"
          stroke="#9CA3AF"
          strokeWidth="1"
          opacity="0.5"
        />
        <line x1="100" y1="20" x2="100" y2="110" stroke="#9CA3AF" strokeWidth="1" opacity="0.4" />
        {/* Door */}
        <rect x="88" y="85" width="24" height="25" rx="3" fill="#6B3FA0" opacity="0.7" />
        {/* Window light */}
        <circle cx="100" cy="60" r="10" fill="#3B82F6" opacity="0.4">
          <animate
            attributeName="opacity"
            values="0.3;0.5;0.3"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
        {/* Base */}
        <rect x="20" y="108" width="160" height="8" rx="2" fill="#4B5563" />
      </svg>

      {/* Solar Panels (left) */}
      <svg
        className="absolute bottom-[12%] left-[15%] w-[100px] h-[80px]"
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: panelOpacity }}
      >
        {/* Support post */}
        <rect x="47" y="30" width="6" height="35" fill="#6B7280" />
        {/* Panel left */}
        <rect
          x="5"
          y="10"
          width="40"
          height="28"
          rx="2"
          fill="#1e3a5f"
          stroke="#3B82F6"
          strokeWidth="1"
          transform="rotate(-10, 25, 24)"
        />
        {/* Panel right */}
        <rect
          x="55"
          y="10"
          width="40"
          height="28"
          rx="2"
          fill="#1e3a5f"
          stroke="#3B82F6"
          strokeWidth="1"
          transform="rotate(-10, 75, 24)"
        />
        {/* Grid lines */}
        <line x1="25" y1="10" x2="25" y2="38" stroke="#3B82F6" strokeWidth="0.5" opacity="0.5" transform="rotate(-10, 25, 24)" />
        <line x1="75" y1="10" x2="75" y2="38" stroke="#3B82F6" strokeWidth="0.5" opacity="0.5" transform="rotate(-10, 75, 24)" />
        {/* Power glow when high */}
        {powerLevel > 60 && (
          <circle cx="50" cy="24" r="20" fill="#3B82F6" opacity="0.1">
            <animate attributeName="opacity" values="0.05;0.15;0.05" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        {/* Base */}
        <rect x="35" y="62" width="30" height="5" rx="2" fill="#4B5563" />
      </svg>

      {/* Solar Panels (right) */}
      <svg
        className="absolute bottom-[12%] right-[15%] w-[100px] h-[80px]"
        viewBox="0 0 100 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: panelOpacity }}
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
        {/* Pole */}
        <rect x="18" y="20" width="4" height="60" fill="#9CA3AF" />
        {/* Dish */}
        <path d="M5 25 Q20 5 35 25" fill="none" stroke="#D1D5DB" strokeWidth="2" />
        <circle cx="20" cy="20" r="3" fill="#EF4444">
          <animate
            attributeName="opacity"
            values="1;0.3;1"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        {/* Base */}
        <rect x="10" y="78" width="20" height="4" rx="2" fill="#4B5563" />
      </svg>

      {/* Subtle dust overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-gradient-to-t from-[#A0522D]/20 to-transparent" />
    </div>
  );
}
