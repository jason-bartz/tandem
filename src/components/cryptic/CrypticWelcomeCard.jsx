'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import crypticService from '@/services/cryptic.service';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import logger from '@/lib/logger';

/**
 * Preview card for Daily Cryptic on the main Tandem welcome screen
 * Shows today's clue preview and links to the full game
 */
export default function CrypticWelcomeCard() {
  const router = useRouter();
  const { highContrast } = useTheme();
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPuzzlePreview();
  }, []);

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
    router.push('/dailycryptic');
  };

  if (loading) {
    return (
      <div
        className={`rounded-[32px] border-[3px] overflow-hidden p-10 text-center ${
          highContrast
            ? 'bg-hc-surface border-hc-border shadow-[6px_6px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]'
        }`}
      >
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-gray-400 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
        </div>
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

      {/* Clue Preview */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 mb-6 text-left">
        <p className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 font-semibold">
          Today&apos;s Clue
        </p>
        <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">{puzzle.clue}</p>
      </div>

      {/* Play Button */}
      <button
        onClick={handlePlayClick}
        className={`w-full p-4 text-white rounded-[20px] text-base font-bold cursor-pointer transition-all tracking-wider
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
