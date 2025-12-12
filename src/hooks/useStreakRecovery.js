'use client';

import { useState, useCallback } from 'react';
import { recoverStreak, debugStreakStatus } from '@/lib/fixStreak';
import { loadStats } from '@/lib/storage';
import logger from '@/lib/logger';

export function useStreakRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const performRecovery = useCallback(async () => {
    setIsRecovering(true);
    setRecoveryResult(null);

    try {
      const result = await recoverStreak();
      setRecoveryResult({
        success: true,
        stats: result,
        message: `Streak recovered: ${result.currentStreak}`,
      });
    } catch (error) {
      logger.error('[useStreakRecovery] Recovery failed', error);
      setRecoveryResult({
        success: false,
        error: error.message,
        message: 'Failed to recover streak',
      });
    } finally {
      setIsRecovering(false);
    }
  }, []);

  const getDebugInfo = useCallback(async () => {
    try {
      const info = await debugStreakStatus();
      setDebugInfo(info);
      return info;
    } catch (error) {
      logger.error('[useStreakRecovery] Debug failed', error);
      return null;
    }
  }, []);

  const checkStreakHealth = useCallback(async () => {
    try {
      const stats = await loadStats();
      const isHealthy =
        stats.currentStreak >= 0 &&
        stats.bestStreak >= stats.currentStreak &&
        stats.lastStreakUpdate !== undefined;

      return {
        isHealthy,
        stats,
        issues: !isHealthy
          ? [
              stats.currentStreak < 0 && 'Current streak is negative',
              stats.bestStreak < stats.currentStreak && 'Best streak is less than current',
              !stats.lastStreakUpdate && 'Missing streak update timestamp',
            ].filter(Boolean)
          : [],
      };
    } catch (error) {
      logger.error('[useStreakRecovery] Health check failed', error);
      return { isHealthy: false, error: error.message };
    }
  }, []);

  return {
    performRecovery,
    getDebugInfo,
    checkStreakHealth,
    isRecovering,
    recoveryResult,
    debugInfo,
  };
}
