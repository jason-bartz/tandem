import { useState, useEffect, useCallback } from 'react';
import { loadStats } from '@/lib/storage';
import { loadMiniStats } from '@/lib/miniStorage';
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
import { SOUP_STORAGE_KEYS } from '@/lib/daily-alchemy.constants';
import logger from '@/lib/logger';

const REEL_STORAGE_KEY = 'reel-connections-stats';

/**
 * Load Reel Connections stats from localStorage
 */
async function loadReelStats() {
  if (typeof window === 'undefined') {
    return { bestStreak: 0, gamesWon: 0 };
  }
  try {
    const stored = window.localStorage.getItem(REEL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        bestStreak: parsed.bestStreak || 0,
        gamesWon: parsed.gamesWon || 0,
      };
    }
  } catch (e) {
    logger.error('[useAchievementStatus] Error loading reel stats', e);
  }
  return { bestStreak: 0, gamesWon: 0 };
}

/**
 * Load Daily Alchemy stats from localStorage
 */
async function loadAlchemyStats() {
  if (typeof window === 'undefined') {
    return { longestStreak: 0, totalCompleted: 0, firstDiscoveries: 0 };
  }
  try {
    const stored = window.localStorage.getItem(SOUP_STORAGE_KEYS.STATS);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        longestStreak: parsed.longestStreak || 0,
        totalCompleted: parsed.totalCompleted || 0,
        firstDiscoveries: parsed.firstDiscoveries || 0,
      };
    }
  } catch (e) {
    logger.error('[useAchievementStatus] Error loading alchemy stats', e);
  }
  return { longestStreak: 0, totalCompleted: 0, firstDiscoveries: 0 };
}

/**
 * useAchievementStatus - Load and calculate achievement status
 * Determines which achievements are unlocked and progress toward locked ones
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @param {string} gameMode - Game mode: 'tandem', 'mini', or 'reel'
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

      // Load stats based on game mode
      if (gameMode === 'mini') {
        const miniStats = await loadMiniStats();
        bestStreak = miniStats.longestStreak || 0;
        wins = miniStats.totalCompleted || 0;
        allAchievements = getAllMiniAchievements();
        streakAchievements = getMiniStreakAchievements();
      } else if (gameMode === 'reel') {
        const reelStats = await loadReelStats();
        bestStreak = reelStats.bestStreak || 0;
        wins = reelStats.gamesWon || 0;
        allAchievements = getAllReelAchievements();
        streakAchievements = getReelStreakAchievements();
      } else if (gameMode === 'alchemy') {
        const alchemyStats = await loadAlchemyStats();
        bestStreak = alchemyStats.longestStreak || 0;
        wins = alchemyStats.totalCompleted || 0;
        firstDiscoveries = alchemyStats.firstDiscoveries || 0;
        allAchievements = getAllAlchemyAchievements();
        streakAchievements = getAlchemyStreakAchievements();
        firstDiscoveryAchievements = getAlchemyFirstDiscoveryAchievements();
      } else {
        // Default: Tandem
        const stats = await loadStats();
        bestStreak = stats.bestStreak || 0;
        wins = stats.wins || 0;
        allAchievements = getAllAchievements();
        streakAchievements = getStreakAchievements();
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

        const isUnlocked = currentValue >= achievement.threshold;
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
