'use client';

import React, { useState, useEffect } from 'react';
import type { RivalTelemetryUpdate } from '@/lib/tournamentTypes';

interface RivalTelemetryBarProps {
  tournamentId: string;
  matchId: string;
  entrantId: string;
  currentSol: number;
  rivalName?: string;
  rivalAvatar?: string;
}

export default function RivalTelemetryBar({
  tournamentId,
  matchId,
  entrantId,
  currentSol,
  rivalName = 'Rival Cadet',
  rivalAvatar = '🤖',
}: RivalTelemetryBarProps) {
  const [rival, setRival] = useState<RivalTelemetryUpdate | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRivalTelemetry = async () => {
      try {
        const res = await fetch(
          `/api/tournaments/${tournamentId}/rival?matchId=${matchId}&entrantId=${entrantId}&sol=${currentSol}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.rival && isMounted) {
          setRival(data.rival);
        }
      } catch {}
    };

    fetchRivalTelemetry();
    const interval = setInterval(fetchRivalTelemetry, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [tournamentId, matchId, entrantId, currentSol]);

  return (
    <div className="w-full bg-[#101432]/95 border-b border-amber-500/40 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-lg backdrop-blur-md">
      {/* Tournament Match Identifier */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
        <span className="font-heading font-extrabold text-amber-300 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
          <span>🏆 ENDLESS BRACKET HEAT</span>
          <span className="hidden sm:inline text-white/40">•</span>
          <span className="hidden sm:inline text-[11px] font-normal text-white/70">
            Sudden-Death Endurance
          </span>
        </span>
      </div>

      {/* Synchronized Rival Telemetry Comparison */}
      <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
        <div className="flex items-center gap-2 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
          <span className="text-base">{rival?.rivalAvatar || rivalAvatar}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-[11px]">
                {rival?.rivalName || rivalName}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  rival?.isAlive !== false
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {rival?.isAlive !== false ? `Sol ${rival?.sol ?? currentSol}` : 'Eliminated'}
              </span>
            </div>
            <p className="text-[10px] text-white/60 truncate max-w-[200px] sm:max-w-[260px]">
              {rival?.statusText || 'Synchronizing rival telemetry...'}
            </p>
          </div>
        </div>

        {/* Rival Vital Telemetry Meters */}
        {rival && rival.isAlive && (
          <div className="hidden md:flex items-center gap-3 text-[11px]">
            <span title="Rival Power" className="text-amber-300">
              ⚡ {rival.power}%
            </span>
            <span title="Rival Oxygen" className="text-cyan-300">
              🫁 {rival.oxygen}%
            </span>
            <span title="Rival Shielding" className="text-purple-300">
              🛡️ {rival.shielding}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
