'use client';

import React, { useState } from 'react';
import type { TelemetryPoint } from '@/lib/types';
import { playClick } from '@/lib/sound';

interface TelemetryChartProps {
  history: TelemetryPoint[];
  maxSol?: number;
}

type ActiveSeries = 'ALL' | 'POWER' | 'O2' | 'SHIELDS' | 'MORALE';

export default function TelemetryChart({ history, maxSol = 30 }: TelemetryChartProps) {
  const [activeSeries, setActiveSeries] = useState<ActiveSeries>('ALL');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!history || history.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center font-mono text-xs text-white/50">
        NO TELEMETRY RECORDED YET (SOL 1 PENDING)
      </div>
    );
  }

  // Dimensions
  const svgWidth = 640;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  // X coordinate mapper: sol (1 to maxSol) -> pixel
  const getX = (sol: number) => {
    const totalSols = Math.max(history.length, Math.min(maxSol, 30));
    if (totalSols <= 1) return padLeft + chartWidth / 2;
    return padLeft + ((sol - 1) / (totalSols - 1)) * chartWidth;
  };

  // Y coordinate mapper: value (0 to 100) -> pixel
  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padTop + (1 - clamped / 100) * chartHeight;
  };

  // Generate SVG path polyline
  const makePath = (key: 'power' | 'oxygen' | 'shielding' | 'morale') => {
    return history
      .map((pt, idx) => {
        const x = getX(pt.sol);
        const y = getY(pt[key]);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const criticalY = getY(20);

  const hoveredPoint = hoveredIndex !== null && history[hoveredIndex] ? history[hoveredIndex] : null;

  return (
    <div className="w-full bg-[#0B1026]/90 rounded-2xl border border-white/10 p-4 space-y-3 font-mono">
      {/* Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">📈</span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Telemetry Curve &amp; Mission Diagnostics
          </span>
          <span className="text-[10px] text-white/40">
            ({history.length} Sols Recorded)
          </span>
        </div>

        {/* Series Filter Pills */}
        <div className="flex items-center gap-1">
          {(['ALL', 'POWER', 'O2', 'SHIELDS', 'MORALE'] as ActiveSeries[]).map((series) => {
            const isSelected = activeSeries === series;
            return (
              <button
                key={series}
                type="button"
                onClick={() => {
                  playClick();
                  setActiveSeries(series);
                }}
                className={`
                  px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer
                  ${
                    isSelected
                      ? 'bg-white/20 text-white border border-white/40 shadow-sm'
                      : 'bg-white/5 text-white/50 border border-white/5 hover:text-white/80'
                  }
                `}
              >
                {series}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart Console */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
        >
          {/* Horizontal Gridlines (0, 20, 50, 80, 100%) */}
          {[0, 20, 50, 80, 100].map((val) => {
            const y = getY(val);
            const isCrit = val === 20;
            return (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={isCrit ? '#EF4444' : 'rgba(255, 255, 255, 0.08)'}
                  strokeDasharray={isCrit ? '4 3' : undefined}
                  strokeWidth={isCrit ? 1.5 : 1}
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill={isCrit ? '#EF4444' : 'rgba(255, 255, 255, 0.4)'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Critical Threshold Danger Label */}
          <text
            x={svgWidth - padRight - 4}
            y={criticalY - 4}
            textAnchor="end"
            fill="#EF4444"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
          >
            CRITICAL LIMIT (20%)
          </text>

          {/* Crisis Hazard Event Markers (Vertical Red/Orange Lines) */}
          {history.map((pt, idx) => {
            if (!pt.eventTitle) return null;
            const x = getX(pt.sol);
            return (
              <g key={`hazard-${idx}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartHeight}
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={x}
                  cy={padTop + 4}
                  r="3.5"
                  fill="#F59E0B"
                />
                <text
                  x={x}
                  y={padTop - 4}
                  textAnchor="middle"
                  fill="#F59E0B"
                  fontSize="8"
                  fontWeight="bold"
                >
                  ⚠️
                </text>
              </g>
            );
          })}

          {/* Data Series Curves */}
          {/* Power (Amber) */}
          {(activeSeries === 'ALL' || activeSeries === 'POWER') && (
            <path
              d={makePath('power')}
              fill="none"
              stroke="#E87040"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Oxygen (Cyan) */}
          {(activeSeries === 'ALL' || activeSeries === 'O2') && (
            <path
              d={makePath('oxygen')}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Shielding (Emerald) */}
          {(activeSeries === 'ALL' || activeSeries === 'SHIELDS') && (
            <path
              d={makePath('shielding')}
              fill="none"
              stroke="#22C55E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Morale (Purple) */}
          {(activeSeries === 'ALL' || activeSeries === 'MORALE') && (
            <path
              d={makePath('morale')}
              fill="none"
              stroke="#A855F7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Sol Column Overlays & Hover Targets */}
          {history.map((pt, idx) => {
            const x = getX(pt.sol);
            const isHovered = hoveredIndex === idx;
            return (
              <g
                key={`sol-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible wide hover column */}
                <rect
                  x={x - chartWidth / (history.length * 2)}
                  y={padTop}
                  width={chartWidth / Math.max(1, history.length)}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Vertical cursor guide when hovered */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padTop}
                    x2={x}
                    y2={padTop + chartHeight}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                  />
                )}

                {/* X Axis Sol Labels (every few sols) */}
                {(history.length <= 10 || pt.sol === 1 || pt.sol % 5 === 0 || pt.sol === history.length) && (
                  <text
                    x={x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill={isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight={isHovered ? 'bold' : 'normal'}
                  >
                    S{pt.sol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#E87040]" />
            <span className="text-amber-200">Power</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#38BDF8]" />
            <span className="text-cyan-200">Oxygen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#22C55E]" />
            <span className="text-emerald-200">Shielding</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-[#A855F7]" />
            <span className="text-purple-200">Morale</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40">
            <span>⚠️ Crisis Event Sol</span>
          </div>
        </div>

        {/* Hover Telemetry Diagnostics Inspector Tooltip */}
        {hoveredPoint && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-black/80 border border-white/20 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#E87040] font-bold">SOL {hoveredPoint.sol}:</span>
              <span>⚡ Power: <strong className="text-amber-300">{hoveredPoint.power}%</strong></span>
              <span>🫁 O₂: <strong className="text-cyan-300">{hoveredPoint.oxygen}%</strong></span>
              <span>🛡️ Shield: <strong className="text-emerald-300">{hoveredPoint.shielding}%</strong></span>
              <span>😊 Morale: <strong className="text-purple-300">{hoveredPoint.morale}%</strong></span>
            </div>
            {hoveredPoint.eventTitle && (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <span>⚠️</span> {hoveredPoint.eventTitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
