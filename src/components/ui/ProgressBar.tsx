'use client';

import React from 'react';

interface ProgressBarProps {
  value: number;
  label: string;
  icon: string;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  showWarning?: boolean;
}

const colorMap: Record<string, { bar: string; bg: string; glow: string }> = {
  blue: {
    bar: 'bg-gradient-to-r from-[#3B82F6] to-[#60a5fa]',
    bg: 'bg-[#3B82F6]/20',
    glow: 'shadow-[#3B82F6]/50',
  },
  green: {
    bar: 'bg-gradient-to-r from-[#22C55E] to-[#4ade80]',
    bg: 'bg-[#22C55E]/20',
    glow: 'shadow-[#22C55E]/50',
  },
  orange: {
    bar: 'bg-gradient-to-r from-[#E87040] to-[#fb923c]',
    bg: 'bg-[#E87040]/20',
    glow: 'shadow-[#E87040]/50',
  },
  red: {
    bar: 'bg-gradient-to-r from-[#EF4444] to-[#f87171]',
    bg: 'bg-[#EF4444]/20',
    glow: 'shadow-[#EF4444]/50',
  },
  purple: {
    bar: 'bg-gradient-to-r from-[#6B3FA0] to-[#a78bfa]',
    bg: 'bg-[#6B3FA0]/20',
    glow: 'shadow-[#6B3FA0]/50',
  },
};

export default function ProgressBar({
  value,
  label,
  icon,
  color = 'blue',
  showWarning = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const isLow = clamped < 20 && showWarning;
  const colors = colorMap[color];

  return (
    <div
      className="flex items-center gap-2 min-w-[120px]"
      role="meter"
      aria-label={`${label}: ${clamped}%`}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      <div className="flex flex-col flex-1 gap-0.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-[#F8FAFC]/80 uppercase tracking-wide">
            {label}
          </span>
          <span
            className={`text-xs font-bold tabular-nums ${
              isLow ? 'text-[#EF4444]' : 'text-[#F8FAFC]'
            }`}
          >
            {clamped}%
          </span>
        </div>
        <div
          className={`h-3 rounded-full overflow-hidden ${colors.bg}`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out shadow-lg ${
              colors.bar
            } ${colors.glow} ${isLow ? 'animate-pulse' : ''}`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    </div>
  );
}
