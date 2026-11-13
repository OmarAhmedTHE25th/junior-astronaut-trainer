'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useProfile, AVATAR_OPTIONS, validateCallsign } from '@/lib/profile';
import { playClick, playSuccess, playAlert } from '@/lib/sound';
import type { CadetSpecialty } from '@/lib/types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const {
    profile,
    roster,
    isCloudSyncing,
    updateCallsign,
    updateAvatar,
    updateSpecialty,
    switchCadet,
    createNewCadet,
    deleteCadet,
    recoverCloudProfile,
    badgesMeta,
    specialtiesMeta,
  } = useProfile();

  const [callsignInput, setCallsignInput] = useState(profile.callsign);
  const [callsignError, setCallsignError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Recovery input state
  const [recoveryId, setRecoveryId] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Sync callsign input if profile changes
  useEffect(() => {
    setCallsignInput(profile.callsign);
  }, [profile.callsign, profile.cadetId]);

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

  const handleSelectSpecialty = (specialty: CadetSpecialty) => {
    playClick();
    updateSpecialty(specialty);
  };

  const handleCreateCadet = () => {
    playSuccess();
    createNewCadet();
  };

  const handleSwitch = (id: string) => {
    playClick();
    switchCadet(id);
  };

  const handleDelete = (id: string) => {
    playAlert();
    deleteCadet(id);
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMsg(null);
    if (!recoveryId.trim()) return;

    const res = await recoverCloudProfile(recoveryId);
    if (res.success) {
      playSuccess();
      setRecoveryMsg({ type: 'success', text: `Profile recovered: ${res.profile?.callsign}!` });
      setRecoveryId('');
    } else {
      playAlert();
      setRecoveryMsg({ type: 'error', text: res.error || 'Failed to recover profile.' });
    }
  };

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(profile.cadetId);
      setCopiedId(true);
      playClick();
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const winRate =
    profile.missionsPlayed > 0
      ? Math.round((profile.missionsWon / profile.missionsPlayed) * 100)
      : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="👨‍🚀 Cadet Dossier & Flight Credentials">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Multi-Cadet Switcher Bar */}
        <div className="bg-[#0B1026]/90 rounded-2xl p-3.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>👥</span> Active Cadet Roster ({roster.length})
            </span>
            <button
              type="button"
              onClick={handleCreateCadet}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#E87040]/20 hover:bg-[#E87040]/30 text-[#E87040] border border-[#E87040]/40 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>+</span> New Cadet
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {roster.map((c) => {
              const isActive = c.cadetId === profile.cadetId;
              return (
                <div
                  key={c.cadetId}
                  className={`
                    group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer
                    ${
                      isActive
                        ? 'bg-[#E87040]/20 border-[#E87040] text-white font-bold shadow-md shadow-[#E87040]/20 ring-1 ring-[#E87040]'
                        : 'bg-[#1a1f3d]/60 border-white/10 text-white/70 hover:bg-[#1a1f3d] hover:text-white'
                    }
                  `}
                  onClick={() => !isActive && handleSwitch(c.cadetId)}
                >
                  <span className="text-base">{c.avatar}</span>
                  <span className="font-mono">{c.callsign}</span>
                  {isActive && <span className="text-[10px] text-[#22C55E]">● Active</span>}
                  {roster.length > 1 && !isActive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(c.cadetId);
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 text-white/40 p-0.5 transition-opacity"
                      title="Delete profile"
                      aria-label={`Delete profile ${c.callsign}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
                    <span>✓</span> Callsign updated and synced to cloud!
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

        {/* Astronaut Mission Specialty Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🚀</span> Mission Specialty &amp; Gameplay Perks
            </h4>
            <span className="text-xs text-[#E87040] font-mono">
              Active: {specialtiesMeta.find((s) => s.id === profile.specialty)?.name || 'Mission Commander'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialtiesMeta.map((spec) => {
              const isSelected = (profile.specialty || 'commander') === spec.id;
              return (
                <div
                  key={spec.id}
                  onClick={() => handleSelectSpecialty(spec.id)}
                  className={`
                    p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between
                    ${
                      isSelected
                        ? `bg-gradient-to-br ${spec.color} ring-2 ring-white/50 shadow-lg scale-[1.02]`
                        : 'bg-[#0B1026]/70 border-white/10 hover:border-white/30 hover:bg-[#1a1f3d]/50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{spec.icon}</span>
                      <div>
                        <h5 className="font-bold text-sm text-white">{spec.name}</h5>
                        <p className="text-[11px] text-[#F8FAFC]/60">{spec.title}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/30 text-[#22C55E] uppercase border border-[#22C55E]/50">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#F8FAFC]/80 mt-2.5 font-medium leading-relaxed">
                    ⚡ {spec.perkDescription}
                  </p>
                </div>
              );
            })}
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

        {/* Cloud Recovery & Sync Section */}
        <div className="p-4 rounded-2xl bg-[#0B1026]/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>☁️</span> Neon Cloud Sync &amp; Device Recovery
            </h4>
            <button
              type="button"
              onClick={handleCopyId}
              className="text-[11px] font-mono text-[#3B82F6] hover:text-[#60A5FA] cursor-pointer flex items-center gap-1"
            >
              {copiedId ? '✓ Copied!' : 'Copy Cadet ID'}
            </button>
          </div>

          <p className="text-xs text-[#F8FAFC]/60">
            Your career progress is automatically backed up. Use your Cadet ID to transfer your profile to any classroom computer or judging device:
          </p>

          <form onSubmit={handleRecover} className="flex gap-2">
            <input
              type="text"
              value={recoveryId}
              onChange={(e) => setRecoveryId(e.target.value)}
              placeholder="Paste Cadet ID (e.g. cadet-xyz...)"
              className="
                flex-1 px-3 py-2 rounded-xl bg-[#1a1f3d] border border-white/20
                text-white font-mono text-xs
                focus:outline-none focus:ring-2 focus:ring-[#3B82F6]
              "
            />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={isCloudSyncing || !recoveryId.trim()}
              className="px-4"
            >
              {isCloudSyncing ? 'Syncing...' : 'Recover'}
            </Button>
          </form>

          {recoveryMsg && (
            <p className={`text-xs font-medium ${recoveryMsg.type === 'success' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {recoveryMsg.text}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <span className="text-xs font-mono text-[#F8FAFC]/40 truncate max-w-[200px]">
            Cadet ID: {profile.cadetId.substring(0, 16)}...
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close Dossier
          </Button>
        </div>
      </div>
    </Modal>
  );
}
