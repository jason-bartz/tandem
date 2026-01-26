import { useState, useEffect } from 'react';
import { loadStats } from '@/lib/storage';
import { loadMiniStats } from '@/lib/miniStorage';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';
import { SOUP_STORAGE_KEYS } from '@/lib/daily-alchemy.constants';

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
 * Load Element Soup stats from storage
 * @returns {Object} Soup stats object
 */
async function loadSoupStats() {
  try {
    const stored = await storageService.get(SOUP_STORAGE_KEYS.STATS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        totalCompleted: parsed.totalCompleted || 0,
        currentStreak: parsed.currentStreak || 0,
        longestStreak: parsed.longestStreak || 0,
        averageTime: parsed.averageTime || 0,
        bestTime: parsed.bestTime || 0,
        totalMoves: parsed.totalMoves || 0,
        totalDiscoveries: parsed.totalDiscoveries || 0,
        firstDiscoveries: parsed.firstDiscoveries || 0,
        underPar: parsed.underPar || 0,
        atPar: parsed.atPar || 0,
        overPar: parsed.overPar || 0,
        lastPlayedDate: parsed.lastPlayedDate || null,
      };
    }
  } catch (error) {
    logger.error('[loadSoupStats] Failed to load Soup stats:', error);
  }
  return {
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    totalMoves: 0,
    totalDiscoveries: 0,
    firstDiscoveries: 0,
    underPar: 0,
    atPar: 0,
    overPar: 0,
    lastPlayedDate: null,
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

  const [soupStats, setSoupStats] = useState({
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageTime: 0,
    bestTime: 0,
    totalMoves: 0,
    totalDiscoveries: 0,
    firstDiscoveries: 0,
    underPar: 0,
    atPar: 0,
    overPar: 0,
    lastPlayedDate: null,
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
      const [tandem, mini, reel, soup] = await Promise.all([
        loadStats(),
        loadMiniStats(),
        loadReelStats(),
        loadSoupStats(),
      ]);

      setTandemStats(tandem);
      setMiniStats(mini);
      setReelStats(reel);
      setSoupStats(soup);

      logger.info('[useUnifiedStats] Stats loaded successfully', {
        tandemPlayed: tandem.played,
        miniCompleted: mini.totalCompleted,
        reelPlayed: reel.gamesPlayed,
        soupCompleted: soup.totalCompleted,
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
    soupStats,
    loading,
    error,
    reload: loadAllStats,
  };
}

export default useUnifiedStats;
