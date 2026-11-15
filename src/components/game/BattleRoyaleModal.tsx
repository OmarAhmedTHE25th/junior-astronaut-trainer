'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import type {
  BRMatch,
  BRMatchPlayer,
  BoostSlug,
  CommanderProfile,
} from '@/lib/battleRoyaleTypes';
import LoadoutHangar from './LoadoutHangar';
import MarsDropMap from './MarsDropMap';

interface BattleRoyaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BattleRoyaleModal({ isOpen, onClose }: BattleRoyaleModalProps) {
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  // View mode: 'hangar' | 'match' | 'summary'
  const [viewMode, setViewMode] = useState<'hangar' | 'match' | 'summary'>('hangar');
  const [commanderProfile, setCommanderProfile] = useState<CommanderProfile | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<BoostSlug[]>(['cryo-o2-stim', 'lead-lined-nanogel']);

  // Active match state
  const [activeMatch, setActiveMatch] = useState<BRMatch | null>(null);
  const [eventLog, setEventLog] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // Fetch Commander Profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(activeCadet.callsign || 'CDR-NOVA')}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.profile) {
        setCommanderProfile(data.profile);
        if (!selectedPetId && data.profile.pets?.length > 0) {
          setSelectedPetId(data.profile.equippedPet?.id || data.profile.pets[0].id);
        }
      }
    } catch {}
  }, [activeCadet.callsign, selectedPetId]);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  // Toggle slotted boost
  const handleToggleBoost = (slug: BoostSlug) => {
    setSelectedBoosts((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 3) {
        return [prev[1], prev[2], slug];
      }
      return [...prev, slug];
    });
  };

  // Queue into Battle Royale
  const handleQueueBR = async () => {
    setIsQueueing(true);
    setEventLog(null);
    playClick();

    try {
      const res = await fetch('/api/br/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          username: activeCadet.callsign || 'Commander Nova',
          avatar: activeCadet.avatar || '👨‍🚀',
          equippedPetId: selectedPetId,
          activeBoosts: selectedBoosts,
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        playAction();
        setActiveMatch(data.match);
        setViewMode('match');
        setEventLog('🪂 Orbital Dropship deployed! Landed in Sector [2,2] (Tharsis Plateau).');
      } else {
        playAlert();
      }
    } catch {
      playAlert();
    } finally {
      setIsQueueing(false);
    }
  };

  // Move to Sector
  const handleMoveSector = async (targetX: number, targetY: number) => {
    if (!activeMatch) return;
    setIsMoving(true);

    try {
      const res = await fetch(`/api/br/${activeMatch.id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: activeCadet.cadetId,
          targetX,
          targetY,
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        setActiveMatch(data.match);
        setEventLog(data.eventLog);

        if (data.isVictory) {
          playSuccess();
          setViewMode('summary');
        } else if (data.stormDamage > 0) {
          playAlert();
        } else {
          playClick();
        }

        // Check if player died
        const player = data.match.players.find((p: BRMatchPlayer) => p.playerId === activeCadet.cadetId);
        if (player && player.status === 'eliminated') {
          playAlert();
          setViewMode('summary');
        }
      }
    } catch {} finally {
      setIsMoving(false);
    }
  };

  const currentPlayer = activeMatch?.players.find((p) => p.playerId === activeCadet.cadetId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🪂 DROP ZONE: OLYMPUS — MARS BATTLE ROYALE"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Event Notification Ticker */}
        {eventLog && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-400/50 text-cyan-200 text-xs font-mono flex items-center justify-between animate-slide-up">
            <span>{eventLog}</span>
            <button
              onClick={() => setEventLog(null)}
              className="text-white/60 hover:text-white ml-2 text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── VIEW 1: HANGAR LOADOUT (PRE-DROP) ── */}
        {viewMode === 'hangar' && commanderProfile && (
          <LoadoutHangar
            profile={commanderProfile}
            selectedPetId={selectedPetId}
            onSelectPet={(id) => setSelectedPetId(id)}
            selectedBoosts={selectedBoosts}
            onToggleBoost={handleToggleBoost}
            onQueueBattleRoyale={handleQueueBR}
            isQueueing={isQueueing}
          />
        )}

        {/* ── VIEW 2: ACTIVE MATCH DROP MAP ── */}
        {viewMode === 'match' && activeMatch && currentPlayer && (
          <div className="space-y-4">
            <MarsDropMap
              match={activeMatch}
              currentPlayer={currentPlayer}
              onMoveSector={handleMoveSector}
              isLoading={isMoving}
            />
          </div>
        )}

        {/* ── VIEW 3: MATCH SUMMARY / PLACEMENT ── */}
        {viewMode === 'summary' && activeMatch && currentPlayer && (
          <div className="text-center py-8 space-y-4 font-mono animate-slide-up">
            <span className="text-5xl block animate-bounce">
              {currentPlayer.placement === 1 ? '👑' : '💥'}
            </span>
            <h3 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              {currentPlayer.placement === 1 ? 'VICTORY ROYALE!' : 'CRASH LANDING ELIMINATION'}
            </h3>
            <p className="text-sm text-starlight/80 max-w-md mx-auto">
              {currentPlayer.placement === 1
                ? 'Sole survivor of the Martian storm surge! Outlasted all 16 rival commanders.'
                : `Eliminated at Placement #${currentPlayer.placement || 4}. Systems overwhelmed by storm radiation.`}
            </p>

            <div className="inline-flex items-center gap-4 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
              <span className="text-amber-300 font-bold">
                {currentPlayer.placement === 1 ? '+115 RP Gained' : '+25 RP Gained'}
              </span>
              <span className="text-white/40">•</span>
              <span className="text-cyan-300">
                Pet XP: +150 XP
              </span>
            </div>

            <div>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setViewMode('hangar');
                  setActiveMatch(null);
                  fetchProfile();
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-heading font-extrabold text-sm uppercase shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Return to Hangar 🚀
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
