import { useState, useEffect, useCallback } from 'react';
import { loadStats } from '@/lib/storage';
import { loadMiniStats } from '@/lib/miniStorage';
import { loadReelStats } from '@/lib/reelStorage';
import { loadAlchemyStats } from '@/lib/alchemyStorage';
import {
  getAllAchievements,
  getStreakAchievements,
  getAllMiniAchievements,
  getMiniStreakAchievements,
  getAllReelAchievements,
  getReelStreakAchievements,
  getAllAlchemyAchievements,
  getAlchemyStreakAchievements,
  getAlchemyFirstDiscoveryAchievements,
} from '@/lib/achievementDefinitions';
import { calculateAchievementProgress } from '@/lib/achievementChecker';
import logger from '@/lib/logger';

/**
 * useAchievementStatus - Load and calculate achievement status
 *
 * For the active game mode, this hook:
 *   1. Loads the canonical stats (per-user-namespaced + database-merged)
 *   2. Reads the persisted set of unlocked achievement IDs from local storage
 *      (and the database, for authenticated users)
 *   3. Computes which achievements *should* be unlocked from the current stats
 *   4. Backfills any newly-qualifying achievements into the persisted set so
 *      future loads stay in sync (e.g. for users who earned thresholds before
 *      the sync system was wired up)
 *   5. Marks each achievement unlocked if EITHER source agrees — making the
 *      modal robust to either path going stale (computed-from-stats vs
 *      persisted-from-notifier)
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @param {string} gameMode - Game mode: 'tandem', 'mini', 'reel', or 'alchemy'
 * @returns {Object} Achievement data, loading states, and user progress
 */
export function useAchievementStatus(isOpen, gameMode = 'tandem') {
  const [achievementData, setAchievementData] = useState({
    allAchievements: [],
    unlockedCount: 0,
    totalCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAchievementStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let bestStreak = 0;
      let wins = 0;
      let firstDiscoveries = 0;
      let allAchievements = [];
      let streakAchievements = [];
      let firstDiscoveryAchievements = [];
      let statsForBackfill = null;

      // Load stats based on game mode using the canonical loaders
      if (gameMode === 'mini') {
        const miniStats = await loadMiniStats();
        bestStreak = miniStats.longestStreak || 0;
        wins = miniStats.totalCompleted || 0;
        allAchievements = getAllMiniAchievements();
        streakAchievements = getMiniStreakAchievements();
        statsForBackfill = {
          longestStreak: bestStreak,
          totalCompleted: wins,
        };
      } else if (gameMode === 'reel') {
        const reelStats = await loadReelStats();
        bestStreak = reelStats.bestStreak || 0;
        wins = reelStats.gamesWon || 0;
        allAchievements = getAllReelAchievements();
        streakAchievements = getReelStreakAchievements();
        statsForBackfill = {
          bestStreak,
          gamesWon: wins,
        };
      } else if (gameMode === 'alchemy') {
        const alchemyStats = await loadAlchemyStats();
        bestStreak = alchemyStats.longestStreak || 0;
        wins = alchemyStats.totalCompleted || 0;
        firstDiscoveries = alchemyStats.firstDiscoveries || 0;
        allAchievements = getAllAlchemyAchievements();
        streakAchievements = getAlchemyStreakAchievements();
        firstDiscoveryAchievements = getAlchemyFirstDiscoveryAchievements();
        statsForBackfill = {
          longestStreak: bestStreak,
          totalCompleted: wins,
          firstDiscoveries,
        };
      } else {
        // Default: Tandem
        const stats = await loadStats();
        bestStreak = stats.bestStreak || 0;
        wins = stats.wins || 0;
        allAchievements = getAllAchievements();
        streakAchievements = getStreakAchievements();
        statsForBackfill = {
          bestStreak,
          wins,
        };
      }

      // Read the persisted set of unlocked achievement IDs (local + DB merged
      // for authenticated users) and silently backfill any newly-qualifying
      // achievements so the persisted set stays in sync with the user's stats.
      let persistedUnlockedSet = new Set();
      try {
        const { backfillAchievementsFromStats } = await import(
          '@/services/achievementSync.service'
        );
        persistedUnlockedSet = await backfillAchievementsFromStats(gameMode, statsForBackfill);
      } catch (backfillErr) {
        logger.warn('[useAchievementStatus] Backfill failed (non-critical)', backfillErr);
      }

      const achievementsWithStatus = allAchievements.map((achievement) => {
        // Determine achievement type
        const isStreakAchievement = streakAchievements.some((a) => a.id === achievement.id);
        const isFirstDiscoveryAchievement = firstDiscoveryAchievements.some(
          (a) => a.id === achievement.id
        );

        let currentValue;
        let type;
        if (isStreakAchievement) {
          currentValue = bestStreak;
          type = 'streak';
        } else if (isFirstDiscoveryAchievement) {
          currentValue = firstDiscoveries;
          type = 'firstDiscovery';
        } else {
          currentValue = wins;
          type = 'wins';
        }

        // An achievement is unlocked if EITHER the current stats qualify OR
        // it appears in the persisted unlocked set. This makes the modal
        // tolerant of either source going stale.
        const computedUnlocked = currentValue >= achievement.threshold;
        const persistedUnlocked = persistedUnlockedSet.has(achievement.id);
        const isUnlocked = computedUnlocked || persistedUnlocked;
        const progress = calculateAchievementProgress(currentValue, achievement.threshold);

        return {
          ...achievement,
          isUnlocked,
          progress,
          currentValue,
          type,
          gameMode,
        };
      });

      // Sort: unlocked first (by threshold desc), then locked by progress desc
      const sortedAchievements = achievementsWithStatus.sort((a, b) => {
        if (a.isUnlocked && !b.isUnlocked) return -1;
        if (!a.isUnlocked && b.isUnlocked) return 1;
        if (a.isUnlocked && b.isUnlocked) return b.threshold - a.threshold;
        return b.progress - a.progress;
      });

      const unlockedAchievements = achievementsWithStatus.filter((a) => a.isUnlocked);

      setAchievementData({
        allAchievements: sortedAchievements,
        unlockedCount: unlockedAchievements.length,
        totalCount: allAchievements.length,
      });

      logger.info('[useAchievementStatus] Achievement status loaded', {
        gameMode,
        unlocked: unlockedAchievements.length,
        total: allAchievements.length,
      });
    } catch (err) {
      logger.error('[useAchievementStatus] Failed to load achievement status', {
        error: err.message,
        gameMode,
      });
      setError('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, [gameMode]);

  useEffect(() => {
    if (isOpen !== false) {
      loadAchievementStatus();
    }
  }, [isOpen, loadAchievementStatus]);

  // Filter helpers
  const getStreakAchievementData = () => {
    return {
      ...achievementData,
      allAchievements: achievementData.allAchievements.filter((a) => a.type === 'streak'),
    };
  };

  const getWinsAchievementData = () => {
    return {
      ...achievementData,
      allAchievements: achievementData.allAchievements.filter((a) => a.type === 'wins'),
    };
  };

  const getFirstDiscoveryAchievementData = () => {
    return {
      ...achievementData,
      allAchievements: achievementData.allAchievements.filter((a) => a.type === 'firstDiscovery'),
    };
  };

  return {
    achievementData,
    loading,
    error,
    reload: loadAchievementStatus,
    getStreakAchievementData,
    getWinsAchievementData,
    getFirstDiscoveryAchievementData,
  };
}

export default useAchievementStatus;
