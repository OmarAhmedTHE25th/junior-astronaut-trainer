'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { LandingSiteId } from '@/lib/types';
import { LANDING_SITES } from '@/lib/constants';
import { playClick } from '@/lib/sound';

interface MarsGlobeSelectorProps {
  selectedSite: LandingSiteId;
  onSelectSite: (siteId: LandingSiteId) => void;
}

export default function MarsGlobeSelector({
  selectedSite,
  onSelectSite,
}: MarsGlobeSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Rotation angles (radians)
  const rotYRef = useRef<number>(-LANDING_SITES[selectedSite].lon * (Math.PI / 180));
  const rotXRef = useRef<number>(0.25);
  const targetRotYRef = useRef<number | null>(null);
  const targetRotXRef = useRef<number | null>(null);

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isInteractingRef = useRef(false);

  const [activeSiteInfo, setActiveSiteInfo] = useState(LANDING_SITES[selectedSite]);

  // Center on site coordinates smoothly
  const focusOnSite = useCallback((siteId: LandingSiteId) => {
    const site = LANDING_SITES[siteId];
    setActiveSiteInfo(site);
    onSelectSite(siteId);

    // Calculate target rotation so site faces viewer directly (lat, lon)
    // Front face is lon + rotY = 0 => rotY = -lon
    targetRotYRef.current = -site.lon * (Math.PI / 180);
    targetRotXRef.current = site.lat * (Math.PI / 180) * 0.7; // slight perspective tilt
  }, [onSelectSite]);

  useEffect(() => {
    setActiveSiteInfo(LANDING_SITES[selectedSite]);
  }, [selectedSite]);

  // Animation & 3D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.36;

      // Handle smooth easing to target rotation
      if (targetRotYRef.current !== null && targetRotXRef.current !== null) {
        let diffY = targetRotYRef.current - rotYRef.current;
        // Normalize angle difference to -PI to PI
        while (diffY < -Math.PI) diffY += Math.PI * 2;
        while (diffY > Math.PI) diffY -= Math.PI * 2;

        rotYRef.current += diffY * 0.08;
        rotXRef.current += (targetRotXRef.current - rotXRef.current) * 0.08;

        if (Math.abs(diffY) < 0.005 && Math.abs(targetRotXRef.current - rotXRef.current) < 0.005) {
          rotYRef.current = targetRotYRef.current;
          rotXRef.current = targetRotXRef.current;
          targetRotYRef.current = null;
          targetRotXRef.current = null;
        }
      } else if (!isDraggingRef.current && !isInteractingRef.current) {
        // Slow planetary auto-rotation
        rotYRef.current += 0.003;
      }

      ctx.clearRect(0, 0, width, height);

      // ── Outer Atmospheric Rim Glow ──
      const atmGlow = ctx.createRadialGradient(
        centerX, centerY, radius * 0.95,
        centerX, centerY, radius * 1.25
      );
      atmGlow.addColorStop(0, 'rgba(232, 112, 64, 0.45)');
      atmGlow.addColorStop(0.35, 'rgba(107, 63, 160, 0.25)');
      atmGlow.addColorStop(0.7, 'rgba(56, 189, 248, 0.12)');
      atmGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = atmGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // ── Mars Base Globe Clipping ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();

      // Base Martian Rust & Basalt Shading
      const sunX = centerX - radius * 0.45;
      const sunY = centerY - radius * 0.45;
      const marsGradient = ctx.createRadialGradient(
        sunX, sunY, radius * 0.1,
        centerX, centerY, radius
      );
      marsGradient.addColorStop(0, '#E76F51'); // bright sunlit ochre
      marsGradient.addColorStop(0.35, '#C1440E'); // deep martian rust
      marsGradient.addColorStop(0.7, '#78281F'); // highland terrain
      marsGradient.addColorStop(1, '#1A0808'); // dark shadow terminator

      ctx.fillStyle = marsGradient;
      ctx.fillRect(0, 0, width, height);

      // ── 3D Projection Helpers ──
      const project3D = (latDeg: number, lonDeg: number) => {
        const phi = (latDeg * Math.PI) / 180;
        const lambda = (lonDeg * Math.PI) / 180 + rotYRef.current;

        // Spherical to 3D Cartesian
        const x0 = radius * Math.cos(phi) * Math.sin(lambda);
        const y0 = -radius * Math.sin(phi);
        const z0 = radius * Math.cos(phi) * Math.cos(lambda);

        // Pitch tilt (rotX)
        const cosX = Math.cos(rotXRef.current);
        const sinX = Math.sin(rotXRef.current);

        const x = x0;
        const y = y0 * cosX - z0 * sinX;
        const z = y0 * sinX + z0 * cosX;

        return {
          screenX: centerX + x,
          screenY: centerY + y,
          visible: z > 0,
          depth: z / radius,
        };
      };

      // ── Procedural Martian Surface Features (Dark Basalt Patches) ──
      // Feature 1: Syrtis Major Planum (Basalt volcanic shield)
      const syrtis = project3D(9.2, 70.0);
      if (syrtis.visible) {
        ctx.fillStyle = `rgba(35, 15, 15, ${Math.max(0.2, syrtis.depth * 0.6)})`;
        ctx.beginPath();
        ctx.ellipse(syrtis.screenX, syrtis.screenY, radius * 0.28, radius * 0.2, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Feature 2: Valles Marineris Canyon System
      const valles1 = project3D(-14.0, 280.0);
      const valles2 = project3D(-14.0, 310.0);
      if (valles1.visible || valles2.visible) {
        ctx.strokeStyle = 'rgba(40, 15, 10, 0.55)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(valles1.screenX, valles1.screenY);
        ctx.lineTo(valles2.screenX, valles2.screenY);
        ctx.stroke();
      }

      // Feature 3: Olympus Mons Volcano Caldera Outline
      const olympusCoord = project3D(18.65, 226.2);
      if (olympusCoord.visible) {
        ctx.strokeStyle = `rgba(255, 180, 130, ${Math.max(0.2, olympusCoord.depth * 0.7)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(olympusCoord.screenX, olympusCoord.screenY, radius * 0.16, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── Latitude & Longitude Graticule Lines ──
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;

      // Longitude meridians (every 45 degrees)
      for (let lon = 0; lon < 360; lon += 45) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 10) {
          const pt = project3D(lat, lon);
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.screenX, pt.screenY);
              started = true;
            } else {
              ctx.lineTo(pt.screenX, pt.screenY);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Latitude parallels (Equator and +/- 30, 60 deg)
      for (const lat of [-60, -30, 0, 30, 60]) {
        ctx.beginPath();
        let started = false;
        for (let lon = 0; lon <= 360; lon += 10) {
          const pt = project3D(lat, lon);
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.screenX, pt.screenY);
              started = true;
            } else {
              ctx.lineTo(pt.screenX, pt.screenY);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // ── Polar Ice Cap (Planum Boreum - North Pole) ──
      const northPole = project3D(82, 0);
      if (northPole.visible) {
        const iceGrad = ctx.createRadialGradient(
          northPole.screenX, northPole.screenY, 0,
          northPole.screenX, northPole.screenY, radius * 0.28
        );
        iceGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        iceGrad.addColorStop(0.6, 'rgba(220, 240, 255, 0.8)');
        iceGrad.addColorStop(1, 'rgba(220, 240, 255, 0)');

        ctx.fillStyle = iceGrad;
        ctx.beginPath();
        ctx.arc(northPole.screenX, northPole.screenY, radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore(); // end globe clip

      // ── 3D Landing Site Pins & Pulsing Beacons ──
      const sitesList: LandingSiteId[] = ['jezero', 'gale', 'olympus'];
      sitesList.forEach((id) => {
        const site = LANDING_SITES[id];
        const pt = project3D(site.lat, site.lon);

        if (pt.visible) {
          const isSelected = id === selectedSite;
          const pinColor = site.pinColor;

          // Pulsing Beacon on surface
          const time = Date.now() / 600;
          const pulse = (Math.sin(time) + 1) / 2;

          ctx.save();

          // Outer pulse ring
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, isSelected ? 12 + pulse * 6 : 8 + pulse * 3, 0, Math.PI * 2);
          ctx.strokeStyle = pinColor;
          ctx.globalAlpha = 0.4 + pulse * 0.4;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Solid Pin Core
          ctx.beginPath();
          ctx.arc(pt.screenX, pt.screenY, isSelected ? 5.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = pinColor;
          ctx.globalAlpha = 1.0;
          ctx.fill();

          // Target callout line and tag
          const tagOffset = isSelected ? 22 : 14;
          ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt.screenX, pt.screenY);
          ctx.lineTo(pt.screenX + tagOffset, pt.screenY - tagOffset);
          ctx.lineTo(pt.screenX + tagOffset + 50, pt.screenY - tagOffset);
          ctx.stroke();

          // Site label
          ctx.font = isSelected ? 'bold 11px monospace' : '9px monospace';
          ctx.fillStyle = isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';
          ctx.fillText(site.name.split(' ')[0], pt.screenX + tagOffset + 4, pt.screenY - tagOffset - 3);

          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [selectedSite]);

  // Mouse & Touch Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    isInteractingRef.current = true;
    targetRotYRef.current = null;
    targetRotXRef.current = null;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    rotYRef.current += deltaX * 0.007;
    rotXRef.current = Math.max(-0.9, Math.min(0.9, rotXRef.current + deltaY * 0.007));

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 2000);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div className="w-full bg-[#0B1026]/80 rounded-3xl border border-white/10 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <span className="text-xs font-mono font-bold text-[#E87040] uppercase tracking-wider flex items-center gap-1.5">
            <span>🪐</span> 3D Martian Surface Reconnaissance
          </span>
          <h3 className="font-heading font-extrabold text-lg text-white">
            Select Outpost Landing Zone
          </h3>
        </div>
        <span className="text-[11px] font-mono text-white/50">
          Drag globe to rotate • Click site to lock coordinates
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Interactive Canvas 3D Sphere */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative">
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] cursor-grab active:cursor-grabbing touch-none select-none drop-shadow-2xl"
            title="Drag to rotate Mars in 3D"
          />
          <div className="text-[10px] font-mono text-white/40 mt-1 flex items-center gap-2">
            <span>Latitude Tilt: {Math.round((rotXRef.current * 180) / Math.PI)}°</span>
            <span>•</span>
            <span>Longitude: {Math.round((-rotYRef.current * 180) / Math.PI) % 360}°</span>
          </div>
        </div>

        {/* Landing Site Selection Buttons & Telemetry Card */}
        <div className="md:col-span-6 space-y-3">
          {/* Site Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(['jezero', 'gale', 'olympus'] as LandingSiteId[]).map((siteId) => {
              const site = LANDING_SITES[siteId];
              const isSelected = selectedSite === siteId;
              return (
                <button
                  key={siteId}
                  type="button"
                  onClick={() => {
                    playClick();
                    focusOnSite(siteId);
                  }}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between
                    ${
                      isSelected
                        ? 'bg-[#E87040]/20 border-[#E87040] ring-1 ring-[#E87040] shadow-lg shadow-[#E87040]/20'
                        : 'bg-[#1a1f3d]/60 border-white/10 hover:border-white/30 text-white/70'
                    }
                  `}
                >
                  <span className="text-xs font-mono font-bold text-white truncate block">
                    {site.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] font-mono mt-1" style={{ color: site.pinColor }}>
                    ● {site.lat}°N
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Site Dossier Card */}
          <div className="p-4 rounded-2xl bg-[#1a1f3d]/90 border border-white/15 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-heading font-extrabold text-base text-white">
                  {activeSiteInfo.name}
                </h4>
                <p className="text-xs text-[#E87040] font-mono">
                  {activeSiteInfo.roverMission}
                </p>
              </div>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase"
                style={{
                  backgroundColor: `${activeSiteInfo.pinColor}22`,
                  color: activeSiteInfo.pinColor,
                  border: `1px solid ${activeSiteInfo.pinColor}44`,
                }}
              >
                Coordinates: {activeSiteInfo.lat}°N, {activeSiteInfo.lon}°E
              </span>
            </div>

            <p className="text-xs text-[#F8FAFC]/70 leading-relaxed">
              {activeSiteInfo.description}
            </p>

            {/* Environmental Modifiers */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-white/10">
              <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                <span className="text-white/40 block text-[9px]">ELEVATION / ATMOSPHERE:</span>
                <span className="text-white font-bold">{activeSiteInfo.elevation}</span>
              </div>
              <div className="p-2 rounded-xl bg-black/20 border border-white/5">
                <span className="text-white/40 block text-[9px]">SOLAR POWER MODIFIER:</span>
                <span className={activeSiteInfo.powerGainMod >= 1.0 ? 'text-[#22C55E] font-bold' : 'text-amber-300 font-bold'}>
                  {activeSiteInfo.powerGainMod >= 1.0 ? `+${Math.round((activeSiteInfo.powerGainMod - 1) * 100)}%` : `-${Math.round((1 - activeSiteInfo.powerGainMod) * 100)}%`} Irradiance
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0B1026] border border-white/10 text-xs text-[#22C55E] font-mono">
              ⚡ <strong>Perks:</strong> {activeSiteInfo.perksSummary}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
