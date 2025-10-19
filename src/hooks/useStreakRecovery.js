'use client';

import { useState, useCallback } from 'react';
import { recoverStreak, debugStreakStatus } from '@/lib/fixStreak';
import { loadStats } from '@/lib/storage';

export function useStreakRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  const performRecovery = useCallback(async () => {
    setIsRecovering(true);
    setRecoveryResult(null);

    try {
      console.log('[useStreakRecovery] Starting recovery...');
      const result = await recoverStreak();
      setRecoveryResult({
        success: true,
        stats: result,
        message: `Streak recovered: ${result.currentStreak}`,
      });
      console.log('[useStreakRecovery] Recovery complete:', result);
    } catch (error) {
      console.error('[useStreakRecovery] Recovery failed:', error);
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
      console.error('[useStreakRecovery] Debug failed:', error);
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
      console.error('[useStreakRecovery] Health check failed:', error);
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
