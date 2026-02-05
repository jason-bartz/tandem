'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { playSuccessSound } from '@/lib/sounds';
import { useAuth } from '@/contexts/AuthContext';
import { formatMiniTime, getMiniPuzzleInfoForDate } from '@/lib/miniUtils';
import { generateMiniShareText } from '@/lib/miniShareText';
import { loadMiniStats } from '@/lib/miniStorage';
import ShareButton from '../game/ShareButton';
import LeaderboardModal from '../leaderboard/LeaderboardModal';
import UnifiedArchiveCalendar from '../game/UnifiedArchiveCalendar';
import SidebarMenu from '../navigation/SidebarMenu';
import LoginReminderPopup from '../shared/LoginReminderPopup';

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
  const { isActive: hasSubscription } = useSubscription();
  const { user } = useAuth();

  const [showArchive, setShowArchive] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [stats, setStats] = useState(null);
  const [showLoginPopup, setShowLoginPopup] = useState(true);

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
      {/* Login reminder popup for non-authenticated users */}
      {!user && (
        <LoginReminderPopup
          isVisible={showLoginPopup}
          onSignUp={() => {
            setShowLoginPopup(false);
            router.push('/?signup=true');
          }}
          onDismiss={() => setShowLoginPopup(false)}
          gameType="mini"
        />
      )}

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
              src="/icons/ui/mini.png"
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
          <p className="text-lg text-text-secondary mb-8">You solved Daily Mini #{puzzleNumber}</p>

          {/* Stats - Time and Best Time side by side */}
          <div className="max-w-md mx-auto mb-8">
            <div className="grid grid-cols-2 gap-4">
              {/* Time box */}
              <div
                className="
                  rounded-[20px]
                  border-[3px] border-black dark:border-gray-600
                  shadow-[4px_4px_0px_rgba(0,0,0,1)]
                  dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                  bg-accent-yellow/20 dark:bg-accent-yellow/10
                  p-4
                "
              >
                <div className="text-sm font-bold text-text-tertiary uppercase tracking-wide mb-2">
                  Time
                </div>
                <div className="text-2xl font-black text-text-primary">
                  {formatMiniTime(elapsedTime)}
                </div>
              </div>

              {/* Best Time box */}
              <div
                className="
                  rounded-[20px]
                  border-[3px] border-black dark:border-gray-600
                  shadow-[4px_4px_0px_rgba(0,0,0,1)]
                  dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                  bg-accent-yellow/20 dark:bg-accent-yellow/10
                  p-4
                "
              >
                <div className="text-sm font-bold text-text-tertiary uppercase tracking-wide mb-2">
                  Best
                </div>
                <div className="text-2xl font-black text-text-primary">
                  {stats && stats.bestTime > 0 ? formatMiniTime(stats.bestTime) : '--'}
                </div>
              </div>
            </div>
          </div>

          {/* Share button */}
          <div className="mb-6">
            <ShareButton shareText={shareText} />
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Leaderboard Button - Yellow */}
            <button
              onClick={() => setShowLeaderboard(true)}
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
              Leaderboard
            </button>

            {/* Play Archive Button - Yellow if subscribed, White with lock if not */}
            <button
              onClick={() => setShowArchive(true)}
              className={`
                w-full h-12
                rounded-[16px]
                border-[3px] border-black dark:border-gray-600
                shadow-[3px_3px_0px_rgba(0,0,0,1)]
                dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                font-bold
                hover:translate-x-[2px] hover:translate-y-[2px]
                hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                active:translate-x-[3px] active:translate-y-[3px]
                active:shadow-none
                transition-all
                ${
                  hasSubscription
                    ? 'bg-accent-yellow dark:bg-accent-yellow text-gray-900'
                    : 'bg-ghost-white dark:bg-gray-700 text-text-primary'
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                {!hasSubscription && (
                  <Image
                    src="/icons/ui/lock.png"
                    alt="Locked"
                    width={20}
                    height={20}
                    className="opacity-80"
                  />
                )}
                <span>Play Archive</span>
              </div>
            </button>
          </div>

          {/* Account CTA if not authenticated */}
          {!user && (
            <div className="mt-8 pt-6 border-t-[2px] border-gray-200 dark:border-gray-700">
              <p className="text-sm text-text-secondary mb-3">
                Your progress will be lost! Create a free account to join the leaderboard, track
                your stats, and sync across devices!
              </p>
              <button
                onClick={() => router.push('/?signup=true')}
                className="
                  px-6 py-2.5
                  rounded-[12px]
                  border-[3px] border-black dark:border-gray-600
                  shadow-[3px_3px_0px_rgba(0,0,0,1)]
                  dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
                  bg-accent-blue dark:bg-accent-blue
                  text-white
                  font-bold text-sm
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]
                  active:translate-x-[3px] active:translate-y-[3px]
                  active:shadow-none
                  transition-all
                "
              >
                Create Free Account
              </button>
            </div>
          )}

          {/* Discord Link */}
          <a
            href="https://discord.com/invite/uSxtYQXtHN"
            target="_blank"
            rel="noopener noreferrer"
            className="
              w-full mt-6 p-4
              flex items-center gap-3
              text-left
              bg-gray-50 dark:bg-gray-700
              border-[3px] border-gray-300 dark:border-gray-600
              rounded-xl
              shadow-[3px_3px_0px_rgba(0,0,0,0.15)]
              dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]
              hover:bg-gray-100 dark:hover:bg-gray-600
              hover:border-gray-400 dark:hover:border-gray-500
              transition-colors cursor-pointer
            "
          >
            {/* Discord Logo */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 text-[#5865F2] flex-shrink-0"
            >
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
            </svg>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-[#5865F2]">Join us on Discord</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-accent-yellow text-gray-900 rounded">
                  New
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connect with other players, share strategies, and report bugs
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Modals */}
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
        onOpenStats={() => setShowLeaderboard(true)}
        onOpenArchive={() => setShowArchive(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
      />
    </div>
  );
}
