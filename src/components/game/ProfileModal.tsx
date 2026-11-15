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
    isCloudSyncing,
    isDeleting,
    updateCallsign,
    updateAvatar,
    updateSpecialty,
    purgeCadetData,
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

  // Permanent Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatusMsg, setDeleteStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleExecutePurge = async () => {
    playAlert();
    setDeleteStatusMsg(null);
    const res = await purgeCadetData(profile.cadetId);
    if (res.success) {
      playSuccess();
      setShowDeleteConfirm(false);
      setDeleteStatusMsg({
        type: 'success',
        text: 'All records for cadet permanently reset on local device and cloud storage.',
      });
      setTimeout(() => setDeleteStatusMsg(null), 4000);
    } else {
      setDeleteStatusMsg({
        type: 'error',
        text: res.error || 'Failed to complete reset.',
      });
    }
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
        {/* Callsign & Avatar Identity Section */}
        <div className="bg-[#1a1f3d]/90 rounded-2xl p-5 border border-slate-700 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Active Patch Avatar */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-cyan-400 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-[#0B1026] rounded-2xl flex items-center justify-center text-4xl">
                  {profile.avatar}
                </div>
              </div>
            </div>

            {/* Callsign Editor */}
            <div className="flex-1 w-full">
              <form onSubmit={handleSaveCallsign} className="space-y-2">
                <label htmlFor="callsign-input" className="block text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
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
                      focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent
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
                        ? 'bg-cyan-400/20 border-2 border-cyan-400 scale-110 shadow-md shadow-cyan-400/20'
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
            <span className="text-xs text-cyan-400 font-mono">
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
                        ? `${spec.color} ring-2 ring-cyan-400 shadow-md scale-[1.02]`
                        : 'bg-[#0B1026]/70 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/50'
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
              <span className="text-xl font-extrabold text-cyan-400 tabular-nums">
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

        {/* Badges Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🏅</span> Flight Badges &amp; Achievements
            </h4>
            <span className="text-xs font-mono text-cyan-400">
              {profile.badges.length} / {badgesMeta.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badgesMeta.map((badge) => {
              const isEarned = profile.badges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`
                    p-3 rounded-xl border flex items-center gap-3 transition-all
                    ${
                      isEarned
                        ? 'bg-[#1a1f3d]/80 border-cyan-400/50 shadow-md'
                        : 'bg-[#0B1026]/40 border-white/5 opacity-50'
                    }
                  `}
                >
                  <div
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                      ${isEarned ? 'bg-cyan-400/20 border border-cyan-400/40' : 'bg-slate-800 border border-white/5 grayscale'}
                    `}
                  >
                    {badge.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold truncate ${isEarned ? 'text-white' : 'text-[#F8FAFC]/40'}`}>
                        {badge.name}
                      </span>
                      {isEarned && (
                        <span className="text-[10px] text-[#22C55E] font-bold">✓</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#F8FAFC]/60 truncate">{badge.description}</p>
                    <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                      Req: {badge.requirement}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cloud Sync & Cadet ID Section */}
        <div className="p-4 rounded-2xl bg-[#0B1026]/90 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>☁️</span> Neon Cloud Sync &amp; Cadet ID
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
              Synced
            </span>
          </div>

          <p className="text-xs text-[#F8FAFC]/70 leading-relaxed">
            Your telemetry and credentials are saved to this browser and synced to Neon Postgres. Use your unique Cadet ID to restore your profile on another computer or browser:
          </p>

          <div className="flex items-center gap-2 bg-[#1a1f3d] p-2.5 rounded-xl border border-white/10">
            <code className="text-xs font-mono text-cyan-300 flex-1 truncate select-all">
              {profile.cadetId}
            </code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyId}
              className="px-3 text-xs"
            >
              {copiedId ? 'Copied!' : 'Copy ID'}
            </Button>
          </div>

          {/* Cloud Recovery Form */}
          <form onSubmit={handleRecover} className="pt-2 border-t border-white/10 flex gap-2">
            <input
              type="text"
              value={recoveryId}
              onChange={(e) => setRecoveryId(e.target.value)}
              placeholder="Paste Cadet ID (e.g. cadet-xyz...)"
              className="
                flex-1 px-3 py-2 rounded-xl bg-[#1a1f3d] border border-white/20
                text-white font-mono text-xs
                focus:outline-none focus:ring-2 focus:ring-cyan-400
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

        {/* Danger Zone: Local & Cloud Data Erasure */}
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚠️</span> Data Privacy &amp; Permanent Erasure
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
              Local + Cloud
            </span>
          </div>

          <p className="text-xs text-[#F8FAFC]/70 leading-relaxed">
            Permanently reset this cadet&apos;s dossier, active mission saves, career badges, and leaderboard rankings from both this device (<code className="text-amber-300 text-[11px]">localStorage</code>) and Neon Postgres cloud storage.
          </p>

          {!showDeleteConfirm ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowDeleteConfirm(true);
                }}
                className="
                  px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/40
                  text-red-300 hover:text-red-200 font-mono text-xs font-bold transition-all
                  flex items-center gap-2 cursor-pointer
                "
              >
                <span>🗑️</span> Reset Cadet Data (Local &amp; Cloud)
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-900/30 border border-red-500/50 space-y-3">
              <p className="text-xs text-red-200 font-medium">
                Are you sure you want to permanently erase all records for <strong>{profile.callsign}</strong>? This action will purge your dossier, save state, and leaderboard rankings from both this browser and Neon cloud storage.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecutePurge}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-500 text-white border-red-700 text-xs px-4"
                >
                  {isDeleting ? 'Resetting Cloud & Local...' : 'Yes, Permanently Reset'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    playClick();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={isDeleting}
                  className="text-xs px-3"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {deleteStatusMsg && (
            <p className={`text-xs font-medium ${deleteStatusMsg.type === 'success' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {deleteStatusMsg.text}
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
