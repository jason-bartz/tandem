'use client';
import { useState, useCallback } from 'react';
import { getGameHistory } from '@/lib/storage';

const archiveCache = {
  data: null,
  timestamp: null,
  isLoading: false
};

const CACHE_DURATION = 60000; // 1 minute cache

export function useArchivePreload() {
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadArchive = useCallback(async () => {
    // Check if cache is still valid
    if (
      archiveCache.data && 
      archiveCache.timestamp && 
      Date.now() - archiveCache.timestamp < CACHE_DURATION
    ) {
      return archiveCache.data;
    }

    // Prevent multiple simultaneous loads
    if (archiveCache.isLoading) {
      return;
    }

    archiveCache.isLoading = true;
    setIsPreloading(true);

    try {
      const gameHistory = getGameHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const availableDates = [
        '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19', '2025-08-20',
        '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24', '2025-08-25',
        '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29', '2025-08-30'
      ];
      
      const datesToFetch = availableDates.filter(date => date < todayStr);
      
      // Try batch endpoint
      const response = await fetch('/api/puzzles/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dates: datesToFetch })
      });
      
      if (response.ok) {
        const data = await response.json();
        const puzzleList = [];
        
        for (const date of datesToFetch) {
          const puzzleData = data.puzzles[date];
          if (puzzleData && puzzleData.puzzle) {
            const historyData = gameHistory[date] || {};
            puzzleList.push({
              date,
              theme: puzzleData.puzzle.theme,
              completed: historyData.completed || false,
              failed: historyData.failed || false,
              attempted: historyData.attempted || false,
              status: historyData.status || 'not_played',
              time: historyData.time,
              mistakes: historyData.mistakes,
              solved: historyData.solved,
              puzzleNumber: puzzleData.puzzleNumber
            });
          }
        }
        
        puzzleList.sort((a, b) => b.date.localeCompare(a.date));
        
        // Update cache
        archiveCache.data = puzzleList;
        archiveCache.timestamp = Date.now();
        
        return puzzleList;
      }
    } catch (error) {
      console.error('Error preloading archive:', error);
    } finally {
      archiveCache.isLoading = false;
      setIsPreloading(false);
    }
  }, []);

  const getCachedData = useCallback(() => {
    if (
      archiveCache.data && 
      archiveCache.timestamp && 
      Date.now() - archiveCache.timestamp < CACHE_DURATION
    ) {
      return archiveCache.data;
    }
    return null;
  }, []);

  return {
    preloadArchive,
    getCachedData,
    isPreloading
  };
}