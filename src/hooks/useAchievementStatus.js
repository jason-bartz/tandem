import { useState, useEffect, useCallback } from 'react';
import { loadStats } from '@/lib/storage';
import { getAllAchievements, getStreakAchievements } from '@/lib/achievementDefinitions';
import { calculateAchievementProgress } from '@/lib/achievementChecker';
import logger from '@/lib/logger';

/**
 * useAchievementStatus - Load and calculate achievement status
 * Determines which achievements are unlocked and progress toward locked ones
 *
 * @param {boolean} isOpen - Whether the modal is open (triggers reload)
 * @param {string} gameMode - Game mode: 'tandem'
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
      // Load user stats
      const stats = await loadStats();

      // Tandem uses: bestStreak, wins
      const bestStreak = stats.bestStreak || 0;
      const wins = stats.wins || 0;

      // Get all achievements
      const allAchievements = getAllAchievements();

      // Get streak achievements to properly categorize
      const streakAchievements = getStreakAchievements();

      const achievementsWithStatus = allAchievements.map((achievement) => {
        // Determine if this is a streak or wins achievement
        const isStreakAchievement = streakAchievements.some((a) => a.id === achievement.id);

        const currentValue = isStreakAchievement ? bestStreak : wins;
        const isUnlocked = currentValue >= achievement.threshold;
        const progress = calculateAchievementProgress(currentValue, achievement.threshold);

        // Determine image filename based on achievement type
        const imageFilename = isStreakAchievement
          ? `streak-${achievement.threshold}.png`
          : `complete-${achievement.threshold}.png`;

        return {
          ...achievement,
          isUnlocked,
          progress,
          currentValue,
          imageFilename,
          type: isStreakAchievement ? 'streak' : 'wins',
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
        unlocked: unlockedAchievements.length,
        total: allAchievements.length,
      });
    } catch (err) {
      logger.error('[useAchievementStatus] Failed to load achievement status', {
        error: err.message,
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

  return {
    achievementData,
    loading,
    error,
    reload: loadAchievementStatus,
    getStreakAchievementData,
    getWinsAchievementData,
  };
}

export default useAchievementStatus;
