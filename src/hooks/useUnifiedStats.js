import { useState, useEffect } from 'react';
import { loadStats } from '@/lib/storage';
import { loadCrypticStats } from '@/lib/crypticStorage';
import { loadMiniStats } from '@/lib/miniStorage';
import logger from '@/lib/logger';

/**
 * useUnifiedStats - Load stats for all three games
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

  const [crypticStats, setCrypticStats] = useState({
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalHintsUsed: 0,
    perfectSolves: 0,
    averageTime: 0,
    completedPuzzles: {},
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
      // Load stats in parallel for all three games
      const [tandem, cryptic, mini] = await Promise.all([
        loadStats(),
        loadCrypticStats(),
        loadMiniStats(),
      ]);

      setTandemStats(tandem);
      setCrypticStats(cryptic);
      setMiniStats(mini);

      logger.info('[useUnifiedStats] Stats loaded successfully', {
        tandemPlayed: tandem.played,
        crypticCompleted: cryptic.totalCompleted,
        miniCompleted: mini.totalCompleted,
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
    crypticStats,
    miniStats,
    loading,
    error,
    reload: loadAllStats,
  };
}

export default useUnifiedStats;
