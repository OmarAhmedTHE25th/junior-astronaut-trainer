'use client';

import React, { useState } from 'react';
import { useGame } from './GameProvider';
import type { LogEntry } from '@/lib/types';

const changeColor = (val: number) =>
  val > 0 ? 'text-[#22C55E]' : val < 0 ? 'text-[#EF4444]' : 'text-[#F8FAFC]/40';

export default function MissionLog() {
  const { state } = useGame();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const entries = [...state.log].reverse();

  return (
    <aside
      className="w-full lg:w-72 flex flex-col bg-[#0B1026]/80 backdrop-blur-sm
                 rounded-xl border border-white/10 overflow-hidden"
      aria-label="Mission log"
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed((p) => !p)}
        className="flex items-center justify-between p-3 border-b border-white/10
                   hover:bg-white/5 transition-colors cursor-pointer
                   focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#6B3FA0]
                   min-h-[44px]"
        aria-expanded={!isCollapsed}
        aria-controls="mission-log-list"
      >
        <h2 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
          <span aria-hidden="true">📋</span> Mission Log
          <span className="text-xs text-[#F8FAFC]/40 font-normal">
            ({entries.length})
          </span>
        </h2>
        <span
          className={`text-[#F8FAFC]/40 transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Entries */}
      {!isCollapsed && (
        <div
          id="mission-log-list"
          className="flex-1 overflow-y-auto max-h-[300px] lg:max-h-[500px]
                     divide-y divide-white/5"
          role="log"
          aria-live="polite"
        >
          {entries.length === 0 ? (
            <p className="p-4 text-sm text-[#F8FAFC]/40 text-center italic">
              No entries yet. Start your first sol! 🚀
            </p>
          ) : (
            entries.map((entry: LogEntry, i: number) => (
              <div
                key={`${entry.sol}-${i}`}
                className="p-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#E87040] tabular-nums">
                    Sol {entry.sol}
                  </span>
                  <span className="text-sm" aria-hidden="true">
                    {entry.icon || '📝'}
                  </span>
                  <span className="text-sm font-semibold text-[#F8FAFC] truncate">
                    {entry.title}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-xs text-[#F8FAFC]/50 mb-1 line-clamp-2">
                    {entry.description}
                  </p>
                )}
                {entry.resourceChanges && (
                  <div className="flex gap-2 text-xs font-mono">
                    {Object.entries(entry.resourceChanges).map(
                      ([key, val]) => {
                        const num = val as number;
                        if (num === 0) return null;
                        const emoji =
                          key === 'power'
                            ? '⚡'
                            : key === 'oxygen'
                            ? '🫁'
                            : key === 'shielding'
                            ? '🛡️'
                            : '💪';
                        return (
                          <span
                            key={key}
                            className={changeColor(num)}
                          >
                            {emoji}
                            {num > 0 ? '+' : ''}
                            {num}
                          </span>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
