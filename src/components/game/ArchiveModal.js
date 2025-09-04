'use client';
import { useEffect, useState, useCallback } from 'react';
import { getGameHistory } from '@/lib/storage';
import { getCurrentPuzzleInfo } from '@/lib/utils';

// Global cache to persist across component mounts/unmounts
const globalArchiveCache = {
  puzzles: [],
  lastFetch: null,
  isLoading: false
};

const CACHE_DURATION = 30000; // 30 seconds

export default function ArchiveModal({ isOpen, onClose, onSelectPuzzle }) {
  const [puzzles, setPuzzles] = useState(globalArchiveCache.puzzles || []);
  const [isLoading, setIsLoading] = useState(false);

  const loadAvailablePuzzles = useCallback(async () => {
    // Check if we have recent cached data
    const now = Date.now();
    if (globalArchiveCache.lastFetch && 
        (now - globalArchiveCache.lastFetch) < CACHE_DURATION &&
        globalArchiveCache.puzzles.length > 0) {
      setPuzzles(globalArchiveCache.puzzles);
      return;
    }

    // Prevent concurrent loads
    if (globalArchiveCache.isLoading) {
      return;
    }

    globalArchiveCache.isLoading = true;
    setIsLoading(true);
    
    try {
      // Get game history first
      const gameHistory = getGameHistory();
      
      // Get today's date using Eastern Time
      const currentInfo = getCurrentPuzzleInfo();
      const todayStr = currentInfo.isoDate;
      
      // Generate available puzzle dates from Aug 16 to yesterday
      const startDate = new Date('2025-08-16T00:00:00');
      const todayObj = new Date(todayStr + 'T00:00:00');
      const availableDates = [];
      
      // Generate all dates from start to yesterday
      const currentDate = new Date(startDate);
      while (currentDate < todayObj) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        availableDates.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const datesToFetch = availableDates;
      
      // Try batch endpoint first
      try {
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
          
          // Sort by date descending (most recent first)
          puzzleList.sort((a, b) => b.date.localeCompare(a.date));
          
          // Update both state and global cache
          setPuzzles(puzzleList);
          globalArchiveCache.puzzles = puzzleList;
          globalArchiveCache.lastFetch = Date.now();
          
          return;
        }
      } catch (err) {
        // Batch endpoint failed, fall back to parallel fetching
        console.error('Batch fetch failed:', err);
      }
      
      // Fallback: Fetch all puzzles in parallel
      const puzzlePromises = datesToFetch.map(async (date) => {
        try {
          const response = await fetch(`/api/puzzle?date=${date}`);
          if (response.ok) {
            const data = await response.json();
            if (data.puzzle) {
              const historyData = gameHistory[date] || {};
              return {
                date,
                theme: data.puzzle.theme,
                completed: historyData.completed || false,
                failed: historyData.failed || false,
                attempted: historyData.attempted || false,
                status: historyData.status || 'not_played',
                time: historyData.time,
                mistakes: historyData.mistakes,
                solved: historyData.solved,
                puzzleNumber: data.puzzleNumber
              };
            }
          }
        } catch (err) {
          console.error(`Failed to fetch puzzle for ${date}:`, err);
        }
        return null;
      });
      
      const results = await Promise.all(puzzlePromises);
      const puzzleList = results.filter(p => p !== null);
      
      // Sort by date descending (most recent first)
      puzzleList.sort((a, b) => b.date.localeCompare(a.date));
      
      // Update both state and global cache
      setPuzzles(puzzleList);
      globalArchiveCache.puzzles = puzzleList;
      globalArchiveCache.lastFetch = Date.now();
      
    } catch (error) {
      console.error('Error loading archive puzzles:', error);
    } finally {
      setIsLoading(false);
      globalArchiveCache.isLoading = false;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Only load puzzles if cache is empty
      if (globalArchiveCache.puzzles.length === 0) {
        loadAvailablePuzzles();
      } else {
        // Just set the cached puzzles without updating game history
        // This prevents scroll reset
        setPuzzles(globalArchiveCache.puzzles);
      }
    }
  }, [isOpen, loadAvailablePuzzles]);

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Puzzle Archive
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {puzzles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading puzzles...</p>
            </div>
          ) : (
            puzzles.map((puzzle) => (
              <button
                key={puzzle.date}
                onClick={() => {
                  onSelectPuzzle(puzzle.date);
                }}
                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatDate(puzzle.date)}
                      {puzzle.puzzleNumber && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          #{puzzle.puzzleNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {puzzle.theme || 'No theme'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {puzzle.status === 'completed' && (
                      <div className="text-green-500 text-xl" title="Completed">
                        ✓
                      </div>
                    )}
                    {puzzle.status === 'failed' && (
                      <div className="text-red-500 text-xl" title="Failed">
                        ✗
                      </div>
                    )}
                    {puzzle.status === 'attempted' && (
                      <div className="text-yellow-500 text-xl" title="In Progress">
                        ◐
                      </div>
                    )}
                    {puzzle.status === 'not_played' && (
                      <div className="text-gray-400 text-xl" title="Not Played">
                        ○
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}