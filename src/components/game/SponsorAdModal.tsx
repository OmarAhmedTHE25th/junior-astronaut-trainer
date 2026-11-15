// ─── Junior Astronaut Mission Trainer – Sponsor Commercial Broadcast Modal ───
// Mandatory in-flight broadcast sponsored by Ares Consortium & BK Orbital.

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBattlePass } from '@/lib/battlePass';
import { useGame } from './GameProvider';
import { playClick, playAction, playSuccess, playWarning, playAlert } from '@/lib/sound';

interface SponsorAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  rewardMode: 'credits' | 'vitals';
  cadetId?: string;
  onRewardClaimed?: (creditsGranted?: number) => void;
}

const DODGE_POSITIONS = [
  { top: '16px', right: '16px', bottom: 'auto', left: 'auto' },
  { top: '16px', left: '16px', bottom: 'auto', right: 'auto' },
  { bottom: '24px', right: '24px', top: 'auto', left: 'auto' },
  { bottom: '24px', left: '24px', top: 'auto', right: 'auto' },
  { top: '45%', right: '16px', bottom: 'auto', left: 'auto' },
  { top: '35%', left: '20px', bottom: 'auto', right: 'auto' },
  { top: '70%', right: '30%', bottom: 'auto', left: 'auto' },
];

export default function SponsorAdModal({
  isOpen,
  onClose,
  rewardMode,
  cadetId,
  onRewardClaimed,
}: SponsorAdModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { state: bpState } = useBattlePass();
  const isFiveStar = Boolean(bpState.isFiveStarGeneral);

  // Safely attempt useGame if inside GameProvider; null if on store page
  let gameContext: ReturnType<typeof useGame> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gameContext = useGame();
  } catch {
    gameContext = null;
  }

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [dodgeIndex, setDodgeIndex] = useState(0);
  const [sarcasticToast, setSarcasticToast] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Trigger deceptive dodging button gag
  const triggerFakeCloseGag = useCallback(() => {
    playWarning();
    setDodgeIndex((prev) => (prev + 1) % DODGE_POSITIONS.length);
    setSarcasticToast('Nice try, Cadet. Ares Consortium requires 100% commercial engagement.');
    setTimeout(() => setSarcasticToast(null), 3500);
  }, []);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!isEnded) {
          triggerFakeCloseGag();
        } else {
          handleClaimReward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isEnded, triggerFakeCloseGag]);

  // Handle Video Initialization & Unmuted Autoplay Enforcement
  useEffect(() => {
    if (!isOpen) {
      setIsEnded(false);
      setCurrentTime(0);
      setDuration(0);
      setIsAutoplayBlocked(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.volume = 1.0;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsAutoplayBlocked(false);
        })
        .catch(() => {
          // Autoplay policy prevented unmuted playback: play muted and prompt user to unmute
          setIsAutoplayBlocked(true);
          video.muted = true;
          video.play().catch(() => {});
        });
    }
  }, [isOpen]);

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1.0;
    video.currentTime = 0;
    video.play().catch(() => {});
    setIsAutoplayBlocked(false);
    setCurrentTime(0);
    playAction();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
      if (video.currentTime >= video.duration - 0.25) {
        setIsEnded(true);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
  };

  const handleEnded = () => {
    setIsEnded(true);
  };

  // Prevent pausing during ad playback
  const handlePause = () => {
    if (!isEnded && isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Fulfill Reward
  const handleClaimReward = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    playSuccess();

    try {
      if (rewardMode === 'credits') {
        const targetCadetId = cadetId || 'cadet-nova-01';
        await fetch('/api/market/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: targetCadetId,
            credits: 150,
          }),
        }).catch(() => {});

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('jat-wallet-updated'));
        }

        if (onRewardClaimed) {
          onRewardClaimed(150);
        }
      } else if (rewardMode === 'vitals') {
        if (gameContext) {
          gameContext.dispatch({ type: 'APPLY_SPONSOR_RELIEF' });
        }
        if (onRewardClaimed) {
          onRewardClaimed();
        }
      }
    } finally {
      setIsClaiming(false);
      onClose();
    }
  };

  // Instant Skip for Five-Star Generals
  const handleVipInstantSkip = () => {
    playSuccess();
    handleClaimReward();
  };

  if (!isOpen) return null;

  const currentDodge = DODGE_POSITIONS[dodgeIndex];
  const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;
  const secondsRemaining = Math.max(0, Math.ceil(duration - currentTime));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-title"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-6 overflow-hidden select-none"
    >
      {/* Scanline CRT Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.18),rgba(0,0,0,0.18)_1px,transparent_1px,transparent_2px)] opacity-70"
        aria-hidden="true"
      />

      {/* Main Broadcast Terminal Frame */}
      <div className="relative z-20 w-full max-w-4xl rounded-3xl border-4 border-amber-500/80 bg-slate-950 p-4 sm:p-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center">
        {/* Top Header Marquee */}
        <div className="w-full flex items-center justify-between border-b-2 border-amber-500/40 pb-3 mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <span id="sponsor-title" className="font-mono font-black text-xs sm:text-sm text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <span>📡 [ARES HIJACK]</span>
              <span className="hidden sm:inline">MANDATORY COMMERCIAL BROADCAST</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Five-Star General VIP Instant Skip Button */}
            {isFiveStar && (
              <button
                type="button"
                onClick={handleVipInstantSkip}
                className="
                  px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300
                  hover:from-amber-300 hover:to-yellow-200
                  text-slate-950 font-heading font-black text-xs uppercase tracking-wider
                  shadow-[0_0_15px_rgba(251,191,36,0.5)] cursor-pointer hover:scale-105 active:scale-95 transition-all
                  flex items-center gap-1.5
                "
              >
                <span>👑</span>
                <span>Five-Star General: Instant Ad-Free Claim</span>
              </button>
            )}

            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              SPONSORED BY BK ORBITAL
            </span>
          </div>
        </div>

        {/* Sarcastic Troll Toast Banner */}
        {sarcasticToast && (
          <div className="absolute top-16 z-40 px-4 py-2 rounded-xl bg-rose-600/90 text-white font-mono font-extrabold text-xs shadow-2xl border-2 border-rose-300 animate-bounce">
            ⚠️ {sarcasticToast}
          </div>
        )}

        {/* Video Player Container */}
        <div className="relative w-full aspect-video max-h-[62vh] rounded-2xl bg-black border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
          <video
            ref={videoRef}
            src="/ads/WHOPPER.mp4"
            preload="none"
            playsInline
            controls={false}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onPause={handlePause}
            onError={() => {
              if (videoRef.current) {
                if (!videoRef.current.src.includes('WHOPPER.mp4')) {
                  videoRef.current.src = '/ads/WHOPPER.mp4';
                  videoRef.current.load();
                  videoRef.current.play().catch(() => {});
                }
              }
            }}
            onClick={(e) => {
              e.preventDefault();
              if (videoRef.current?.paused && !isEnded) {
                videoRef.current.play().catch(() => {});
              }
            }}
            className="w-full h-full object-contain cursor-default"
          >
            <source src="/ads/WHOPPER.mp4" type="video/mp4" />
            <source src="/ads/whopper.mp4" type="video/mp4" />
          </video>

          {/* Deceptive Dodging Close Button (Active while video is playing) */}
          {!isEnded && (
            <button
              type="button"
              onMouseEnter={triggerFakeCloseGag}
              onClick={triggerFakeCloseGag}
              style={{
                position: 'absolute',
                top: currentDodge.top,
                bottom: currentDodge.bottom,
                left: currentDodge.left,
                right: currentDodge.right,
              }}
              className="
                z-30 w-7 h-7 rounded-full bg-slate-900/80 hover:bg-rose-600/90 border border-white/30
                text-white/70 hover:text-white font-mono text-xs font-bold
                flex items-center justify-center cursor-pointer transition-all duration-150 shadow-lg
              "
              title="Close Ad"
              aria-label="Skip Broadcast"
            >
              ✕
            </button>
          )}

          {/* Autoplay Unmute Overlay Banner */}
          {isAutoplayBlocked && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-center">
              <button
                type="button"
                onClick={handleUnmute}
                className="
                  px-6 py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 border-2 border-amber-200
                  text-slate-950 font-heading font-black text-base sm:text-lg uppercase tracking-wider
                  shadow-[0_0_30px_rgba(251,191,36,0.8)] animate-pulse hover:scale-105 active:scale-95 transition-all
                  cursor-pointer flex items-center gap-3
                "
              >
                <span className="text-2xl">🔊</span>
                <span>TAP TO UNMUTE MANDATORY BROADCAST</span>
              </button>
              <p className="text-xs font-mono text-amber-200/90 mt-2">
                Audio engagement is enforced by the Ares Planetary Communications Accord.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Status / Claim Controller */}
        <div className="w-full mt-3 pt-2">
          {!isEnded ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  MANDATORY TRANSMISSION IN PROGRESS ({progressPercent}%)
                </span>
                <span>
                  {duration > 0 ? `Reward unlocks in: ${secondsRemaining}s` : 'Buffering satellite feed...'}
                </span>
              </div>

              {/* Verified Playback Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-900 border border-amber-500/30 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-up">
              <div className="text-center sm:text-left">
                <span className="font-heading font-black text-emerald-400 text-sm sm:text-base block">
                  🎉 COMMERCIAL COMPLIANCE VERIFIED!
                </span>
                <span className="text-xs font-mono text-starlight/70">
                  {rewardMode === 'credits'
                    ? '150 Mars Credits ready for immediate transfer to your colony wallet.'
                    : '+20% Power, Oxygen, and Radiation Shielding ready for life-support injection.'}
                </span>
              </div>

              {/* Massive Green Claim Reward Button */}
              <button
                type="button"
                onClick={handleClaimReward}
                disabled={isClaiming}
                className="
                  w-full sm:w-auto px-8 py-3.5 rounded-2xl
                  bg-[#22C55E] hover:bg-emerald-400 border-2 border-emerald-200
                  text-slate-950 font-heading font-black text-base sm:text-lg tracking-wide
                  shadow-[0_0_25px_rgba(34,197,94,0.6)] animate-glow-pulse
                  hover:scale-105 active:scale-95 transition-all cursor-pointer
                  flex items-center justify-center gap-2.5
                "
              >
                <span>✅</span>
                <span>
                  {rewardMode === 'credits'
                    ? 'CLAIM +150 MC & RETURN'
                    : 'CLAIM +20% VITALS & RETURN'}
                </span>
                <span className="text-xl">→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
