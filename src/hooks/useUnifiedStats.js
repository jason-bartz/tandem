import { useState, useEffect } from 'react';
import { loadStats } from '@/lib/storage';
import { loadCrypticStats } from '@/lib/crypticStorage';
import logger from '@/lib/logger';

/**
 * useUnifiedStats - Load stats for both games
 * Handles async loading, error states, and CloudKit sync
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @returns {Object} Stats and loading states for both games
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
      // Load stats in parallel (both functions are async)
      const [tandem, cryptic] = await Promise.all([loadStats(), loadCrypticStats()]);

      setTandemStats(tandem);
      setCrypticStats(cryptic);

      logger.info('[useUnifiedStats] Stats loaded successfully', {
        tandemPlayed: tandem.played,
        crypticCompleted: cryptic.totalCompleted,
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
    loading,
    error,
    reload: loadAllStats,
  };
}

export default useUnifiedStats;
