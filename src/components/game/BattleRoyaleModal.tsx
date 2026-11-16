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
  BRArenaTheme,
} from '@/lib/battleRoyaleTypes';
import { BR_ARENAS } from '@/lib/battleRoyaleTypes';
import type { SabotageSlug, SabotagePaymentType } from '@/lib/sabotageTypes';
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
  const [selectedArena, setSelectedArena] = useState<BRArenaTheme>('mars');
  const [commanderProfile, setCommanderProfile] = useState<CommanderProfile | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<BoostSlug[]>(['cryo-o2-stim', 'lead-lined-nanogel']);

  // Active match state
  const [activeMatch, setActiveMatch] = useState<BRMatch | null>(null);
  const [eventLog, setEventLog] = useState<string | null>(null);
  const [isQueueing, setIsQueueing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isSabotaging, setIsSabotaging] = useState(false);

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
          arenaTheme: selectedArena,
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        playAction();
        setActiveMatch(data.match);
        setViewMode('match');
        const arenaMeta = BR_ARENAS[selectedArena] || BR_ARENAS.mars;
        setEventLog(`🪂 Orbital Dropship deployed! Landed in ${arenaMeta.name} (${arenaMeta.subtitle}) Sector [2,2].`);
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

  // Execute Sabotage against rival in adjacent/current sector
  const handleSabotageRival = async (
    targetPlayerId: string,
    slug: SabotageSlug,
    paymentType: SabotagePaymentType
  ) => {
    if (!activeMatch) return;
    setIsSabotaging(true);

    try {
      const res = await fetch(`/api/br/${activeMatch.id}/sabotage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackerId: activeCadet.cadetId,
          targetPlayerId,
          sabotageSlug: slug,
          paymentType,
        }),
      });

      const data = await res.json();
      if (data.success && data.match) {
        setActiveMatch(data.match);
        setEventLog(data.eventLog);

        if (data.isVictory) {
          playSuccess();
          setViewMode('summary');
        } else if (data.targetEliminated) {
          playSuccess();
        } else {
          playAction();
        }
      } else {
        playAlert();
        setEventLog(`⚠️ Sabotage failed: ${data.error || 'Target out of range'}`);
      }
    } catch {
      playAlert();
      setEventLog('⚠️ Comm error deploying electronic warfare.');
    } finally {
      setIsSabotaging(false);
    }
  };

  const currentPlayer = activeMatch?.players.find((p) => p.playerId === activeCadet.cadetId);

  const activeArena = activeMatch?.arenaTheme ? BR_ARENAS[activeMatch.arenaTheme] : BR_ARENAS[selectedArena] || BR_ARENAS.mars;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🪂 PLANETARY DROP ZONE — SOLAR SYSTEM BATTLE ROYALE"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Active Arena Header Badge */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border border-white/10 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{activeArena.icon}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-white text-sm">{activeArena.name}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                  {activeArena.subtitle}
                </span>
              </div>
              <span className="text-[10px] text-white/50 block">Hazard: {activeArena.stormHazard}</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-300 uppercase shrink-0">
            ⚡ {activeArena.stormName}
          </span>
        </div>

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
            selectedArena={selectedArena}
            onSelectArena={(a) => setSelectedArena(a)}
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
              onSabotageRival={handleSabotageRival}
              isLoading={isMoving}
              isSabotaging={isSabotaging}
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
                className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-sm uppercase shadow-sm border border-cyan-200 cursor-pointer transition-colors"
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
