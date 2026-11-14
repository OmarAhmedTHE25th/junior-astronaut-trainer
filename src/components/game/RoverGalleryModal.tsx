'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import localPhotosData from '@/data/mars-rover-photos.json';
import { playClick } from '@/lib/sound';

interface RoverPhoto {
  id: string;
  rover: string;
  sol: number;
  camera: string;
  earthDate: string;
  imgSrc: string;
  hdSrc?: string;
  title?: string;
  description: string;
  nasaId?: string;
  isLive?: boolean;
}

interface RoverGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Inline SVG fallback: a Martian terrain telemetry card
const FALLBACK_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1a0a0a"/>
      <stop offset="60%" stop-color="#3d1c0c"/>
      <stop offset="100%" stop-color="#8b4513"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b4513"/>
      <stop offset="100%" stop-color="#5c2d0e"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#sky)"/>
  <ellipse cx="560" cy="60" rx="22" ry="22" fill="#ffa94d" opacity="0.8"/>
  <circle cx="90" cy="40" r="1.5" fill="#fff" opacity="0.7"/>
  <circle cx="200" cy="25" r="1" fill="#fff" opacity="0.5"/>
  <circle cx="320" cy="50" r="1.2" fill="#fff" opacity="0.6"/>
  <circle cx="450" cy="35" r="0.8" fill="#fff" opacity="0.4"/>
  <circle cx="150" cy="70" r="1" fill="#fff" opacity="0.5"/>
  <circle cx="380" cy="20" r="1.3" fill="#fff" opacity="0.6"/>
  <path d="M0 240 Q80 210 160 230 Q240 250 320 220 Q400 190 480 225 Q560 260 640 235 L640 360 L0 360Z" fill="url(#ground)"/>
  <path d="M0 260 Q100 240 200 255 Q300 270 400 250 Q500 230 640 255 L640 360 L0 360Z" fill="#5c2d0e" opacity="0.6"/>
  <rect x="220" y="120" width="200" height="100" rx="8" fill="#0B1026" fill-opacity="0.85" stroke="#E87040" stroke-width="1.5"/>
  <text x="320" y="148" text-anchor="middle" fill="#E87040" font-family="monospace" font-size="11" font-weight="bold">⚠ SIGNAL LOST</text>
  <text x="320" y="170" text-anchor="middle" fill="#F8FAFC" font-family="monospace" font-size="9" opacity="0.7">MARS SURFACE TELEMETRY</text>
  <text x="320" y="188" text-anchor="middle" fill="#F8FAFC" font-family="monospace" font-size="8" opacity="0.5">Image unavailable offline</text>
  <line x1="240" y1="200" x2="400" y2="200" stroke="#E87040" stroke-width="0.5" opacity="0.4"/>
  <text x="320" y="212" text-anchor="middle" fill="#22C55E" font-family="monospace" font-size="8" opacity="0.6">NASA/JPL-Caltech</text>
</svg>`)}`;

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.dataset.fallbackApplied) {
    img.dataset.fallbackApplied = 'true';
    img.src = FALLBACK_SVG;
  }
}

export default function RoverGalleryModal({ isOpen, onClose }: RoverGalleryModalProps) {
  const [selectedRover, setSelectedRover] = useState<string>('All');
  const [activePhoto, setActivePhoto] = useState<RoverPhoto | null>(null);
  const [photos, setPhotos] = useState<RoverPhoto[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Load local data immediately as baseline
  const localPhotos: RoverPhoto[] = localPhotosData.map((p) => ({
    ...p,
    hdSrc: (p as Record<string, unknown>).hdSrc as string | undefined,
    title: `${p.rover} on Mars`,
    nasaId: p.id,
    isLive: false,
  }));

  const fetchLivePhotos = useCallback(async () => {
    if (hasFetched) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rover-photos', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (json.success && json.photos?.length > 0) {
        setPhotos(json.photos);
        setIsLive(json.isLive === true);
      } else {
        setPhotos(localPhotos);
      }
    } catch {
      setPhotos(localPhotos);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [hasFetched]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch when the modal opens
  useEffect(() => {
    if (isOpen && !hasFetched) {
      // Start with local data immediately so something always shows
      setPhotos(localPhotos);
      fetchLivePhotos();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const rovers = ['All', 'Curiosity', 'Perseverance', 'Opportunity', 'Spirit'];

  const filteredPhotos = selectedRover === 'All'
    ? photos
    : photos.filter((p) => p.rover.toLowerCase() === selectedRover.toLowerCase());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔭 NASA Mars Rover Gallery & Science Data"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Intro */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#F8FAFC]/80 leading-relaxed flex-1">
            Explore authentic Mars photography gathered by NASA&apos;s surface rovers in Gale and Jezero Craters.
          </p>
          {/* Live/Offline badge */}
          <span className={`
            ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border
            ${isLive
              ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
              : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
            }
          `}>
            {loading ? '⏳ Loading...' : isLive ? '● LIVE NASA API' : '● LOCAL ARCHIVE'}
          </span>
        </div>

        {/* Rover filter pills */}
        <div className="flex flex-wrap gap-2">
          {rovers.map((rover) => {
            const isSelected = selectedRover === rover;
            return (
              <button
                key={rover}
                onClick={() => {
                  playClick();
                  setSelectedRover(rover);
                }}
                className={`
                  px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px]
                  ${isSelected
                    ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md shadow-[#E87040]/30'
                    : 'bg-[#1a1f3d] text-[#F8FAFC]/70 hover:text-white hover:bg-[#1a1f3d]/80 border border-white/10'
                  }
                `}
              >
                {rover === 'All' ? '🪐 All Rovers' : `🤖 ${rover}`}
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredPhotos.length === 0 && !loading && (
            <div className="col-span-2 text-center py-12 text-white/50 text-sm font-mono">
              No photos found for this rover.
            </div>
          )}
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => {
                playClick();
                setActivePhoto(photo);
              }}
              className="
                group rounded-2xl bg-[#0B1026]/80 border border-white/10 p-3
                hover:border-[#E87040] transition-all cursor-pointer flex flex-col justify-between
                hover:scale-[1.02] shadow-lg
              "
            >
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imgSrc}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#0B1026]/90 text-[#E87040] border border-[#E87040]/40">
                  {photo.rover} {photo.sol > 0 ? `• Sol ${photo.sol}` : ''}
                </span>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white/80">
                  {photo.camera}
                </span>
                {photo.isLive && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40">
                    LIVE
                  </span>
                )}
              </div>

              <div>
                {photo.title && (
                  <p className="text-[11px] font-bold text-[#E87040]/80 mb-0.5 line-clamp-1">
                    {photo.title}
                  </p>
                )}
                <p className="text-xs text-[#F8FAFC]/90 line-clamp-2 leading-relaxed">
                  {photo.description}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#F8FAFC]/50">
                  <span>📅 {photo.earthDate}</span>
                  <span className="text-[#3B82F6] font-semibold">Inspect 🔍</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active photo detail modal if clicked */}
        {activePhoto && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-[fade-in_0.2s_ease-out]"
            onClick={() => setActivePhoto(null)}
          >
            <div
              className="relative max-w-2xl w-full bg-[#1a1f3d] rounded-2xl border-2 border-[#E87040] p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white">
                    {activePhoto.title || `${activePhoto.rover} on Mars`}
                  </h3>
                  <p className="text-xs text-[#E87040]">
                    Camera: {activePhoto.camera} • {activePhoto.earthDate}
                    {activePhoto.sol > 0 ? ` • Sol ${activePhoto.sol}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setActivePhoto(null)}
                  className="text-white/60 hover:text-white text-xl p-2 cursor-pointer min-h-[44px] min-w-[44px]"
                  aria-label="Close photo preview"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-xl overflow-hidden bg-black max-h-[50vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto.hdSrc || activePhoto.imgSrc}
                  alt={activePhoto.description}
                  className="max-h-[50vh] w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={handleImgError}
                />
              </div>

              <p className="text-sm text-[#F8FAFC]/90 leading-relaxed bg-[#0B1026]/60 p-4 rounded-xl border border-white/5">
                {activePhoto.description}
              </p>

              {activePhoto.nasaId && (
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                  <span>NASA ID: {activePhoto.nasaId}</span>
                  {activePhoto.isLive && (
                    <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                      LIVE NASA IMAGE LIBRARY
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => setActivePhoto(null)}>
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live NASA Data Portals */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <h4 className="text-xs font-bold text-[#E87040] uppercase tracking-wider flex items-center gap-2">
            <span>📡</span> Official NASA Scientific Portals
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://images.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/10 hover:border-[#E87040] transition-colors text-xs flex flex-col justify-between"
            >
              <span className="font-bold text-white">📷 NASA Image Library</span>
              <span className="text-[#F8FAFC]/50 text-[11px] mt-1">Official NASA photo archive</span>
            </a>
            <a
              href="https://ccmc.gsfc.nasa.gov/tools/DONKI/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/10 hover:border-[#3B82F6] transition-colors text-xs flex flex-col justify-between"
            >
              <span className="font-bold text-white">☀️ NASA DONKI</span>
              <span className="text-[#F8FAFC]/50 text-[11px] mt-1">Solar Flares &amp; CMEs database</span>
            </a>
            <a
              href="https://osdr.nasa.gov/bio/repo/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[#0B1026]/70 border border-white/10 hover:border-[#6B3FA0] transition-colors text-xs flex flex-col justify-between"
            >
              <span className="font-bold text-white">🧬 NASA OSDR</span>
              <span className="text-[#F8FAFC]/50 text-[11px] mt-1">Space biology health studies</span>
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            Back to Outpost
          </Button>
        </div>
      </div>
    </Modal>
  );
}
