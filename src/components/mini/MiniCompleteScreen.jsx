'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { playSuccessSound } from '@/lib/sounds';
import { useAuth } from '@/contexts/AuthContext';
import { formatMiniTime, getMiniPuzzleInfoForDate } from '@/lib/miniUtils';
import { generateMiniShareText } from '@/lib/miniShareText';
import { loadMiniStats } from '@/lib/miniStorage';
import ShareButton from '../game/ShareButton';
import UnifiedStatsModal from '../stats/UnifiedStatsModal';
import LeaderboardModal from '../leaderboard/LeaderboardModal';
import UnifiedArchiveCalendar from '../game/UnifiedArchiveCalendar';
import SidebarMenu from '../navigation/SidebarMenu';

/**
 * MiniCompleteScreen Component
 * Victory screen shown after puzzle completion
 */
export default function MiniCompleteScreen({
  puzzle,
  userGrid: _userGrid,
  elapsedTime,
  checksUsed,
  revealsUsed,
  mistakes,
  currentPuzzleDate,
}) {
  const router = useRouter();
  const { celebration } = useHaptics();
  const { reduceMotion } = useTheme();
  const { user } = useAuth();

  const [showArchive, setShowArchive] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState(null);

  const perfectSolve = checksUsed === 0 && revealsUsed === 0 && mistakes === 0;
  const puzzleInfo = getMiniPuzzleInfoForDate(currentPuzzleDate);
  const puzzleNumber = puzzleInfo?.number || puzzle?.number || 0;

  // Generate share text
  const shareText = generateMiniShareText(
    { date: currentPuzzleDate, number: puzzleNumber },
    {
      timeTaken: elapsedTime,
      checksUsed,
      revealsUsed,
      mistakes,
      perfectSolve,
    }
  );

  // Load stats
  useEffect(() => {
    loadMiniStats().then(setStats);
  }, []);

  // Celebration effect
  useEffect(() => {
    // Haptic and sound feedback
    celebration();
    playSuccessSound();

    // Confetti animation (yellow theme)
    if (!reduceMotion) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Yellow and gold colored confetti for Mini theme
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#FFEB3B', '#FFD700', '#FFC107', '#FFEB3B', '#FFB300', '#FFA000'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#FFEB3B', '#FFD700', '#FFC107', '#FFEB3B', '#FFB300', '#FFA000'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [celebration, reduceMotion]);

  return (
    <div className="min-h-screen bg-bg-main dark:bg-bg-main">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Main completion card */}
        <div
          className="
            rounded-[32px]
            border-[3px] border-black dark:border-gray-600
            shadow-[6px_6px_0px_rgba(0,0,0,1)]
            dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]
            bg-ghost-white dark:bg-gray-800
            p-10
            text-center
            mb-6
          "
        >
          {/* Header with back caret and hamburger menu */}
          <div className="flex items-center justify-between mb-8">
            {/* Back caret */}
            <button
              onClick={() => router.push('/')}
              className="
                p-2
                text-text-primary
                hover:opacity-70
                active:opacity-50
                transition-opacity
              "
              aria-label="Go back"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            {/* Hamburger menu */}
            <button
              onClick={() => setShowMenu(true)}
              className="
                p-2
                text-text-primary
                hover:opacity-70
                active:opacity-50
                transition-opacity
              "
              aria-label="Open menu"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>

          {/* Logo */}
          <div className="w-24 h-24 mx-auto mb-6">
            <Image
              src="/images/mini-logo.png"
              alt="Daily Mini"
              width={96}
              height={96}
              className="w-full h-full object-contain"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-black text-text-primary mb-2">
            {perfectSolve ? 'Perfect Solve!' : 'Wonderful!'}
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-text-secondary mb-8">
            You solved Daily Mini #{puzzleNumber}
          </p>

          {/* Stats - Only Time with Best Time */}
          <div className="max-w-md mx-auto mb-8">
            <div
              className="
                rounded-[20px]
                border-[3px] border-black dark:border-gray-600
                shadow-[4px_4px_0px_rgba(0,0,0,1)]
                dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                bg-accent-yellow/20 dark:bg-accent-yellow/10
                p-6
              "
            >
              <div className="text-sm font-bold text-text-tertiary uppercase tracking-wide mb-2">
                Time
              </div>
              <div className="text-3xl font-black text-text-primary mb-3">
                {formatMiniTime(elapsedTime)}
              </div>
              {stats && stats.bestTime > 0 && (
                <div className="text-sm text-text-secondary">
                  Best Time: <span className="font-bold text-text-primary">{formatMiniTime(stats.bestTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Perfect solve badge */}
          {perfectSolve && (
            <div className="mb-8">
              <div
                className="
                  inline-flex items-center gap-2
                  px-6 py-3
                  rounded-[16px]
                  border-[3px] border-black dark:border-gray-600
                  shadow-[4px_4px_0px_rgba(0,0,0,1)]
                  dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                  bg-accent-green dark:bg-accent-green
                  text-gray-900
                "
              >
                <span className="text-2xl">✨</span>
                <span className="font-black text-lg">Perfect Solve - No Assists!</span>
              </div>
            </div>
          )}

          {/* Share button */}
          <div className="mb-6">
            <ShareButton shareText={shareText} />
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setShowArchive(true)}
              className="
                w-full h-14
                rounded-[20px]
                border-[3px] border-black dark:border-gray-600
                shadow-[4px_4px_0px_rgba(0,0,0,1)]
                dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                bg-accent-yellow dark:bg-accent-yellow
                text-gray-900
                font-black
                tracking-wider
                hover:translate-x-[2px] hover:translate-y-[2px]
                hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[4px] active:translate-y-[4px]
                active:shadow-none
                transition-all
              "
            >
              Play Archive
            </button>

            <button
              onClick={() => setShowStats(true)}
              className="
                w-full h-12
                rounded-[16px]
                border-[3px] border-black dark:border-gray-600
                shadow-[3px_3px_0px_rgba(0,0,0,1)]
                dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                bg-ghost-white dark:bg-gray-700
                text-text-primary
                font-bold
                hover:translate-x-[2px] hover:translate-y-[2px]
                hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[3px] active:translate-y-[3px]
                active:shadow-none
                transition-all
              "
            >
              View Stats
            </button>

            {user && (
              <button
                onClick={() => setShowLeaderboard(true)}
                className="
                  w-full h-12
                  rounded-[16px]
                  border-[3px] border-black dark:border-gray-600
                  shadow-[3px_3px_0px_rgba(0,0,0,1)]
                  dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                  bg-ghost-white dark:bg-gray-700
                  text-text-primary
                  font-bold
                  hover:translate-x-[2px] hover:translate-y-[2px]
                  hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                  active:translate-x-[3px] active:translate-y-[3px]
                  active:shadow-none
                  transition-all
                "
              >
                Leaderboard
              </button>
            )}
          </div>

          {/* Account CTA if not authenticated */}
          {!user && (
            <div className="mt-8 pt-6 border-t-[2px] border-gray-200 dark:border-gray-700">
              <p className="text-sm text-text-secondary mb-3">
                Create an account to join the leaderboard and track your stats across devices
              </p>
              <button
                onClick={() => router.push('/?signup=true')}
                className="
                  px-6 py-2
                  rounded-[12px]
                  border-[2px] border-black dark:border-gray-600
                  shadow-[2px_2px_0px_rgba(0,0,0,1)]
                  dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]
                  bg-accent-blue dark:bg-accent-blue
                  text-white
                  font-bold text-sm
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]
                  active:translate-x-[2px] active:translate-y-[2px]
                  active:shadow-none
                  transition-all
                "
              >
                Create Free Account
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modals */}
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} defaultTab="mini" />

      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="mini"
        initialTab="daily"
      />

      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        defaultTab="mini"
      />

      <SidebarMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onOpenStats={() => setShowStats(true)}
        onOpenArchive={() => setShowArchive(true)}
      />
    </div>
  );
}
