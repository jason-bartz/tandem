import { useState, useEffect } from 'react';
import { loadStats } from '@/lib/storage';
import { loadMiniStats } from '@/lib/miniStorage';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

const REEL_STORAGE_KEY = 'reel-connections-stats';

/**
 * Load Reel Connections stats from storage
 * @returns {Object} Reel stats object
 */
async function loadReelStats() {
  try {
    const stored = await storageService.get(REEL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        gamesPlayed: parsed.gamesPlayed || 0,
        gamesWon: parsed.gamesWon || 0,
        totalTimeMs: parsed.totalTimeMs || 0,
        currentStreak: parsed.currentStreak || 0,
        bestStreak: parsed.bestStreak || 0,
        lastPlayedDate: parsed.lastPlayedDate || null,
        gameHistory: parsed.gameHistory || [],
      };
    }
  } catch (error) {
    logger.error('[loadReelStats] Failed to load Reel stats:', error);
  }
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    totalTimeMs: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    gameHistory: [],
  };
}

/**
 * useUnifiedStats - Load stats for all games
 * Handles async loading, error states, and CloudKit sync
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @returns {Object} Stats and loading states for all games
 */
export function useUnifiedStats(isOpen) {
  const [tandemStats, setTandemStats] = useState({
    played: 0,
    wins: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const [miniStats, setMiniStats] = useState({
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    perfectSolves: 0,
    totalChecks: 0,
    totalReveals: 0,
    completedPuzzles: {},
  });

  const [reelStats, setReelStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    totalTimeMs: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastPlayedDate: null,
    gameHistory: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen !== false) {
      loadAllStats();
    }
  }, [isOpen]);

  const loadAllStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load stats in parallel for all games
      const [tandem, mini, reel] = await Promise.all([
        loadStats(),
        loadMiniStats(),
        loadReelStats(),
      ]);

      setTandemStats(tandem);
      setMiniStats(mini);
      setReelStats(reel);

      logger.info('[useUnifiedStats] Stats loaded successfully', {
        tandemPlayed: tandem.played,
        miniCompleted: mini.totalCompleted,
        reelPlayed: reel.gamesPlayed,
      });
    } catch (err) {
      logger.error('[useUnifiedStats] Failed to load stats', { error: err.message });
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  return {
    tandemStats,
    miniStats,
    reelStats,
    loading,
    error,
    reload: loadAllStats,
  };
}

export default useUnifiedStats;
