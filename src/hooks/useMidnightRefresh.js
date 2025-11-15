'use client';
import { useEffect, useRef } from 'react';
import { getCurrentPuzzleInfo } from '@/lib/utils';

export function useMidnightRefresh(onMidnight) {
  const currentDateRef = useRef(null);

  useEffect(() => {
    // Check date every second
    const checkDate = () => {
      const currentInfo = getCurrentPuzzleInfo();
      const currentDate = currentInfo.isoDate;

      // If the date has changed since last check
      if (currentDateRef.current && currentDateRef.current !== currentDate) {
        // Trigger the callback
        if (onMidnight) {
          onMidnight();
        }
      }

      currentDateRef.current = currentDate;
    };

    // Initial check
    checkDate();

    // Check every 10 seconds for date change
    // This works in all timezones since getCurrentPuzzleInfo() now uses local timezone
    const interval = setInterval(checkDate, 10000);

    // Also schedule a check at the next local midnight for immediate response
    const scheduleNextMidnightCheck = () => {
      const now = new Date();

      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 1, 0); // 12:00:01 AM next day in local timezone

      const msUntilMidnight = nextMidnight - now;

      if (msUntilMidnight > 0) {
        const timeout = setTimeout(() => {
          checkDate();
          scheduleNextMidnightCheck(); // Schedule the next one
        }, msUntilMidnight);

        return () => clearTimeout(timeout);
      }
    };

    const cleanupTimeout = scheduleNextMidnightCheck();

    return () => {
      clearInterval(interval);
      if (cleanupTimeout) {
        cleanupTimeout();
      }
    };
  }, [onMidnight]);
}
