'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import roverPhotosData from '@/data/mars-rover-photos.json';
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
}

interface RoverGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoverGalleryModal({ isOpen, onClose }: RoverGalleryModalProps) {
  const [selectedRover, setSelectedRover] = useState<string>('All');
  const [activePhoto, setActivePhoto] = useState<RoverPhoto | null>(null);

  // Transform photos to use the secure same-origin IPv4 proxy for 100% reliable image loading
  const photos: RoverPhoto[] = roverPhotosData.map((p) => {
    const rawImg = p.imgSrc;
    const rawHd = (p as Record<string, unknown>).hdSrc as string || rawImg;
    const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(rawImg)}`;
    const hdProxyUrl = `/api/image-proxy?url=${encodeURIComponent(rawHd)}`;

    return {
      ...p,
      title: `${p.rover} on Mars • Sol ${p.sol}`,
      imgSrc: proxyUrl,
      hdSrc: hdProxyUrl,
    };
  });

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
            Explore authentic Mars planetary photography captured by NASA&apos;s surface rovers in Gale and Jezero Craters.
          </p>
          <span className="ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40">
            ● OFFICIAL NASA PHOTOGRAPHY
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
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/60 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imgSrc}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#0B1026]/90 text-[#E87040] border border-[#E87040]/40">
                  {photo.rover} • Sol {photo.sol}
                </span>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/70 text-white/80">
                  {photo.camera}
                </span>
              </div>

              <div>
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
                    {activePhoto.rover} on Mars (Sol {activePhoto.sol})
                  </h3>
                  <p className="text-xs text-[#E87040]">Camera: {activePhoto.camera} • Earth Date: {activePhoto.earthDate}</p>
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
                />
              </div>

              <p className="text-sm text-[#F8FAFC]/90 leading-relaxed bg-[#0B1026]/60 p-4 rounded-xl border border-white/5">
                {activePhoto.description}
              </p>

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
              <span className="text-[#F8FAFC]/50 text-[11px] mt-1">Official NASA image archive</span>
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
