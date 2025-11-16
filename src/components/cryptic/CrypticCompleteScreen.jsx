'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CRYPTIC_CONFIG } from '@/lib/constants';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { playSuccessSound } from '@/lib/sounds';
import { useAuth } from '@/contexts/AuthContext';
import CrypticGuideModal from './CrypticGuideModal';
import UnifiedArchiveCalendar from '@/components/game/UnifiedArchiveCalendar';
import Settings from '@/components/Settings';
import UnifiedStatsModal from '@/components/stats/UnifiedStatsModal';
import LeaderboardModal from '@/components/leaderboard/LeaderboardModal';
import AuthModal from '@/components/auth/AuthModal';
import GlobalNavigation from '@/components/navigation/GlobalNavigation';

export default function CrypticCompleteScreen({
  puzzle: _puzzle,
  answer,
  hintsUsed,
  elapsedTime,
  attempts,
  currentPuzzleDate,
  onPlayAgain,
  onReturnHome,
  isAdmireMode = false,
}) {
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { celebration, lightTap } = useHaptics();
  const { highContrast, reduceMotion, theme } = useTheme();
  const { user, loading: authLoading } = useAuth();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getPuzzleNumber = () => {
    // Puzzle #1 starts on November 3, 2025
    const startDate = new Date('2025-11-03T00:00:00Z');
    const puzzleDate = new Date(currentPuzzleDate + 'T00:00:00Z');
    const diffTime = puzzleDate - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const getHintText = () => {
    return `${hintsUsed}/${CRYPTIC_CONFIG.MAX_HINTS}`;
  };

  const handleShare = async () => {
    const puzzleNumber = getPuzzleNumber();
    const shareText = `Daily Cryptic #${puzzleNumber}\n${hintsUsed === 0 ? '✨ Perfect solve!' : `💡 ${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used`}\n⏱️ ${formatTime(elapsedTime)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 2000);
      }
    } catch (error) {
      // User cancelled or error - just show the message
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    }
  };

  const perfectSolve = hintsUsed === 0;

  // Trigger confetti, haptics, and sound on mount
  useEffect(() => {
    // Play celebration haptics
    celebration();

    // Play success sound
    playSuccessSound();

    // Trigger confetti (only if reduce motion is disabled)
    if (!reduceMotion) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Purple and teal colored confetti for cryptic theme
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#cb6ce6', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#d946ef'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#cb6ce6', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#d946ef'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlobalNavigation
      onOpenStats={() => setShowStats(true)}
      onOpenArchive={() => setShowArchive(true)}
      onOpenHowToPlay={() => setShowGuide(true)}
      onOpenSettings={() => setShowSettings(true)}
    >
      <div className="animate-fade-in -mt-16">
        {/* Main completion card */}
        <div
          className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
            highContrast
              ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
              : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Back arrow button at top left */}
          <button
            onClick={() => {
              lightTap();
              onReturnHome();
            }}
            className="absolute left-4 top-4 w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-[100]"
            title="Back to Home"
          >
            <svg
              className="w-5 h-5 text-gray-600 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Logo */}
          <div className="mb-6">
            <img
              src={
                theme === 'dark'
                  ? '/images/daily-cryptic-logo-dark.webp'
                  : '/images/daily-cryptic-logo.webp'
              }
              alt="Daily Cryptic"
              className="w-24 h-24 mx-auto rounded-2xl"
            />
          </div>

          {/* Title */}
          <h1
            className={`text-4xl font-bold mb-2 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
            }`}
          >
            {perfectSolve ? 'Perfect Solve!' : 'Wonderful'}
          </h1>
          <p
            className={`text-lg mb-8 ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            You solved Daily Cryptic #{getPuzzleNumber()}
          </p>

          {/* Answer Section */}
          <div
            className={`mb-8 pb-8 border-b-[3px] ${
              highContrast ? 'border-hc-border' : 'border-gray-300 dark:border-gray-700'
            }`}
          >
            <div
              className={`text-sm font-bold uppercase tracking-wide mb-3 ${
                highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              The Answer
            </div>
            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{answer}</div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] animate-scale-fade-in stagger-1 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-accent-blue/20 dark:bg-sky-900/50 border-accent-blue'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast ? 'text-hc-text' : 'text-accent-blue dark:text-accent-blue'
                }`}
              >
                {formatTime(elapsedTime)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Time
              </div>
            </div>
            <div
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] animate-scale-fade-in stagger-2 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : hintsUsed === 0
                    ? 'bg-accent-yellow/20 dark:bg-yellow-900/50 border-accent-yellow'
                    : 'bg-accent-orange/20 dark:bg-orange-900/50 border-accent-orange'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast
                    ? 'text-hc-text'
                    : hintsUsed === 0
                      ? 'text-accent-yellow dark:text-accent-yellow'
                      : 'text-accent-orange dark:text-accent-orange'
                }`}
              >
                {getHintText()}
              </div>
              <div
                className={`text-xs mt-1 ${
                  highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Hints Used
              </div>
            </div>
            <div
              className={`rounded-2xl p-4 text-center border-[3px] shadow-[3px_3px_0px_rgba(0,0,0,0.3)] animate-scale-fade-in stagger-3 ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : 'bg-accent-pink/20 dark:bg-pink-900/50 border-accent-pink'
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  highContrast ? 'text-hc-text' : 'text-accent-pink dark:text-accent-pink'
                }`}
              >
                {attempts}
              </div>
              <div
                className={`text-xs mt-1 ${
                  highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Attempts
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleShare}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] animate-fade-in-up delay-200 ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-purple text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
              style={!highContrast ? { backgroundColor: '#cb6ce6' } : {}}
            >
              Share Result
            </button>
            {showShareSuccess && (
              <div className="text-green-600 dark:text-green-400 font-medium text-sm">
                Copied to clipboard!
              </div>
            )}
            <button
              onClick={() => {
                lightTap();
                if (isAdmireMode && onPlayAgain) {
                  // In admire mode, replay the current puzzle
                  onPlayAgain();
                } else {
                  // Otherwise, open archive to select a puzzle
                  setShowArchive(true);
                }
              }}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all border-[3px] animate-fade-in-up delay-300 ${
                highContrast
                  ? 'bg-hc-primary text-white border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-blue text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              }`}
            >
              {isAdmireMode ? 'Replay Puzzle' : 'Play from Archive'}
            </button>

            {/* View Stats and Leaderboard Buttons */}
            <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-400">
              <button
                onClick={() => {
                  lightTap();
                  setShowStats(true);
                }}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm transition-all border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                Stats
              </button>

              <button
                onClick={() => {
                  lightTap();
                  setShowLeaderboard(true);
                }}
                className={`py-3 px-4 rounded-2xl font-semibold text-sm transition-all border-[3px] ${
                  highContrast
                    ? 'bg-hc-surface text-hc-text border-hc-border hover:bg-hc-primary hover:text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-black dark:border-gray-600 shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
                }`}
              >
                Leaderboard
              </button>
            </div>

            {/* Account CTA for non-logged-in users */}
            {!user && !authLoading && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <button
                    onClick={() => {
                      lightTap();
                      setShowAuthModal(true);
                    }}
                    className="font-semibold text-accent-blue hover:text-accent-blue/80 dark:text-accent-blue dark:hover:text-accent-blue/80 transition-colors underline decoration-1 underline-offset-2"
                  >
                    Create a free account
                  </button>{' '}
                  to join the leaderboard
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showGuide && <CrypticGuideModal onClose={() => setShowGuide(false)} />}
      <UnifiedArchiveCalendar
        isOpen={showArchive}
        onClose={() => setShowArchive(false)}
        defaultTab="cryptic"
        onSelectPuzzle={(date) => {
          // Redirect to main page with selected Tandem puzzle
          window.location.href = `/?puzzle=${date}`;
        }}
      />
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <UnifiedStatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <LeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        gameType="cryptic"
        initialTab="daily"
      />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signup"
        onSuccess={() => {
          setShowAuthModal(false);
        }}
      />
    </GlobalNavigation>
  );
}
