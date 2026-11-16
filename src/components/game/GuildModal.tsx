// ─── Junior Astronaut Mission Trainer – Orbital Guilds & Outpost Alliances Modal ───

'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useProfile } from '@/lib/profile';
import { useBattlePass } from '@/lib/battlePass';
import { useWallet } from '@/context/WalletContext';
import { useGuild } from '@/lib/guildClient';
import {
  GUILD_EMBLEM_OPTIONS,
  GUILD_CREATION_FEE_MC,
  GUILD_TREASURY_BUFFS,
  getGuildBuff,
  getNextBuffMilestone,
  validateGuildName,
  validateGuildTag,
  MAX_GUILD_MEMBERS,
} from '@/lib/guildTypes';
import type { Guild, GuildMember } from '@/lib/guildTypes';
import { playClick, playAction, playSuccess, playWarning } from '@/lib/sound';

interface GuildModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalTab = 'my_guild' | 'directory' | 'leaderboard';

export default function GuildModal({ isOpen, onClose }: GuildModalProps) {
  const { profile } = useProfile();
  const { state: bpState } = useBattlePass();
  const { creditsBalance: walletMC, syncWallet, isFiveStarGeneral: walletVip } = useWallet();
  const isFiveStar = walletVip || Boolean(bpState.isFiveStarGeneral);

  const {
    currentGuild,
    allGuilds,
    isLoading,
    refreshGuilds,
    createGuild,
    joinGuild,
    leaveGuild,
    donate,
  } = useGuild(profile.cadetId);

  const [activeTab, setActiveTab] = useState<ModalTab>('my_guild');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Directory search
  const [searchQuery, setSearchQuery] = useState('');

  // Found Guild Form
  const [isFoundingOpen, setIsFoundingOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTag, setFormTag] = useState('');
  const [formEmblem, setFormEmblem] = useState<string>('🛡️');
  const [formMotto, setFormMotto] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Custom donate amount
  const [customDonateAmount, setCustomDonateAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      refreshGuilds();
      if (!currentGuild) {
        setActiveTab('directory');
      } else {
        setActiveTab('my_guild');
      }
    }
  }, [isOpen, currentGuild?.id]);

  const showToast = (text: string, type: 'success' | 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFoundGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formName.trim();
    const cleanTag = formTag.trim().toUpperCase();

    if (!validateGuildName(cleanName)) {
      setFormError('Guild name must be between 3 and 24 characters.');
      playWarning();
      return;
    }
    if (!validateGuildTag(cleanTag)) {
      setFormError('Guild tag must be 2 to 4 uppercase alphanumeric characters (e.g. ARES, MARS).');
      playWarning();
      return;
    }
    if (!isFiveStar && walletMC < GUILD_CREATION_FEE_MC) {
      setFormError(`Insufficient Galaxy Coins! Required: ${GUILD_CREATION_FEE_MC} GC (Wallet: ${walletMC} GC).`);
      playWarning();
      return;
    }

    setIsSubmitting(true);
    playAction();
    const res = await createGuild({
      name: cleanName,
      tag: cleanTag,
      emblem: formEmblem,
      motto: formMotto.trim(),
      cadetId: profile.cadetId,
      callsign: profile.callsign || 'CADET',
      avatar: profile.avatar || '👨‍🚀',
      isFiveStarGeneral: isFiveStar,
    });
    setIsSubmitting(false);

    if (res.success && res.guild) {
      playSuccess();
      showToast(`Alliance [${res.guild.tag}] ${res.guild.name} successfully commissioned!`, 'success');
      setIsFoundingOpen(false);
      setFormName('');
      setFormTag('');
      setFormMotto('');
      setActiveTab('my_guild');
      if (typeof res.remainingCredits === 'number') {
        syncWallet(res.remainingCredits);
      }
    } else {
      setFormError(res.error || 'Failed to commission alliance');
      playWarning();
    }
  };

  const handleJoin = async (targetGuild: Guild) => {
    if (currentGuild) {
      showToast('You must leave your current alliance before enlisting elsewhere.', 'error');
      playWarning();
      return;
    }
    if (targetGuild.members.length >= MAX_GUILD_MEMBERS) {
      showToast('This alliance has reached maximum member capacity (20/20).', 'error');
      playWarning();
      return;
    }

    setIsSubmitting(true);
    playAction();
    const res = await joinGuild(targetGuild.id, {
      cadetId: profile.cadetId,
      callsign: profile.callsign || 'CADET',
      avatar: profile.avatar || '👨‍🚀',
    });
    setIsSubmitting(false);

    if (res.success && res.guild) {
      playSuccess();
      showToast(`Enlisted in [${res.guild.tag}] ${res.guild.name}!`, 'success');
      setActiveTab('my_guild');
    } else {
      showToast(res.error || 'Failed to join alliance', 'error');
      playWarning();
    }
  };

  const handleLeave = async () => {
    if (!currentGuild) return;
    const isLeader = currentGuild.leaderId === profile.cadetId;
    const confirmPrompt = isLeader
      ? `Are you sure you want to resign as Commander of [${currentGuild.tag}]? If there are other members, leadership will pass to the next officer; otherwise, the alliance will be permanently disbanded.`
      : `Are you sure you want to depart [${currentGuild.tag}] ${currentGuild.name}?`;

    if (!window.confirm(confirmPrompt)) return;

    setIsSubmitting(true);
    playWarning();
    const res = await leaveGuild(currentGuild.id, profile.cadetId);
    setIsSubmitting(false);

    if (res.success) {
      showToast('Departed alliance.', 'success');
      setActiveTab('directory');
    } else {
      showToast(res.error || 'Failed to leave alliance', 'error');
    }
  };

  const handleDonate = async (amount: number) => {
    if (!currentGuild) return;
    if (amount <= 0) return;
    if (walletMC < amount) {
      showToast(`Insufficient Galaxy Coins! Required: ${amount} GC (Wallet: ${walletMC} GC).`, 'error');
      playWarning();
      return;
    }

    setIsSubmitting(true);
    playAction();
    const res = await donate(currentGuild.id, profile.cadetId, amount);
    setIsSubmitting(false);

    if (res.success && res.guild) {
      playSuccess();
      showToast(`Contributed ${amount.toLocaleString()} GC to ${res.guild.name} Treasury!`, 'success');
      if (typeof res.remainingCredits === 'number') {
        syncWallet(res.remainingCredits);
      }
      setCustomDonateAmount('');
    } else {
      showToast(res.error || 'Donation failed', 'error');
      playWarning();
    }
  };

  // Filtered directory guilds
  const filteredGuilds = allGuilds.filter((g) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || g.tag.toLowerCase().includes(q) || (g.motto && g.motto.toLowerCase().includes(q));
  });

  // Calculate buff milestone for active guild
  const milestone = currentGuild ? getNextBuffMilestone(currentGuild.treasuryMC) : null;
  const activeBuff = currentGuild ? getGuildBuff(currentGuild.buffLevel) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🛡️ Orbital Guilds & Outpost Alliances"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 text-[#F8FAFC]">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-mono font-bold flex items-center justify-between animate-slide-up ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            <span>{toastMessage.type === 'success' ? '✅' : '⚠️'} {toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/60 hover:text-white ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation & Wallet Balance Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('my_guild');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-extrabold transition-all cursor-pointer ${
                activeTab === 'my_guild'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              My Alliance
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('directory');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-extrabold transition-all cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Guild Directory ({allGuilds.length})
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab('leaderboard');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-heading font-extrabold transition-all cursor-pointer ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Alliance Leaderboard 🏆
            </button>
          </div>

          {/* Wallet GC indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs font-mono">
            <span className="text-emerald-400 font-extrabold">💰 {walletMC.toLocaleString()} GC</span>
            {isFiveStar && (
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-400/40">
                VIP FREE FOUNDING
              </span>
            )}
          </div>
        </div>

        {/* ── TAB 1: MY ALLIANCE ── */}
        {activeTab === 'my_guild' && (
          <div className="space-y-4">
            {!currentGuild ? (
              <div className="text-center py-12 px-6 rounded-2xl bg-slate-900/60 border border-dashed border-white/20 space-y-4">
                <span className="text-5xl block animate-float">🛰️</span>
                <div className="space-y-1">
                  <h3 className="font-heading font-extrabold text-xl text-white">
                    Unenlisted Commander
                  </h3>
                  <p className="text-xs text-starlight/70 max-w-md mx-auto">
                    You are not currently enlisted in an Orbital Guild. Join an established alliance to unlock life-support starting buffs and credit windfalls, or commission your own fleet!
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => {
                      playClick();
                      setActiveTab('directory');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs transition-all cursor-pointer shadow"
                  >
                    Browse Guild Directory →
                  </button>
                  <button
                    onClick={() => {
                      playClick();
                      setActiveTab('directory');
                      setIsFoundingOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/20 font-heading font-extrabold text-xs transition-all cursor-pointer"
                  >
                    + Found New Guild
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alliance Header Banner */}
                <div className={`p-5 rounded-2xl border ${
                  currentGuild.buffLevel === 5
                    ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-amber-400/60 shadow-[0_0_15px_rgba(251,191,36,0.15)]'
                    : 'bg-slate-900/80 border-cyan-500/30'
                } flex flex-col md:flex-row items-start md:items-center justify-between gap-4`}>
                  <div className="flex items-center gap-3.5">
                    <span className="text-4xl p-2 rounded-2xl bg-slate-800 border border-white/10 shadow">
                      {currentGuild.emblem}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                          currentGuild.buffLevel === 5
                            ? 'text-amber-300 bg-amber-400/20 border border-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                            : 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/40'
                        }`}>
                          [{currentGuild.tag}]
                        </span>
                        <h2 className="font-heading font-extrabold text-xl text-white">
                          {currentGuild.name}
                        </h2>
                        {currentGuild.buffLevel === 5 && (
                          <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/50">
                            ★ GOLD TRIM ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-starlight/70 italic mt-0.5">
                        &quot;{currentGuild.motto || 'Standing firm across the Martian frontier.'}&quot;
                      </p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-white/60 mt-1">
                        <span>Commander: <strong className="text-white">{currentGuild.members.find((m) => m.role === 'leader')?.callsign || 'HQ'}</strong></span>
                        <span>•</span>
                        <span>Enlisted: <strong className="text-white">{currentGuild.members.length}/20</strong></span>
                        <span>•</span>
                        <span>Alliance Score: <strong className="text-emerald-400">{currentGuild.totalGuildScore.toLocaleString()} pts</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={handleLeave}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      {currentGuild.leaderId === profile.cadetId ? 'Resign / Disband' : 'Leave Guild'}
                    </button>
                  </div>
                </div>

                {/* Treasury Progression & Active Buffs Card */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                          Allied Treasury: {currentGuild.treasuryMC.toLocaleString()} GC
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          currentGuild.buffLevel === 5 ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                        }`}>
                          BUFF LEVEL {currentGuild.buffLevel} OF 5
                        </span>
                      </div>
                      <p className="text-xs text-white font-bold mt-0.5">
                        {activeBuff?.name} ({activeBuff?.description})
                      </p>
                    </div>

                    {/* Quick Donation Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => handleDonate(100)}
                        disabled={isSubmitting || walletMC < 100}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
                      >
                        +100 GC
                      </button>
                      <button
                        onClick={() => handleDonate(500)}
                        disabled={isSubmitting || walletMC < 500}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
                      >
                        +500 GC
                      </button>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="Amt"
                          value={customDonateAmount}
                          onChange={(e) => setCustomDonateAmount(e.target.value)}
                          className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-white/20 text-xs font-mono text-white text-right"
                        />
                        <button
                          onClick={() => handleDonate(Number(customDonateAmount))}
                          disabled={isSubmitting || !customDonateAmount || Number(customDonateAmount) <= 0 || walletMC < Number(customDonateAmount)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 font-mono font-extrabold text-xs transition-all cursor-pointer disabled:opacity-40"
                        >
                          Give
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Milestone Progress Bar */}
                  {milestone && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-starlight/70">
                        <span>
                          {milestone.nextLevel ? `Progress to Level ${milestone.nextLevel}: ${milestone.remainingMC.toLocaleString()} GC remaining` : 'Maximum Clan Hegemony Reached!'}
                        </span>
                        <span>{milestone.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-slate-950 border border-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            currentGuild.buffLevel === 5
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                              : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                          }`}
                          style={{ width: `${milestone.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 5-Level Treasury Milestones Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1 text-[10px] font-mono">
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      const buff = GUILD_TREASURY_BUFFS[lvl];
                      const isUnlocked = currentGuild.buffLevel >= lvl;
                      const isCurrent = currentGuild.buffLevel === lvl;
                      return (
                        <div
                          key={lvl}
                          className={`p-1.5 rounded-lg border text-center transition-all ${
                            isCurrent
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                              : isUnlocked
                              ? 'bg-slate-950/60 border-emerald-500/30 text-emerald-300/80'
                              : 'bg-slate-950/30 border-white/5 text-white/40'
                          }`}
                        >
                          <span className="block font-black">
                            {lvl === 5 ? '★ LV.5' : `LV.${lvl}`} ({buff.minTreasuryMC >= 1000 ? `${buff.minTreasuryMC / 1000}k` : buff.minTreasuryMC} GC)
                          </span>
                          <span className="text-[9px] block leading-tight mt-0.5">
                            {buff.vitalsBonusPercent}% vitals {buff.creditsBonusPercent > 0 ? `• +${buff.creditsBonusPercent}% GC` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Member Roster Table */}
                <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
                  <div className="p-3 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                    <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-white">
                      Enlisted Cadets ({currentGuild.members.length}/20)
                    </h3>
                    <span className="text-[11px] font-mono text-starlight/60">
                      Ranked by score contribution
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950/40 text-starlight/60 uppercase text-[10px] border-b border-white/5">
                        <tr>
                          <th className="py-2 px-3">Cadet</th>
                          <th className="py-2 px-3">Rank / Role</th>
                          <th className="py-2 px-3 text-right">Contributed GC</th>
                          <th className="py-2 px-3 text-right">Score Contributed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {currentGuild.members
                          .slice()
                          .sort((a, b) => b.contributedScore - a.contributedScore || b.contributedMC - a.contributedMC)
                          .map((member: GuildMember) => {
                            const isYou = member.cadetId === profile.cadetId;
                            return (
                              <tr
                                key={member.cadetId}
                                className={isYou ? 'bg-cyan-500/10' : 'hover:bg-white/5'}
                              >
                                <td className="py-2 px-3 flex items-center gap-2">
                                  <span className="text-base">{member.avatar}</span>
                                  <div>
                                    <span className="font-bold text-white block">
                                      {member.callsign}
                                      {isYou && (
                                        <span className="text-[9px] text-cyan-400 ml-1.5 font-extrabold">
                                          (YOU)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                      member.role === 'leader'
                                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                        : member.role === 'officer'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                        : 'bg-white/10 text-white/70'
                                    }`}
                                  >
                                    {member.role === 'leader' ? '👑 Commander' : member.role === 'officer' ? '🎖️ Officer' : '👨‍🚀 Cadet'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                                  +{member.contributedMC.toLocaleString()} GC
                                </td>
                                <td className="py-2 px-3 text-right text-cyan-300 font-bold">
                                  {member.contributedScore.toLocaleString()} pts
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: GUILD DIRECTORY ── */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Search Bar & Found Guild Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search alliance name, tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-8 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute left-2.5 top-2.5 text-xs text-white/50">🔍</span>
              </div>

              {!isFoundingOpen && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsFoundingOpen(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs transition-all cursor-pointer shadow"
                >
                  + Found New Guild ({isFiveStar ? 'FREE' : `${GUILD_CREATION_FEE_MC} GC`})
                </button>
              )}
            </div>

            {/* Found New Guild Form */}
            {isFoundingOpen && (
              <form
                onSubmit={handleFoundGuild}
                className="p-5 rounded-2xl bg-slate-900 border border-cyan-400/40 space-y-4 animate-slide-up"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="font-heading font-extrabold text-sm text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <span>🛸</span> Commission New Orbital Guild
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFoundingOpen(false)}
                    className="text-white/60 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel ✕
                  </button>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono">
                    ⚠️ {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-starlight/70 uppercase block mb-1">
                      Guild Name (3–24 chars)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ares Vanguard"
                      maxLength={24}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-starlight/70 uppercase block mb-1">
                      Clan Tag (2–4 chars, e.g. ARES)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ARES"
                      maxLength={4}
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-xs font-bold text-white font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-starlight/70 uppercase block mb-1">
                    Select Emblem
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {GUILD_EMBLEM_OPTIONS.map((emb) => (
                      <button
                        key={emb}
                        type="button"
                        onClick={() => setFormEmblem(emb)}
                        className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${
                          formEmblem === emb
                            ? 'bg-cyan-500/20 border-cyan-400 scale-110 shadow'
                            : 'bg-slate-950 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {emb}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-starlight/70 uppercase block mb-1">
                    Alliance Motto
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. First to colonize, last to yield."
                    maxLength={60}
                    value={formMotto}
                    onChange={(e) => setFormMotto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-starlight/60">
                    Fee: {isFiveStar ? 'FREE (Five-Star General)' : `${GUILD_CREATION_FEE_MC} GC`}
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-extrabold text-xs transition-all cursor-pointer shadow"
                  >
                    {isSubmitting ? 'Commissioning...' : 'Found Guild →'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Guilds */}
            <div className="space-y-2.5">
              {filteredGuilds.length === 0 ? (
                <div className="text-center py-10 rounded-xl bg-slate-900/40 text-xs font-mono text-starlight/60">
                  No orbital alliances match your search criteria.
                </div>
              ) : (
                filteredGuilds.map((g) => {
                  const isCurrent = currentGuild?.id === g.id;
                  const isFull = g.members.length >= MAX_GUILD_MEMBERS;
                  const buff = getGuildBuff(g.buffLevel);

                  return (
                    <div
                      key={g.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-cyan-950/20 border-cyan-400/50'
                          : g.buffLevel === 5
                          ? 'bg-slate-900/90 border-amber-400/40 hover:border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.1)]'
                          : 'bg-slate-900/70 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-white/10">
                          {g.emblem}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                              g.buffLevel === 5
                                ? 'text-amber-300 bg-amber-400/20 border border-amber-400/80'
                                : 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/30'
                            }`}>
                              [{g.tag}]
                            </span>
                            <h4 className="font-heading font-extrabold text-sm text-white">
                              {g.name}
                            </h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-starlight/80 border border-white/10">
                              Lv.{g.buffLevel} Buff
                            </span>
                          </div>
                          {g.motto && (
                            <p className="text-xs text-starlight/70 italic mt-0.5">
                              &quot;{g.motto}&quot;
                            </p>
                          )}
                          <div className="flex items-center gap-2.5 text-[10px] font-mono text-starlight/60 mt-1">
                            <span>Score: <strong className="text-emerald-400">{g.totalGuildScore.toLocaleString()}</strong></span>
                            <span>•</span>
                            <span>Treasury: <strong className="text-white">{g.treasuryMC.toLocaleString()} GC</strong></span>
                            <span>•</span>
                            <span>{g.members.length}/20 Cadets</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isCurrent ? (
                          <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-extrabold">
                            ENLISTED
                          </span>
                        ) : (
                          <button
                            onClick={() => handleJoin(g)}
                            disabled={isSubmitting || Boolean(currentGuild) || isFull}
                            className={`px-4 py-1.5 rounded-xl text-xs font-heading font-extrabold transition-all cursor-pointer ${
                              isFull
                                ? 'bg-slate-800 text-white/40 border border-white/5 cursor-not-allowed'
                                : Boolean(currentGuild)
                                ? 'bg-slate-800 text-white/40 border border-white/10 cursor-not-allowed'
                                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow'
                            }`}
                          >
                            {isFull ? 'Full (20/20)' : 'Join Alliance'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: ALLIANCE LEADERBOARD ── */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/30 border border-amber-500/30 text-center space-y-1">
              <span className="text-3xl block">🏆</span>
              <h3 className="font-heading font-extrabold text-base text-amber-300">
                Martian Sector Alliance Rankings
              </h3>
              <p className="text-xs text-starlight/70 max-w-lg mx-auto">
                Ranked by cumulative mission scores contributed by enlisted commanders and planetary treasury investment.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/60 text-starlight/60 uppercase text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Alliance</th>
                    <th className="py-2.5 px-3">Buff Tier</th>
                    <th className="py-2.5 px-3 text-right">Treasury</th>
                    <th className="py-2.5 px-3 text-right">Alliance Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allGuilds
                    .slice()
                    .sort((a, b) => b.totalGuildScore - a.totalGuildScore || b.treasuryMC - a.treasuryMC)
                    .map((g, idx) => {
                      const isTop3 = idx < 3;
                      const medals = ['🥇 #1', '🥈 #2', '🥉 #3'];
                      const rankLabel = medals[idx] || `#${idx + 1}`;
                      const isYouInGuild = currentGuild?.id === g.id;

                      return (
                        <tr
                          key={g.id}
                          className={`${
                            isYouInGuild
                              ? 'bg-cyan-500/10'
                              : isTop3
                              ? 'bg-amber-500/5 hover:bg-amber-500/10'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold font-mono">
                            <span className={isTop3 ? 'text-amber-400 font-black' : 'text-white/60'}>
                              {rankLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 flex items-center gap-2">
                            <span className="text-lg">{g.emblem}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                                  g.buffLevel === 5
                                    ? 'text-amber-300 bg-amber-400/20 border border-amber-400/70'
                                    : 'text-cyan-300 bg-cyan-500/20 border border-cyan-400/30'
                                }`}>
                                  [{g.tag}]
                                </span>
                                <span className="font-bold text-white">
                                  {g.name}
                                </span>
                                {isYouInGuild && (
                                  <span className="text-[9px] text-cyan-400 font-extrabold ml-1">
                                    (YOURS)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-white/50 block">
                                {g.members.length} / 20 members
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              g.buffLevel === 5
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                                : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              Level {g.buffLevel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {g.treasuryMC.toLocaleString()} GC
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400 text-sm">
                            {g.totalGuildScore.toLocaleString()} pts
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
