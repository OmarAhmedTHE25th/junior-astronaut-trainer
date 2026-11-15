'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useSound } from '@/lib/sound';
import { useProfile, getOrCreateCadetProfile } from '@/lib/profile';
import type {
  CommanderProfile,
  BoostSlug,
  PlayerPet,
} from '@/lib/battleRoyaleTypes';
import { PET_CATALOG } from '@/lib/battleRoyaleTypes';
import LoadoutHangar from './LoadoutHangar';

interface PetHangarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPetEquipped?: (pet: { name: string; avatar: string; level: number }) => void;
  onOpenBattleRoyale?: () => void;
}

export default function PetHangarModal({
  isOpen,
  onClose,
  onPetEquipped,
  onOpenBattleRoyale,
}: PetHangarModalProps) {
  const { playClick, playAction, playSuccess, playAlert } = useSound();
  const { profile, isLoaded } = useProfile();

  const activeCadet =
    isLoaded && profile.cadetId !== 'cadet-nova-01'
      ? profile
      : typeof window !== 'undefined'
      ? getOrCreateCadetProfile()
      : profile;

  const [commanderProfile, setCommanderProfile] = useState<CommanderProfile | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedBoosts, setSelectedBoosts] = useState<BoostSlug[]>([
    'cryo-o2-stim',
    'lead-lined-nanogel',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load initial slotted boosts from localStorage on mount
  useEffect(() => {
    try {
      const savedBoosts = localStorage.getItem('jat_slotted_boosts_v1');
      if (savedBoosts) {
        const parsed = JSON.parse(savedBoosts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedBoosts(parsed as BoostSlug[]);
        }
      }

      const savedPet = localStorage.getItem('jat_equipped_pet_v1');
      if (savedPet) {
        setSelectedPetId(savedPet);
      }
    } catch {}
  }, []);

  // Fetch Commander Profile & Inventory when modal opens
  const fetchProfileAndPets = useCallback(async () => {
    if (!activeCadet?.callsign) return;
    setIsLoading(true);

    try {
      const username = activeCadet.callsign || 'CDR-NOVA';
      const pRes = await fetch(`/api/profile/${encodeURIComponent(username)}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.success && pData.profile) {
          const prof: CommanderProfile = pData.profile;
          setCommanderProfile(prof);

          // Restore saved equipped pet or fall back to profile.equippedPet
          const savedPetId = localStorage.getItem('jat_equipped_pet_v1');
          const petToSelect =
            savedPetId ||
            prof.equippedPet?.id ||
            prof.pets?.[0]?.id ||
            null;

          setSelectedPetId(petToSelect);

          // If a pet is selected, make sure parent is informed
          if (petToSelect && prof.pets) {
            const petObj = prof.pets.find((p) => p.id === petToSelect);
            if (petObj) {
              const petDef = PET_CATALOG[petObj.petSlug];
              onPetEquipped?.({
                name: petObj.nickname || petDef?.name || 'Companion',
                avatar: petObj.avatar || petDef?.avatar || '🐾',
                level: petObj.level || 1,
              });
            }
          }
        }
      }

      // Also fetch pets endpoint if available
      if (activeCadet.cadetId) {
        const petsRes = await fetch(`/api/pets?playerId=${encodeURIComponent(activeCadet.cadetId)}`);
        if (petsRes.ok) {
          const petsData = await petsRes.json();
          if (petsData.success && petsData.pets && petsData.pets.length > 0) {
            setCommanderProfile((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                pets: petsData.pets,
              };
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load commander profile in PetHangarModal:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCadet?.callsign, activeCadet?.cadetId, onPetEquipped]);

  useEffect(() => {
    if (isOpen) {
      fetchProfileAndPets();
    }
  }, [isOpen, fetchProfileAndPets]);

  // Handle equipping pet
  const handleSelectPet = async (petId: string) => {
    setSelectedPetId(petId);
    playClick();

    try {
      localStorage.setItem('jat_equipped_pet_v1', petId);
    } catch {}

    // Find pet object and inform parent immediately
    if (commanderProfile?.pets) {
      const petObj = commanderProfile.pets.find((p) => p.id === petId);
      if (petObj) {
        const petDef = PET_CATALOG[petObj.petSlug];
        onPetEquipped?.({
          name: petObj.nickname || petDef?.name || 'Companion',
          avatar: petObj.avatar || petDef?.avatar || '🐾',
          level: petObj.level || 1,
        });
      }
    }

    // Persist to server via POST /api/pets
    if (activeCadet?.cadetId) {
      try {
        await fetch('/api/pets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: activeCadet.cadetId,
            action: 'EQUIP',
            petId,
          }),
        });
      } catch (err) {
        console.warn('Failed to persist equipped pet to server:', err);
      }
    }
  };

  // Handle toggling tactical boost slotting
  const handleToggleBoost = (slug: BoostSlug) => {
    setSelectedBoosts((prev) => {
      let next: BoostSlug[];
      if (prev.includes(slug)) {
        next = prev.filter((s) => s !== slug);
      } else if (prev.length >= 3) {
        next = [prev[1], prev[2], slug];
      } else {
        next = [...prev, slug];
      }

      try {
        localStorage.setItem('jat_slotted_boosts_v1', JSON.stringify(next));
      } catch {}

      return next;
    });
  };

  // Save loadout confirmation
  const handleSaveLoadout = () => {
    try {
      if (selectedPetId) {
        localStorage.setItem('jat_equipped_pet_v1', selectedPetId);
      }
      localStorage.setItem('jat_slotted_boosts_v1', JSON.stringify(selectedBoosts));
    } catch {}

    playSuccess();
    setSaveSuccessMsg('Tactical loadout saved and synchronized across all mission modes!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      onClose();
    }, 1100);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🐾 COMPANION PET & TACTICAL LOADOUT HANGAR"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Banner */}
        <div className="p-3.5 rounded-2xl bg-[#090d20] border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-starlight/80">
              Equip bio-engineered Martian companions and slot up to 3 tactical boosts active across Solo, Squad, and Battle Royale runs.
            </span>
          </div>
        </div>

        {/* Success alert message */}
        {saveSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-slide-up">
            <span>✓</span>
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {isLoading && !commanderProfile ? (
          <div className="text-center py-12 font-mono text-cyan-300 animate-pulse text-sm">
            📡 Synchronizing Hangar Telemetry &amp; Bio-Containment Labs...
          </div>
        ) : commanderProfile ? (
          <LoadoutHangar
            profile={commanderProfile}
            selectedPetId={selectedPetId}
            onSelectPet={handleSelectPet}
            selectedBoosts={selectedBoosts}
            onToggleBoost={handleToggleBoost}
            standaloneMode={true}
            onSaveLoadout={handleSaveLoadout}
            onOpenBattleRoyale={() => {
              onClose();
              onOpenBattleRoyale?.();
            }}
          />
        ) : (
          <div className="text-center py-10 font-mono text-starlight/60 text-xs">
            Commander profile telemetry unavailable. Check network link.
          </div>
        )}
      </div>
    </Modal>
  );
}
