'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useGame } from './GameProvider';
import { useSound } from '@/lib/sound';

interface PauseMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeDifficulty?: () => void;
}

export default function PauseMenu({ isOpen, onClose, onChangeDifficulty }: PauseMenuProps) {
  const { state, dispatch } = useGame();
  const { isMuted, toggleSound, playClick } = useSound();
  const [activeTab, setActiveTab] = useState<'menu' | 'rules' | 'science'>('menu');

  const handleRestart = () => {
    playClick();
    dispatch({ type: 'RESTART' });
    onClose();
  };

  const handleChangeDifficulty = () => {
    playClick();
    onClose();
    if (onChangeDifficulty) {
      onChangeDifficulty();
    } else {
      window.location.reload();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⏸️ Outpost Command & Pause Menu">
      <div className="space-y-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 pb-3 gap-2">
          <button
            onClick={() => {
              playClick();
              setActiveTab('menu');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'menu'
                ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                : 'bg-[#1a1f3d] text-[#F8FAFC]/60 hover:text-white'
            }`}
          >
            ⚙️ Command Actions
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('rules');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'rules'
                ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                : 'bg-[#1a1f3d] text-[#F8FAFC]/60 hover:text-white'
            }`}
          >
            📖 Quick Rules
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveTab('science');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
              activeTab === 'science'
                ? 'bg-gradient-to-r from-[#E87040] to-[#6B3FA0] text-white shadow-md'
                : 'bg-[#1a1f3d] text-[#F8FAFC]/60 hover:text-white'
            }`}
          >
            🔬 NASA Sources
          </button>
        </div>

        {/* Tab 1: Command Menu */}
        {activeTab === 'menu' && (
          <div className="space-y-3 py-2">
            {/* Mission Status Header */}
            <div className="bg-[#0B1026]/80 rounded-xl p-3 border border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#F8FAFC]/70">
                Current Outpost: <strong className="text-white">Sol {state.sol} / {state.maxSol}</strong>
              </span>
              <span className="px-2.5 py-1 rounded bg-[#6B3FA0]/30 text-[#E87040] font-mono font-bold uppercase">
                {state.difficulty} Mode
              </span>
            </div>

            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#1a1f3d] border border-white/10 hover:border-[#6B3FA0] transition-colors cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isMuted ? '🔇' : '🔊'}</span>
                <div className="text-left">
                  <span className="font-bold text-sm text-white block">Synthesized Sound FX</span>
                  <span className="text-xs text-[#F8FAFC]/50">Procedural Web Audio synthesizer</span>
                </div>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                  isMuted ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                }`}
              >
                {isMuted ? 'MUTED' : 'ENABLED'}
              </span>
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <Button
                variant="primary"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                className="w-full justify-center text-sm py-3"
              >
                ▶️ Resume Mission
              </Button>

              <Button
                variant="secondary"
                onClick={handleRestart}
                className="w-full justify-center text-sm py-3"
              >
                🔄 Restart Current Mission
              </Button>

              <Button
                variant="secondary"
                onClick={handleChangeDifficulty}
                className="w-full justify-center text-sm py-3"
              >
                🎖️ Change Difficulty / Re-briefing
              </Button>

              <Link
                href="/"
                onClick={playClick}
                className="w-full inline-flex items-center justify-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/40 hover:bg-red-900/50 text-red-300 font-bold text-sm transition-colors min-h-[44px]"
              >
                🚪 Exit to Main Menu
              </Link>
            </div>
          </div>
        )}

        {/* Tab 2: Quick Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-3 text-xs text-[#F8FAFC]/80 max-h-[55vh] overflow-y-auto pr-1">
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-white text-sm block">Survival Conditions</strong>
              <p>Survive 30 sols. If Power ⚡, Oxygen 🫁, or Shielding 🛡️ reaches 0%, mission ends.</p>
            </div>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-white text-sm block">Natural Sol Consumption</strong>
              <p>Each day uses Power (-8%), Oxygen (-6%), and Shielding (-3%).</p>
            </div>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-white text-sm block">Crew Morale</strong>
              <p>Morale above 70% grants +15% efficiency to resource production. Don&apos;t neglect crew wellbeing!</p>
            </div>
          </div>
        )}

        {/* Tab 3: NASA Science Sources */}
        {activeTab === 'science' && (
          <div className="space-y-3 text-xs text-[#F8FAFC]/80 max-h-[55vh] overflow-y-auto pr-1">
            <p className="text-[#F8FAFC]/60">
              The mission scenarios and data models in this trainer are powered by real NASA open datasets:
            </p>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-[#E87040] block">☀️ NASA DONKI</strong>
              <p>Space Weather Database of Notifications, Knowledge, Information. Drives all solar flare and CME alert events.</p>
            </div>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-[#22C55E] block">🛡️ RadLab (ISS Dosimetry)</strong>
              <p>Real radiation dose measurements recorded by dosimetry instruments aboard the ISS.</p>
            </div>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-[#3B82F6] block">🧬 NASA OSDR Space Biology</strong>
              <p>Research into microgravity and radiation impact on bone density, immune health, and astronaut sleep.</p>
            </div>
            <div className="p-3 bg-[#0B1026]/70 rounded-xl border border-white/10 space-y-1">
              <strong className="text-[#6B3FA0] block">🌱 Canadian Space Agency (CSA)</strong>
              <p>Space Food Production &amp; STEM Toolkits for youth exploration and nutrition.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-white/10 text-xs text-[#F8FAFC]/40">
          <span>Press ESC anytime to resume</span>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Back to Simulation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
