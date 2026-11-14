'use client';

import React, { useState, useEffect } from 'react';
import type { LiveSpaceWeatherEvent } from '@/lib/types';
import { playClick } from '@/lib/sound';

export default function LiveTelemetryTicker() {
  const [events, setEvents] = useState<LiveSpaceWeatherEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<LiveSpaceWeatherEvent | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadTelemetry() {
      try {
        const res = await fetch('/api/nasa-live');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.events && data.events.length > 0) {
            setEvents(data.events);
            setIsLive(Boolean(data.isLive));
          }
        }
      } catch (err) {
        console.warn('Failed to load NASA live telemetry feed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading && events.length === 0) {
    return (
      <div className="w-full bg-[#070b1a]/95 border-b border-white/10 px-3 py-1.5 flex items-center justify-between text-xs text-white/50 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>INITIALIZING NASA DSN &amp; DONKI TELEMETRY LINK...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <>
      <div
        className="w-full bg-[#070b1a]/95 backdrop-blur-md border-b border-white/10 px-3 py-1.5 flex items-center justify-between gap-3 text-xs font-mono relative z-40 overflow-hidden"
        role="region"
        aria-label="NASA Space Weather Live Telemetry"
      >
        {/* Status Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? 'bg-[#22C55E] animate-ping' : 'bg-amber-400'
            }`}
          />
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
              isLive
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30'
                : 'bg-amber-400/15 text-amber-300 border-amber-400/30'
            }`}
          >
            {isLive ? 'LIVE NASA DONKI FEED' : 'OFFLINE TELEMETRY CACHE'}
          </span>
          <span className="hidden md:inline-block text-[#F8FAFC]/40 text-[11px]">
            INTERPLANETARY SPACE WEATHER:
          </span>
        </div>

        {/* Horizontal Marquee / Event Badges */}
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3 py-0.5">
          {events.map((evt) => {
            const timeStr = evt.peakTime
              ? new Date(evt.peakTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                }) + ' UTC'
              : 'RECENT';

            return (
              <button
                key={evt.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedEvent(evt);
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono whitespace-nowrap
                  transition-all hover:scale-105 cursor-pointer flex-shrink-0
                  ${
                    evt.type === 'FLARE'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-200 hover:bg-blue-500/20'
                  }
                `}
                title="Click for NASA DONKI radiation diagnostics"
              >
                <span>{evt.type === 'FLARE' ? '☀️' : '🌊'}</span>
                <strong>{evt.classType}</strong>
                <span className="text-white/50">•</span>
                <span className="text-white/70">{evt.sourceLocation}</span>
                <span className="text-white/40">[{timeStr}]</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-white/40 flex-shrink-0">
          <span>NOAA/CCMC SYNC</span>
        </div>
      </div>

      {/* Telemetry Detail Popover Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-md bg-[#0F172A] border-2 border-amber-400/40 rounded-2xl p-5 shadow-2xl text-left space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedEvent.type === 'FLARE' ? '☀️' : '🌊'}</span>
                <div>
                  <h4 className="font-heading font-extrabold text-sm text-white">
                    NASA DONKI Space Weather Alert
                  </h4>
                  <span className="text-[10px] font-mono text-amber-300">
                    ID: {selectedEvent.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-white/50 hover:text-white text-lg p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Event Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/40 block text-[10px]">EVENT CLASSIFICATION:</span>
                <span className="font-bold text-amber-300 text-sm">
                  {selectedEvent.classType}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/40 block text-[10px]">SOLAR INTENSITY:</span>
                <span className="font-bold text-[#E87040] text-sm">
                  {selectedEvent.intensity} / 10
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/40 block text-[10px]">SOURCE ORIGIN:</span>
                <span className="text-white text-xs">{selectedEvent.sourceLocation}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/40 block text-[10px]">PEAK DETECTION:</span>
                <span className="text-white text-xs">
                  {new Date(selectedEvent.peakTime).toUTCString()}
                </span>
              </div>
            </div>

            {/* Scientific Summary */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 leading-relaxed">
              <span className="text-[10px] font-mono font-bold text-white/40 block mb-1 uppercase">
                Observational Summary:
              </span>
              <p>{selectedEvent.summary}</p>
            </div>

            {/* Radiation Impact Warning */}
            {selectedEvent.radiationImpact && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">
                  ⚡ Mars Mission Impact Assessment:
                </span>
                <p className="font-mono text-[11px]">{selectedEvent.radiationImpact}</p>
              </div>
            )}

            {/* Footer Links & Close */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <a
                href={selectedEvent.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3B82F6] hover:underline font-mono flex items-center gap-1"
              >
                <span>🔗</span> View on NASA DONKI
              </a>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
