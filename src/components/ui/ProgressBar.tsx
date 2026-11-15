'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  label: string;
  icon: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  showWarning?: boolean;
  isGlitching?: boolean;
  displayOverride?: string;
}

const colorMap: Record<string, { bar: string; bg: string; glow: string }> = {
  blue: {
    bar: 'bg-sky-400',
    bg: 'bg-sky-950/60 border border-sky-500/30',
    glow: '',
  },
  green: {
    bar: 'bg-emerald-400',
    bg: 'bg-emerald-950/60 border border-emerald-500/30',
    glow: '',
  },
  orange: {
    bar: 'bg-amber-400',
    bg: 'bg-amber-950/60 border border-amber-500/30',
    glow: '',
  },
  red: {
    bar: 'bg-rose-500',
    bg: 'bg-rose-950/60 border border-rose-500/30',
    glow: '',
  },
  purple: {
    bar: 'bg-cyan-400',
    bg: 'bg-cyan-950/60 border border-cyan-500/30',
    glow: '',
  },
};

export default function ProgressBar({
  value,
  label,
  icon,
  color = 'blue',
  showWarning = true,
  isGlitching = false,
  displayOverride,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const isLow = clamped < 20 && showWarning && !isGlitching;
  const colors = colorMap[color];

  return (
    <div
      className={`flex items-center gap-2 min-w-[120px] ${isGlitching ? 'animate-pulse' : ''}`}
      role="meter"
      aria-label={`${label}: ${isGlitching ? 'SCRAMBLED' : `${clamped}%`}`}
      aria-valuenow={isGlitching ? 50 : clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className={`text-lg ${isGlitching ? 'filter invert animate-spin' : ''}`} aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col flex-1 gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-[#F8FAFC]/80 uppercase tracking-wide">
            {label}
          </span>
          <span
            className={`text-xs font-bold font-mono tabular-nums ${
              isGlitching
                ? 'text-purple-400 font-extrabold tracking-widest'
                : isLow
                ? 'text-[#EF4444]'
                : 'text-[#F8FAFC]'
            }`}
          >
            {isGlitching ? displayOverride || '??%' : `${clamped}%`}
          </span>
        </div>
        <div
          className={`h-3 rounded-full overflow-hidden ${isGlitching ? 'bg-purple-950/60 ring-1 ring-purple-500/50' : colors.bg}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isGlitching
                ? 'bg-purple-500 animate-pulse'
                : colors.bar
            } ${colors.glow} ${isLow ? 'animate-pulse' : ''}`}
            style={{ width: `${isGlitching ? 60 : clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
