'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import crypticService from '@/services/cryptic.service';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import logger from '@/lib/logger';
import { getStreakMessage } from '@/lib/streakMessages';
import { playButtonTone } from '@/lib/sounds';
import { useHaptics } from '@/hooks/useHaptics';

const loadingMessages = [
  'Calibrating cryptic coefficients...',
  'Syncing synonyms...',
  'Untangling thematic threads...',
  'Consulting the emoji oracle...',
  'Brewing fresh vocabulary...',
];

/**
 * Preview card for Daily Cryptic on the main Tandem welcome screen
 * Shows today's clue preview and links to the full game
 */
export default function CrypticWelcomeCard({ currentStreak = 0 }) {
  const router = useRouter();
  const { highContrast, reduceMotion } = useTheme();
  const { mediumTap } = useHaptics();
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadPuzzlePreview();
  }, []);

  useEffect(() => {
    if (!loading) return;

    // Rotate through loading messages
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setLoadingText(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        setIsVisible(true);
      }, 300);
    }, 1000);

    return () => clearInterval(interval);
  }, [loading]);

  const loadPuzzlePreview = async () => {
    try {
      setLoading(true);
      const puzzleInfo = getCurrentPuzzleInfo();
      const response = await crypticService.getPuzzle(puzzleInfo.isoDate);

      if (response.success && response.puzzle) {
        setPuzzle(response.puzzle);
      } else {
        setError('No puzzle available today');
      }
    } catch (err) {
      logger.error('[CrypticWelcomeCard] Error loading puzzle preview', {
        error: err.message,
      });
      setError('Unable to load puzzle');
    } finally {
      setLoading(false);
    }
  };

  const getPuzzleNumber = () => {
    if (!puzzle) return 0;
    // Calculate puzzle number based on date
    // Puzzle #1 starts on November 3, 2025
    const startDate = new Date('2025-11-03T00:00:00Z');
    const puzzleDate = new Date(puzzle.date + 'T00:00:00Z');
    const diffTime = puzzleDate - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePlayClick = () => {
    try {
      playButtonTone(); // Use the same button tone as Daily Tandem
      mediumTap(); // Medium tap for starting the game
    } catch (e) {
      // Sound might fail on some browsers
    }
    router.push('/dailycryptic');
  };

  if (loading) {
    return (
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center relative ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        {/* Loading text centered in card */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div
            className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          >
            <p className="text-base font-bold text-gray-800 dark:text-gray-200 text-center">
              {loadingText}
            </p>
          </div>
        </div>

        {/* Logo skeleton */}
        <div className="w-20 h-20 mx-auto mb-5">
          <div
            className={`w-full h-full bg-gray-200 dark:bg-gray-700 rounded-xl ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>

        {/* Title skeleton */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div
            className={`h-7 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
          <div
            className={`h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>

        {/* Puzzle number skeleton */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div
            className={`h-6 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
          <div
            className={`h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
          />
        </div>

        {/* How to play skeleton */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start">
            <div
              className={`w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl mr-3 flex-shrink-0 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mt-2.5 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>

        {/* Clue preview skeleton */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6">
          <div className="space-y-3">
            <div
              className={`h-5 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
            <div
              className={`h-5 w-2/3 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            />
          </div>
        </div>

        {/* Play button skeleton */}
        <div
          className={`h-14 w-full bg-gray-200 dark:bg-gray-700 rounded-[20px] ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
        />
      </div>
    );
  }

  if (error || !puzzle) {
    return null; // Don't show card if there's no puzzle
  }

  return (
    <div
      className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
          : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Header with Icon */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="w-20 h-20 relative mb-3">
          <Image
            src="/images/daily-cryptic-logo.webp"
            alt="Daily Cryptic"
            width={80}
            height={80}
            className="rounded-xl dark:hidden"
          />
          <Image
            src="/images/daily-cryptic-logo-dark.webp"
            alt="Daily Cryptic"
            width={80}
            height={80}
            className="rounded-xl hidden dark:block"
          />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">Daily Cryptic</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cryptic Word Puzzle</p>
        </div>
      </div>

      {/* Puzzle Number */}
      <div className="mb-6 text-center">
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">
          Puzzle #{getPuzzleNumber()}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDate(puzzle.date)}</p>
      </div>

      {/* How to Play Section */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 p-2">
            <Image src="/icons/ui/cryptic.png" alt="" width={24} height={24} />
          </div>
          <span className="text-dark-text dark:text-gray-200 text-sm pt-2.5">
            Decipher the answer through clever wordplay and cryptic clues
          </span>
        </div>
      </div>

      {/* Clue Preview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
        <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 font-semibold">
          Today&apos;s Clue
        </p>
        <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">{puzzle.clue}</p>
      </div>

      {/* Streak Display */}
      {currentStreak > 0 && (
        <div className="mb-4 text-center flex items-center justify-center gap-1.5">
          <Image src="/icons/ui/hardmode.png" alt="" width={12} height={12} />
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {getStreakMessage(currentStreak, 'cryptic')}
          </p>
        </div>
      )}

      {/* Play Button */}
      <button
        onClick={handlePlayClick}
        className={`w-full h-14 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider
          ${
            highContrast
              ? 'bg-hc-primary border-[3px] border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
          }
        `}
        style={!highContrast ? { backgroundColor: '#cb6ce6' } : {}}
      >
        Play Today&apos;s Puzzle
      </button>
    </div>
  );
}
