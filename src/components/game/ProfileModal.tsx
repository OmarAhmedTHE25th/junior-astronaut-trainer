'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useProfile, AVATAR_OPTIONS, validateCallsign } from '@/lib/profile';
import { playClick, playSuccess } from '@/lib/sound';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, updateCallsign, updateAvatar, badgesMeta } = useProfile();
  const [callsignInput, setCallsignInput] = useState(profile.callsign);
  const [callsignError, setCallsignError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCallsign(callsignInput)) {
      setCallsignError('Callsign must be 3–16 characters (letters, numbers, dashes only).');
      return;
    }
    setCallsignError('');
    const ok = updateCallsign(callsignInput);
    if (ok) {
      playSuccess();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const handleSelectAvatar = (avatar: string) => {
    playClick();
    updateAvatar(avatar);
  };

  const winRate =
    profile.missionsPlayed > 0
      ? Math.round((profile.missionsWon / profile.missionsPlayed) * 100)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👨‍🚀 Cadet Dossier & Flight Credentials">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Callsign & Avatar Identity Section */}
        <div className="bg-[#1a1f3d]/90 rounded-2xl p-5 border border-[#6B3FA0]/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Active Patch Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E87040] via-[#6B3FA0] to-[#3B82F6] p-0.5 shadow-lg shadow-[#E87040]/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#0B1026] rounded-2xl flex items-center justify-center text-4xl">
                  {profile.avatar}
                </div>
              </div>
            </div>

            {/* Callsign Editor */}
            <div className="flex-1 w-full">
              <form onSubmit={handleSaveCallsign} className="space-y-2">
                <label htmlFor="callsign-input" className="block text-xs font-mono font-bold text-[#E87040] uppercase tracking-wider">
                  Astronaut Callsign
                </label>
                <div className="flex gap-2">
                  <input
                    id="callsign-input"
                    type="text"
                    value={callsignInput}
                    onChange={(e) => {
                      setCallsignInput(e.target.value.toUpperCase());
                      setCallsignError('');
                    }}
                    maxLength={16}
                    placeholder="CDR-NOVA-01"
                    className="
                      flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B1026] border border-white/20
                      text-white font-mono font-bold text-sm tracking-wide
                      focus:outline-none focus:ring-2 focus:ring-[#E87040] focus:border-transparent
                      min-h-[44px]
                    "
                  />
                  <Button type="submit" variant="primary" size="sm" className="px-4">
                    Save
                  </Button>
                </div>
                {callsignError && (
                  <p className="text-xs text-[#EF4444] font-medium">{callsignError}</p>
                )}
                {savedSuccess && (
                  <p className="text-xs text-[#22C55E] font-medium flex items-center gap-1">
                    <span>✓</span> Callsign updated successfully!
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Select Mission Patch */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-xs font-semibold text-[#F8FAFC]/60 block mb-2">
              Select Mission Patch:
            </span>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => handleSelectAvatar(av)}
                  className={`
                    w-11 h-11 rounded-xl text-xl flex items-center justify-center
                    transition-all cursor-pointer min-h-[44px] min-w-[44px]
                    ${
                      profile.avatar === av
                        ? 'bg-[#E87040]/30 border-2 border-[#E87040] scale-110 shadow-md shadow-[#E87040]/30'
                        : 'bg-[#0B1026]/70 border border-white/10 hover:border-white/30'
                    }
                  `}
                  aria-label={`Select avatar ${av}`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Career Telemetry Stats */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📊</span> Career Telemetry &amp; Flight Hours
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0B1026]/80 border border-white/10 text-center space-y-1">
              <span className="text-xs text-[#F8FAFC]/50 block">Missions</span>
              <span className="text-xl font-extrabold text-white tabular-nums">
                {profile.missionsPlayed}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B1026]/80 border border-white/10 text-center space-y-1">
              <span className="text-xs text-[#F8FAFC]/50 block">Victories</span>
              <span className="text-xl font-extrabold text-[#22C55E] tabular-nums">
                {profile.missionsWon}{' '}
                <span className="text-xs font-normal text-[#F8FAFC]/40">({winRate}%)</span>
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B1026]/80 border border-white/10 text-center space-y-1">
              <span className="text-xs text-[#F8FAFC]/50 block">Sols Survived</span>
              <span className="text-xl font-extrabold text-[#E87040] tabular-nums">
                {profile.totalSolsSurvived}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#0B1026]/80 border border-white/10 text-center space-y-1">
              <span className="text-xs text-[#F8FAFC]/50 block">High Score</span>
              <span className="text-xl font-extrabold text-[#3B82F6] tabular-nums">
                {profile.highestScore}
              </span>
            </div>
          </div>
        </div>

        {/* Unlockable Achievement Badges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🎖️</span> Career Honors &amp; Badges ({profile.badges.length}/{badgesMeta.length})
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {badgesMeta.map((badge) => {
              const isUnlocked = profile.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`
                    flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all
                    ${
                      isUnlocked
                        ? 'bg-[#1a1f3d] border-[#22C55E]/60 shadow-lg shadow-[#22C55E]/10'
                        : 'bg-[#0B1026]/60 border-white/10 opacity-60'
                    }
                  `}
                >
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                      ${isUnlocked ? 'bg-[#22C55E]/20 border border-[#22C55E]/40' : 'bg-white/5 border border-white/10'}
                    `}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-sm text-white truncate">{badge.name}</h5>
                      {isUnlocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/20 text-[#22C55E] uppercase">
                          Unlocked ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/50 uppercase">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#F8FAFC]/70 mt-0.5">{badge.description}</p>
                    <p className="text-[10px] text-[#E87040] font-mono mt-1">Requirement: {badge.requirement}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <span className="text-xs font-mono text-[#F8FAFC]/40 truncate max-w-[200px]">
            ID: {profile.cadetId.substring(0, 18)}...
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close Dossier
          </Button>
        </div>
      </div>
    </Modal>
  );
}
