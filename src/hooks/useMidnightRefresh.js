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
        console.log('[MidnightRefresh] Date changed from', currentDateRef.current, 'to', currentDate);
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
    const interval = setInterval(checkDate, 10000);

    // Also check at the next midnight ET
    const scheduleNextMidnightCheck = () => {
      const now = new Date();
      const { toZonedTime } = require('date-fns-tz');
      const etNow = toZonedTime(now, 'America/New_York');
      
      // Calculate milliseconds until next midnight ET
      const nextMidnight = new Date(etNow);
      nextMidnight.setHours(24, 0, 1, 0); // 12:00:01 AM next day
      
      const msUntilMidnight = nextMidnight - etNow;
      
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
      if (cleanupTimeout) {cleanupTimeout();}
    };
  }, [onMidnight]);
}