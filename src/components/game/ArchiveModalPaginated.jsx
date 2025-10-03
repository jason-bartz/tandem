'use client';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { getGameHistory } from '@/lib/storage';
import subscriptionService from '@/services/subscriptionService';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { useTheme } from '@/contexts/ThemeContext';
import platformService from '@/services/platform';

/**
 * Production-ready Archive Modal with pagination
 * Follows Apple iOS best practices for performance and UX
 * Supports infinite scroll with native scrolling for smooth performance
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
        onClick={() => !actuallyLocked && onClick(puzzle)}
        disabled={actuallyLocked}
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
      >
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-semibold text-gray-800 dark:text-gray-200">
              {formatDate(puzzle.date)}
              {puzzle.puzzleNumber && (
                <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                  #{puzzle.puzzleNumber}
                </span>
              )}
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

// Cache for paginated data
const paginatedCache = {
  pages: {},
  lastFetch: {},
  puzzleAccessMap: {},
  totalCount: 0,
  etag: null,
};

const CACHE_DURATION = 300000; // 5 minutes
const PAGE_SIZE = 20;
const SCROLL_THRESHOLD = 300; // Load more when within 300px of bottom

export default function ArchiveModalPaginated({ isOpen, onClose, onSelectPuzzle }) {
  const [puzzles, setPuzzles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [puzzleAccessMap, setPuzzleAccessMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);

  const { highContrast } = useTheme();
  const scrollContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isInitialLoad = useRef(true);
  const loadingRef = useRef(false);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  // Load puzzles with pagination
  const loadPuzzles = useCallback(async (page = 1, append = false) => {
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

      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      // Check cache first
      const now = Date.now();
      const cacheKey = `page-${page}`;

      if (
        !append &&
        paginatedCache.pages[cacheKey] &&
        paginatedCache.lastFetch[cacheKey] &&
        now - paginatedCache.lastFetch[cacheKey] < CACHE_DURATION
      ) {
        // Use cached data
        setPuzzles(paginatedCache.pages[cacheKey]);
        setTotalCount(paginatedCache.totalCount);
        setHasMore(page * PAGE_SIZE < paginatedCache.totalCount);
        return;
      }

      // Fetch from paginated endpoint
      const headers = {};
      if (paginatedCache.etag && !append) {
        headers['If-None-Match'] = paginatedCache.etag;
      }

      let response;
      let data;

      // Use CapacitorHttp on iOS to bypass CORS
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        const apiUrl = platformService.getApiUrl('/api/puzzles/paginated');
        response = await CapacitorHttp.get({
          url: `${apiUrl}?page=${page}&limit=${PAGE_SIZE}&sort=desc`,
          headers,
        });

        // CapacitorHttp returns data directly
        data = response.data;

        // Handle 304 Not Modified
        if (response.status === 304 && paginatedCache.pages[cacheKey]) {
          setPuzzles(paginatedCache.pages[cacheKey]);
          setTotalCount(paginatedCache.totalCount);
          setHasMore(page * PAGE_SIZE < paginatedCache.totalCount);
          return;
        }

        if (response.status >= 400) {
          throw new Error('Failed to fetch puzzles');
        }
      } else {
        // Use regular fetch for web
        response = await fetch(`/api/puzzles/paginated?page=${page}&limit=${PAGE_SIZE}&sort=desc`, {
          signal: abortControllerRef.current.signal,
          headers,
        });

        // Handle 304 Not Modified
        if (response.status === 304 && paginatedCache.pages[cacheKey]) {
          setPuzzles(paginatedCache.pages[cacheKey]);
          setTotalCount(paginatedCache.totalCount);
          setHasMore(page * PAGE_SIZE < paginatedCache.totalCount);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch puzzles');
        }

        data = await response.json();
      }

      if (data.success) {
        // Store ETag for caching
        const etag =
          Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
            ? response.headers?.ETag || response.headers?.etag
            : response.headers.get('ETag');
        if (etag) {
          paginatedCache.etag = etag;
        }

        // Get game history for status
        const gameHistory = getGameHistory();

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
            theme: puzzle.theme, // Keep the original theme from API
          };
        });

        // Update state
        if (append) {
          setPuzzles((prev) => [...prev, ...processedPuzzles]);
        } else {
          setPuzzles(processedPuzzles);
          paginatedCache.pages[cacheKey] = processedPuzzles;
          paginatedCache.lastFetch[cacheKey] = now;
        }

        setHasMore(data.pagination.hasMore);
        setTotalCount(data.pagination.total);
        paginatedCache.totalCount = data.pagination.total;

        // Check access permissions in background
        checkAccessPermissions(processedPuzzles, append);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading puzzles:', error);
        setError('Failed to load puzzles. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
      isInitialLoad.current = false;
    }
  }, []);

  // Check access permissions for puzzles
  const checkAccessPermissions = useCallback(
    async (puzzlesToCheck, append = false) => {
      if (!Capacitor.isNativePlatform()) {
        // All puzzles are accessible on web
        const accessMap = {};
        puzzlesToCheck.forEach((puzzle) => {
          accessMap[puzzle.date] = false; // false means accessible (not locked)
        });
        if (append) {
          setPuzzleAccessMap((prev) => ({ ...prev, ...accessMap }));
        } else {
          setPuzzleAccessMap(accessMap);
        }
        return;
      }

      // Check permissions in batches for better performance
      const batchSize = 10;
      const accessMap = append ? { ...puzzleAccessMap } : {};

      for (let i = 0; i < puzzlesToCheck.length; i += batchSize) {
        const batch = puzzlesToCheck.slice(i, i + batchSize);
        const batchPromises = batch.map(async (puzzle) => {
          // Use cached value if available
          if (paginatedCache.puzzleAccessMap[puzzle.date] !== undefined) {
            return {
              date: puzzle.date,
              hasAccess: paginatedCache.puzzleAccessMap[puzzle.date],
            };
          }

          const hasAccess = await subscriptionService.canAccessPuzzle(puzzle.date);
          return {
            date: puzzle.date,
            hasAccess,
          };
        });

        const results = await Promise.all(batchPromises);

        results.forEach(({ date, hasAccess }) => {
          accessMap[date] = !hasAccess; // Invert for lock display
          paginatedCache.puzzleAccessMap[date] = hasAccess;
        });

        // Update state after each batch
        if (append) {
          setPuzzleAccessMap((prev) => ({ ...prev, ...accessMap }));
        } else {
          setPuzzleAccessMap({ ...accessMap });
        }
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
          const nextPage = currentPage + 1;
          setCurrentPage(nextPage);
          loadPuzzles(nextPage, true);
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
  }, [isOpen, hasMore, currentPage, loadPuzzles, isLoadingMore]);

  // Handle puzzle selection
  const handlePuzzleClick = useCallback(
    async (puzzle) => {
      // Only show paywall if explicitly locked (true), not if undefined
      const isLocked = puzzleAccessMap[puzzle.date] === true;

      if (isLocked) {
        setShowPaywall(true);
      } else {
        // Fetch full puzzle details if needed
        if (!puzzle.puzzles && puzzle.hasData !== false) {
          try {
            let response;
            let data;

            // Use CapacitorHttp on iOS to bypass CORS
            if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
              const baseUrl = window.location.origin;
              response = await CapacitorHttp.post({
                url: `${baseUrl}/api/puzzles/paginated`,
                headers: { 'Content-Type': 'application/json' },
                data: { date: puzzle.date },
              });
              data = response.data;
            } else {
              response = await fetch('/api/puzzles/paginated', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: puzzle.date }),
              });
              data = await response.json();
            }

            if (data.success) {
              onSelectPuzzle(puzzle.date);
            }
          } catch (error) {
            console.error('Error fetching puzzle details:', error);
            setError('Failed to load puzzle. Please try again.');
          }
        } else {
          onSelectPuzzle(puzzle.date);
        }
      }
    },
    [puzzleAccessMap, onSelectPuzzle]
  );

  // Handle purchase complete
  const handlePurchaseComplete = async () => {
    // Clear cache and reload
    paginatedCache.puzzleAccessMap = {};
    await checkAccessPermissions(puzzles);
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

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (isInitialLoad.current) {
        setCurrentPage(1);
        setPuzzles([]);
        setPuzzleAccessMap({}); // Reset access map
        loadPuzzles(1);
      } else {
        // Reset loading state when reopening
        loadingRef.current = false;
      }
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, loadPuzzles]);

  // Refresh data if modal is reopened
  useEffect(() => {
    if (isOpen && !isInitialLoad.current) {
      // Refresh game history for current puzzles
      const gameHistory = getGameHistory();
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

      // Don't re-check permissions on reopen - use cached values
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col ${
          highContrast ? 'bg-hc-background border-4 border-hc-border' : 'bg-white dark:bg-gray-800'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Puzzle Archive</h2>
            {totalCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {totalCount} puzzles available
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2"
            aria-label="Close"
          >
            ✕
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
              const nextPage = currentPage + 1;
              setCurrentPage(nextPage);
              loadPuzzles(nextPage, true);
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
                  key={puzzle.date}
                  puzzle={puzzle}
                  isLocked={puzzleAccessMap[puzzle.date]}
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
