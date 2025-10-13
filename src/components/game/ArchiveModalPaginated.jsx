'use client';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { getGameHistory } from '@/lib/storage';
import subscriptionService, { INIT_STATE } from '@/services/subscriptionService';
import { getCurrentPuzzleNumber } from '@/lib/puzzleNumber';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { useTheme } from '@/contexts/ThemeContext';
import platformService from '@/services/platform';

/**
 * Production-ready Archive Modal with pagination
 * Follows Apple iOS best practices for performance and UX
 * - Synchronous subscription checks (never blocks UI)
 * - Proper loading states and error boundaries
 * - Eager initialization at app bootstrap
 * - Optimistic UI updates
 */

// Memoized puzzle item component for performance
const PuzzleItem = memo(
  ({ puzzle, isLocked, onClick, formatDate, highContrast }) => {
    // If isLocked is undefined, treat as accessible (not locked)
    const actuallyLocked = isLocked === true;
    const getStatusIcon = () => {
      switch (puzzle.status) {
        case 'completed':
          return { icon: '✓', color: 'text-green-500', title: 'Completed' };
        case 'failed':
          return { icon: '✗', color: 'text-red-500', title: 'Failed' };
        case 'attempted':
          return { icon: '◐', color: 'text-yellow-500', title: 'In Progress' };
        default:
          return { icon: '○', color: 'text-gray-400', title: 'Not Played' };
      }
    };

    const status = getStatusIcon();

    return (
      <button
        onClick={() => onClick(puzzle)}
        className={`w-full p-3 rounded-xl transition-all text-left transform ${
          highContrast
            ? actuallyLocked
              ? 'bg-hc-surface border-4 border-hc-error opacity-75 hover:opacity-100'
              : 'bg-hc-surface border-2 border-hc-border hover:bg-hc-focus hover:text-white active:scale-98'
            : actuallyLocked
              ? 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-98'
        }`}
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
        aria-label={`Puzzle ${puzzle.number}, ${formatDate(puzzle.date)}${actuallyLocked ? ', locked' : ''}, ${status.title}`}
        role="button"
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              Puzzle #{puzzle.number}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {formatDate(puzzle.date)}
            </div>
            {(puzzle.status === 'completed' || puzzle.status === 'failed') &&
              (puzzle.savedTheme || puzzle.theme) && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  {puzzle.savedTheme || puzzle.theme}
                </div>
              )}
          </div>
          <div className="flex items-center gap-2">
            {actuallyLocked ? (
              <span className="text-gray-500 dark:text-gray-400 text-xl">🔒</span>
            ) : (
              <div className={`${status.color} text-xl`} title={status.title}>
                {status.icon}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for performance optimization
    return (
      prevProps.puzzle.number === nextProps.puzzle.number &&
      prevProps.puzzle.date === nextProps.puzzle.date &&
      prevProps.puzzle.status === nextProps.puzzle.status &&
      prevProps.puzzle.savedTheme === nextProps.puzzle.savedTheme &&
      prevProps.puzzle.theme === nextProps.puzzle.theme &&
      prevProps.isLocked === nextProps.isLocked &&
      prevProps.highContrast === nextProps.highContrast
    );
  }
);

PuzzleItem.displayName = 'PuzzleItem';

// Skeleton loader for smooth loading experience
const SkeletonLoader = ({ count = 3, highContrast }) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className={`w-full p-3 rounded-xl mb-2 ${
          highContrast ? 'bg-hc-surface border-2 border-hc-border' : 'bg-gray-100 dark:bg-gray-700'
        }`}
      >
        <div className="animate-pulse">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
            <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    ))}
  </>
);

// Cache for number-based data with memory management
const paginatedCache = {
  puzzles: {}, // Store actual puzzle data by range key
  lastFetch: 0,
  puzzleAccessMap: {},
  etag: null,
  maxCacheEntries: 10, // Limit cache size to prevent memory issues
};

const BATCH_SIZE = 20;
const SCROLL_THRESHOLD = 300; // Load more when within 300px of bottom

export default function ArchiveModalPaginated({ isOpen, onClose, onSelectPuzzle }) {
  const [puzzles, setPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleAccessMap, setPuzzleAccessMap] = useState({});
  const [startNumber, setStartNumber] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentPuzzleNumber, setCurrentPuzzleNumber] = useState(getCurrentPuzzleNumber());
  const [error, setError] = useState(null);

  const { highContrast } = useTheme();
  const scrollContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isInitialLoad = useRef(true);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  /**
   * Clean up old cache entries to prevent memory bloat
   * Following Apple's memory management best practices
   */
  const cleanupCache = useCallback(() => {
    const entries = Object.keys(paginatedCache.puzzles);
    if (entries.length > paginatedCache.maxCacheEntries) {
      // Remove oldest entries (keep most recent)
      const entriesToRemove = entries.slice(0, entries.length - paginatedCache.maxCacheEntries);
      entriesToRemove.forEach((key) => {
        delete paginatedCache.puzzles[key];
      });
    }
  }, []);

  // Load puzzles using number-based archive API
  const loadPuzzles = useCallback(
    async (loadStart = null, append = false) => {
      // Prevent concurrent loads
      if (loadingRef.current) return;
      loadingRef.current = true;

      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        setError(null);

        if (!append) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const currentNum = getCurrentPuzzleNumber();
        setCurrentPuzzleNumber(currentNum);

        // Calculate range
        const endNum = loadStart === null ? currentNum : loadStart - 1;
        const calculatedStartNum = Math.max(1, endNum - BATCH_SIZE + 1);
        const cacheKey = `${calculatedStartNum}-${endNum}`;

        // Check if we have cached data for this exact range (don't use ETag on initial load)
        const useCachedData = paginatedCache.puzzles[cacheKey] && !isInitialLoad.current;

        // Fetch from new archive endpoint
        const headers = {};
        // Only send ETag if we're reloading the same range
        if (useCachedData && paginatedCache.etag) {
          headers['If-None-Match'] = paginatedCache.etag;
        }

        let response;
        let data;
        let useCache = false;

        // Use CapacitorHttp on iOS to bypass CORS
        if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
          const apiUrl = platformService.getApiUrl('/api/puzzles/archive');
          response = await CapacitorHttp.get({
            url: `${apiUrl}?start=${calculatedStartNum}&end=${endNum}&limit=${BATCH_SIZE}`,
            headers: {
              ...headers,
              Accept: 'application/json',
            },
            responseType: 'json',
          });

          // Handle 304 Not Modified - use cached data
          if (response.status === 304) {
            useCache = true;
          } else if (response.status >= 400) {
            // Defensive parsing: handle both string and object responses
            let errorData;
            try {
              errorData =
                typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            } catch (parseError) {
              console.error('[ArchiveModal] Failed to parse error response:', parseError);
              errorData = {};
            }
            throw new Error(errorData?.error || 'Failed to fetch puzzles');
          } else {
            // Defensive parsing: CapacitorHttp may return string or object
            try {
              data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            } catch (parseError) {
              console.error('[ArchiveModal] Failed to parse response data:', parseError);
              throw new Error('Invalid response format from server');
            }
          }
        } else {
          // Use regular fetch for web
          response = await fetch(
            `/api/puzzles/archive?start=${calculatedStartNum}&end=${endNum}&limit=${BATCH_SIZE}`,
            {
              signal: abortControllerRef.current.signal,
              headers,
            }
          );

          // Handle 304 Not Modified - use cached data
          if (response.status === 304) {
            useCache = true;
          } else if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch puzzles');
          } else {
            data = await response.json();
          }
        }

        // Use cached data if 304 response
        if (useCache && paginatedCache.puzzles[cacheKey]) {
          // Get fresh game history to update status
          const gameHistory = await getGameHistory();
          const cachedPuzzles = paginatedCache.puzzles[cacheKey];

          // Update with latest game history
          const refreshedPuzzles = cachedPuzzles.map((puzzle) => {
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
              savedTheme: historyData.theme,
            };
          });

          // Update state
          if (append) {
            setPuzzles((prev) => [...prev, ...refreshedPuzzles]);
          } else {
            setPuzzles(refreshedPuzzles);
          }

          setHasMore(true); // Assume more for cached data (will be updated on next fetch)
          setStartNumber(calculatedStartNum);

          // Check access permissions
          checkAccessPermissions(refreshedPuzzles, append);
        } else if (data && data.success) {
          // Store ETag for caching
          const etag =
            Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
              ? response.headers?.ETag || response.headers?.etag
              : response.headers.get('ETag');
          if (etag) {
            paginatedCache.etag = etag;
          }

          // Get game history for status
          const gameHistory = await getGameHistory();

          // Process puzzles with game history
          const processedPuzzles = data.puzzles.map((puzzle) => {
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
              savedTheme: historyData.theme,
              theme: puzzle.theme,
            };
          });

          // Cache the processed puzzles with timestamp
          paginatedCache.puzzles[cacheKey] = processedPuzzles;
          paginatedCache.lastFetch = Date.now();

          // Cleanup old cache entries
          cleanupCache();

          // Update state
          if (append) {
            setPuzzles((prev) => [...prev, ...processedPuzzles]);
          } else {
            setPuzzles(processedPuzzles);
          }

          setHasMore(data.pagination.hasMore);
          setStartNumber(calculatedStartNum);

          // Check access permissions
          checkAccessPermissions(processedPuzzles, append);
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Log error for debugging in development
          if (process.env.NODE_ENV === 'development') {
            console.error('[ArchiveModal] Failed to load puzzles:', error);
          }
          setError(error.message || 'Failed to load puzzles. Please try again.');
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        loadingRef.current = false;
        isInitialLoad.current = false;
      }
      // checkAccessPermissions is intentionally excluded - it's called immediately after setting puzzles
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cleanupCache]
  );

  /**
   * Check access permissions for puzzles - SYNCHRONOUS and INSTANT
   * Uses cached subscription status from subscriptionService
   * Never blocks UI thread
   */
  const checkAccessPermissions = useCallback(
    (puzzlesToCheck, append = false) => {
      const accessMap = append ? { ...puzzleAccessMap } : {};

      // Force re-check subscription status to ensure it's current
      // Note: isSubscribed is checked internally by canAccessPuzzle

      puzzlesToCheck.forEach((puzzle) => {
        const cacheKey = puzzle.number.toString();

        // Always re-check access to ensure accuracy after restore/purchase
        // This is synchronous and fast, so no performance impact
        const hasAccess =
          !Capacitor.isNativePlatform() || subscriptionService.canAccessPuzzle(puzzle.number);

        accessMap[cacheKey] = !hasAccess; // Invert for lock display
        paginatedCache.puzzleAccessMap[cacheKey] = hasAccess;
      });

      // Update state once with all results
      if (append) {
        setPuzzleAccessMap((prev) => ({ ...prev, ...accessMap }));
      } else {
        setPuzzleAccessMap(accessMap);
      }
    },
    [puzzleAccessMap]
  );

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!isOpen) return;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!sentinelRef.current) return;

      const options = {
        root: scrollContainerRef.current,
        rootMargin: `${SCROLL_THRESHOLD}px`,
        threshold: 0.01,
      };

      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingRef.current && !isLoadingMore) {
          // Load next batch starting from current startNumber
          loadPuzzles(startNumber, true);
        }
      }, options);

      if (sentinelRef.current) {
        observerRef.current.observe(sentinelRef.current);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isOpen, hasMore, startNumber, loadPuzzles, isLoadingMore]);

  /**
   * Handle puzzle click - SYNCHRONOUS and INSTANT
   * No async calls, no blocking, follows iOS best practices
   */
  const handlePuzzleClick = useCallback(
    (puzzle) => {
      // Get lock status from cache (synchronously populated on load)
      const isLocked = puzzleAccessMap[puzzle.number.toString()] === true;

      if (isLocked) {
        // Show paywall immediately - no waiting
        setShowPaywall(true);
        return;
      }

      // Puzzle is accessible - load it by puzzle number
      onSelectPuzzle(puzzle.number);
    },
    [puzzleAccessMap, onSelectPuzzle]
  );

  // Handle purchase complete
  const handlePurchaseComplete = () => {
    // Refresh subscription status in background
    subscriptionService.refreshSubscriptionStatus().then(() => {
      // Clear cache and re-check access synchronously with new subscription state
      paginatedCache.puzzleAccessMap = {};
      checkAccessPermissions(puzzles);
    });
  };

  // Format date for display
  const formatDate = useCallback((dateStr) => {
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
  }, []);

  // Subscribe to subscription init state changes
  useEffect(() => {
    const unsubscribe = subscriptionService.onStateChange((newState) => {
      // When subscription becomes ready, re-check puzzle access
      if (newState === INIT_STATE.READY && puzzles.length > 0) {
        paginatedCache.puzzleAccessMap = {}; // Clear cache
        checkAccessPermissions(puzzles, false);
      }
    });

    return unsubscribe;
  }, [puzzles, checkAccessPermissions]);

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset state
      setHasMore(true);
      loadingRef.current = false;

      // Always refresh subscription status when modal opens to ensure it's current
      // This is important after restoring purchases or app launch
      if (Capacitor.isNativePlatform() && subscriptionService.isReady()) {
        subscriptionService.refreshSubscriptionStatus().then(() => {
          // Clear the access cache to force re-check with updated status
          paginatedCache.puzzleAccessMap = {};
        });
      }

      if (isInitialLoad.current || puzzles.length === 0) {
        // First time opening OR puzzles are empty - fetch fresh data
        setPuzzles([]);
        setPuzzleAccessMap({}); // Reset access map
        loadPuzzles(null, false); // Load from current puzzle number
      } else {
        // Modal reopened with existing puzzles - refresh game history
        getGameHistory().then((gameHistory) => {
          setPuzzles((prev) =>
            prev.map((puzzle) => {
              const historyData = gameHistory[puzzle.date] || {};
              return {
                ...puzzle,
                completed: historyData.completed || false,
                failed: historyData.failed || false,
                attempted: historyData.attempted || false,
                status: historyData.status || 'not_played',
                savedTheme: historyData.theme,
                theme: puzzle.theme, // Preserve original theme
              };
            })
          );
        });
        // Re-check permissions synchronously with current subscription state
        if (puzzles.length > 0) {
          // Clear cache to ensure fresh check
          paginatedCache.puzzleAccessMap = {};
          checkAccessPermissions(puzzles, false);
        }
      }
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // checkAccessPermissions and puzzles are intentionally excluded to avoid circular deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadPuzzles]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-backdrop-enter gpu-accelerated"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col animate-modal-enter gpu-accelerated ${
          highContrast ? 'bg-hc-background border-4 border-hc-border' : 'bg-white dark:bg-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2
              id="archive-modal-title"
              className="text-2xl font-bold text-gray-800 dark:text-gray-200"
            >
              Puzzle Archive
            </h2>
            {currentPuzzleNumber > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {currentPuzzleNumber} puzzles available
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full border-none text-lg cursor-pointer transition-all flex items-center justify-center ${
              highContrast
                ? 'bg-hc-surface text-hc-text border-2 border-hc-border hover:bg-hc-primary hover:text-white font-bold'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}

        {/* Puzzle List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
          onScroll={(e) => {
            const container = e.target;
            const scrollBottom = container.scrollTop + container.clientHeight;
            const scrollThreshold = container.scrollHeight - SCROLL_THRESHOLD;

            if (
              scrollBottom >= scrollThreshold &&
              hasMore &&
              !loadingRef.current &&
              !isLoadingMore
            ) {
              // Load next batch starting from current startNumber
              loadPuzzles(startNumber, true);
            }
          }}
        >
          {isLoading && puzzles.length === 0 ? (
            <SkeletonLoader count={5} highContrast={highContrast} />
          ) : puzzles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No puzzles available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {puzzles.map((puzzle) => (
                <PuzzleItem
                  key={puzzle.number}
                  puzzle={puzzle}
                  isLocked={puzzleAccessMap[puzzle.number.toString()]}
                  onClick={handlePuzzleClick}
                  formatDate={formatDate}
                  highContrast={highContrast}
                />
              ))}

              {/* Loading more indicator */}
              {isLoadingMore && <SkeletonLoader count={3} highContrast={highContrast} />}

              {/* Sentinel for infinite scroll */}
              {hasMore && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {!isLoadingMore && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">Scroll for more</div>
                  )}
                </div>
              )}

              {/* End of list message */}
              {!hasMore && puzzles.length > 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  You've reached the beginning!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`mt-4 w-full py-3 text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-102 active:scale-98 ${
            highContrast
              ? 'bg-hc-primary border-4 border-hc-border hover:bg-hc-focus'
              : 'bg-gradient-to-r from-sky-500 to-teal-400 dark:from-sky-600 dark:to-teal-500'
          }`}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
          }}
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
