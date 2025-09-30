'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { getGameHistory } from '@/lib/storage';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import puzzleService from '@/services/puzzle.service';
import subscriptionService from '@/services/subscriptionService';
import platformService from '@/services/platform';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '@/contexts/ThemeContext';

// Global cache to persist across component mounts/unmounts
const globalArchiveCache = {
  puzzles: [],
  lastFetch: null,
  isLoading: false,
  puzzleAccessMap: {}, // Cache access permissions
};

const CACHE_DURATION = 30000; // 30 seconds

export default function ArchiveModal({ isOpen, onClose, onSelectPuzzle }) {
  const [puzzles, setPuzzles] = useState(globalArchiveCache.puzzles || []);
  const [isLoading, setIsLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleAccessMap, setPuzzleAccessMap] = useState(globalArchiveCache.puzzleAccessMap || {});
  const [accessCheckComplete, setAccessCheckComplete] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const scrollContainerRef = useRef(null);
  const lastScrollTop = useRef(0);
  const { highContrast } = useTheme();

  const loadAvailablePuzzles = useCallback(async (forceRefresh = false) => {
    // Check if we have recent cached data (unless forcing refresh)
    const now = Date.now();
    if (
      !forceRefresh &&
      globalArchiveCache.lastFetch &&
      now - globalArchiveCache.lastFetch < CACHE_DURATION &&
      globalArchiveCache.puzzles.length > 0
    ) {
      // Even when using cache, refresh the game history to get latest status
      const gameHistory = getGameHistory();
      const updatedPuzzles = globalArchiveCache.puzzles.map((puzzle) => {
        const historyData = gameHistory[puzzle.date] || {};
        return {
          ...puzzle,
          completed: historyData.completed || false,
          failed: historyData.failed || false,
          attempted: historyData.attempted || false,
          status: historyData.status || 'not_played',
          time: historyData.time,
          mistakes: historyData.mistakes,
          solved: historyData.solved,
        };
      });
      setPuzzles(updatedPuzzles);
      globalArchiveCache.puzzles = updatedPuzzles;
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

      // Try batch endpoint first - disabled for native iOS
      // Skip batch endpoint on native iOS since API routes aren't available locally
      // Use isWeb check instead of isPlatformNative to ensure we use batch on web
      const skipBatch = !platformService.isPlatformWeb();

      if (!skipBatch) {
        try {
          const response = await fetch('/api/puzzles/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dates: datesToFetch }),
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
                  puzzleNumber: puzzleData.puzzleNumber,
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
      }

      // Fallback: Fetch all puzzles in parallel using puzzle service
      const puzzlePromises = datesToFetch.map(async (date) => {
        try {
          const data = await puzzleService.getPuzzle(date);
          if (data && data.puzzle) {
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
              puzzleNumber: data.puzzleNumber,
            };
          }
        } catch (err) {
          console.error(`Failed to fetch puzzle for ${date}:`, err);
        }
        return null;
      });

      const results = await Promise.all(puzzlePromises);
      const puzzleList = results.filter((p) => p !== null);

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
      // Reset access check state when opening
      setAccessCheckComplete(false);
      setInitialCheckDone(false);
      // Always load puzzles when opening (this will update status from cache)
      loadAvailablePuzzles();
      // Check subscription status
      checkSubscriptionStatus();

      // Restore scroll position after modal opens
      if (scrollContainerRef.current && lastScrollTop.current > 0) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = lastScrollTop.current;
          }
        }, 50);
      }
    } else {
      // Save scroll position when closing
      if (scrollContainerRef.current) {
        lastScrollTop.current = scrollContainerRef.current.scrollTop;
      }
    }
  }, [isOpen, loadAvailablePuzzles]);

  const checkSubscriptionStatus = async () => {
    if (Capacitor.isNativePlatform()) {
      const subscribed = await subscriptionService.isSubscribed();
      setIsSubscribed(subscribed);
    }
  };

  const checkPuzzleAccess = useCallback(
    async (puzzleDate) => {
      if (!Capacitor.isNativePlatform()) {
        return true;
      } // All free on web for now

      // Use cached value if available and access check is complete
      if (accessCheckComplete && globalArchiveCache.puzzleAccessMap[puzzleDate] !== undefined) {
        return globalArchiveCache.puzzleAccessMap[puzzleDate];
      }

      // Check with subscription service
      const hasAccess = await subscriptionService.canAccessPuzzle(puzzleDate);
      // Cache the result immediately
      globalArchiveCache.puzzleAccessMap[puzzleDate] = hasAccess;
      return hasAccess;
    },
    [accessCheckComplete]
  );

  useEffect(() => {
    // Check access for all puzzles when they change
    const checkAllAccess = async () => {
      const accessMap = {};

      // For initial render, use cached values or null (unknown state)
      for (const puzzle of puzzles) {
        if (globalArchiveCache.puzzleAccessMap[puzzle.date] !== undefined) {
          accessMap[puzzle.date] = globalArchiveCache.puzzleAccessMap[puzzle.date];
        } else {
          // Use null to indicate "checking" state instead of defaulting to true
          accessMap[puzzle.date] = null;
        }
      }

      // Set initial state immediately
      setPuzzleAccessMap(accessMap);
      setInitialCheckDone(true);

      // Only do async checks for puzzles we don't have cached
      const puzzlesToCheck = puzzles.filter(
        (puzzle) => globalArchiveCache.puzzleAccessMap[puzzle.date] === undefined
      );

      if (puzzlesToCheck.length > 0) {
        const updatedAccessMap = { ...accessMap };

        // Check access in batches to avoid overwhelming the system
        const batchSize = 10;
        for (let i = 0; i < puzzlesToCheck.length; i += batchSize) {
          const batch = puzzlesToCheck.slice(i, i + batchSize);
          const batchPromises = batch.map(async (puzzle) => {
            const hasAccess = await checkPuzzleAccess(puzzle.date);
            updatedAccessMap[puzzle.date] = hasAccess;
            return { date: puzzle.date, hasAccess };
          });

          const results = await Promise.all(batchPromises);

          // Update state after each batch completes
          setPuzzleAccessMap((prev) => {
            const newMap = { ...prev };
            results.forEach(({ date, hasAccess }) => {
              newMap[date] = hasAccess;
            });
            return newMap;
          });
        }
      }

      setAccessCheckComplete(true);
    };

    if (puzzles.length > 0 && isOpen) {
      checkAllAccess();
    }
  }, [puzzles, checkPuzzleAccess, isOpen]);

  const handlePuzzleClick = async (puzzle) => {
    const hasAccess = puzzleAccessMap[puzzle.date] !== false;

    if (!hasAccess) {
      // Show paywall for locked puzzles
      setShowPaywall(true);
    } else {
      onSelectPuzzle(puzzle.date);
    }
  };

  const handlePurchaseComplete = async () => {
    // Refresh subscription status
    await checkSubscriptionStatus();
    // Clear cache to force re-check
    globalArchiveCache.puzzleAccessMap = {};
    // Re-check puzzle access
    const accessMap = {};
    for (const puzzle of puzzles) {
      const hasAccess = await checkPuzzleAccess(puzzle.date);
      accessMap[puzzle.date] = hasAccess;
      globalArchiveCache.puzzleAccessMap[puzzle.date] = hasAccess;
    }
    setPuzzleAccessMap(accessMap);
  };

  if (!isOpen) {
    return null;
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) {
      return 'Today';
    }
    if (date.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div
        className={`rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col ${
          highContrast ? 'bg-hc-background border-4 border-hc-border' : 'bg-white dark:bg-gray-800'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Puzzle Archive</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto space-y-2 relative"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            minHeight: '200px',
            maxHeight: 'calc(80vh - 180px)',
          }}
          onScroll={(e) => {
            // Prevent scroll from jumping by preserving position
            e.stopPropagation();
          }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading puzzles...</p>
            </div>
          ) : puzzles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No puzzles available</p>
            </div>
          ) : (
            puzzles.map((puzzle) => {
              // Use cached value, show loading state if null (checking)
              const accessStatus = puzzleAccessMap[puzzle.date];
              const isChecking = accessStatus === null || accessStatus === undefined;
              const isLocked = accessStatus === false;

              // Don't show lock icon until we've checked at least once
              const showLockIcon = !initialCheckDone ? false : isLocked;

              return (
                <button
                  key={puzzle.date}
                  onClick={() => !isChecking && handlePuzzleClick(puzzle)}
                  disabled={isChecking}
                  className={`w-full p-3 rounded-xl transition-all text-left ${
                    highContrast
                      ? isChecking
                        ? 'bg-hc-surface border-2 border-hc-border opacity-50 cursor-wait'
                        : showLockIcon
                          ? 'bg-hc-surface border-4 border-hc-error opacity-75 hover:opacity-100'
                          : 'bg-hc-surface border-2 border-hc-border hover:bg-hc-focus hover:text-white'
                      : isChecking
                        ? 'bg-gray-100 dark:bg-gray-700 opacity-50 cursor-wait'
                        : showLockIcon
                          ? 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
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
                      {isChecking ? (
                        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : showLockIcon ? (
                        <span className="text-gray-500 dark:text-gray-400 text-xl">🔒</span>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={onClose}
          className={`mt-4 w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all ${
            highContrast
              ? 'bg-hc-primary border-4 border-hc-border hover:bg-hc-focus'
              : 'bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500'
          }`}
        >
          Close
        </button>
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}
