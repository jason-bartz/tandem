'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import { X, Search, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import { cn } from '@/lib/utils';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * IngredientChip - Displays an ingredient with emoji and auto-scrolling name for overflow
 */
function IngredientChip({ emoji, name }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current && textRef.current) {
        const diff = textRef.current.scrollWidth - containerRef.current.clientWidth;
        setOverflow(diff > 2 ? diff + 4 : 0);
      }
    };
    measure();
    const timer = setTimeout(measure, 150);
    return () => clearTimeout(timer);
  }, [name]);

  // 1s pause at start, scroll at 40px/s, 0.8s pause at end, 0.3s snap back
  const pauseStart = 1;
  const scrollTime = overflow > 0 ? overflow / 40 : 0;
  const pauseEnd = 0.8;
  const returnTime = 0.3;
  const totalDuration = pauseStart + scrollTime + pauseEnd + returnTime;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5',
        'bg-bg-card dark:bg-gray-800',
        'dark:border-gray-600',
        'rounded-lg',
        '',
        'flex-1 min-w-0'
      )}
    >
      <span className="text-lg flex-shrink-0">{emoji}</span>
      <div ref={containerRef} className="overflow-hidden flex-1 min-w-0">
        <motion.span
          ref={textRef}
          className="inline-block whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
          animate={overflow > 0 ? { x: [0, 0, -overflow, -overflow, 0] } : {}}
          transition={
            overflow > 0
              ? {
                  duration: totalDuration,
                  times: [
                    0,
                    pauseStart / totalDuration,
                    (pauseStart + scrollTime) / totalDuration,
                    (pauseStart + scrollTime + pauseEnd) / totalDuration,
                    1,
                  ],
                  repeat: Infinity,
                  ease: 'linear',
                }
              : undefined
          }
        >
          {name}
        </motion.span>
      </div>
    </div>
  );
}

/**
 * FirstDiscoveryDetail - Popup showing details of a selected discovery
 */
function FirstDiscoveryDetail({ discovery, onClose }) {
  const { highContrast } = useTheme();

  if (!discovery) return null;

  const formattedDate = new Date(discovery.discoveredAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, pointerEvents: 'auto' }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          'relative w-full max-w-xs p-5',
          'bg-gradient-to-br from-yellow-50 to-orange-50',
          'dark:from-yellow-900/40 dark:to-orange-900/40',
          'dark:border-gray-600',
          'rounded-xl',
          '',
          'my-auto',
          highContrast && 'border-2 border-hc-border'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-black/10 dark:hover:bg-bg-card/10',
            'transition-colors'
          )}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Result element */}
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">{discovery.resultEmoji}</div>
          <h3
            className={cn(
              'font-bold text-gray-900 dark:text-white',
              discovery.resultElement.length > 40
                ? 'text-sm'
                : discovery.resultElement.length > 25
                  ? 'text-base'
                  : 'text-xl'
            )}
          >
            {discovery.resultElement}
          </h3>
        </div>

        {/* Combining elements */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">
            Created from
          </p>
          <div className="flex items-center justify-center gap-2">
            <IngredientChip emoji={discovery.elementAEmoji} name={discovery.elementA} />
            <span className="text-gray-400 font-bold flex-shrink-0">+</span>
            <IngredientChip emoji={discovery.elementBEmoji} name={discovery.elementB} />
          </div>
        </div>

        {/* Discovery date */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Discovered {formattedDate}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * DiscoveryCard - Grid item for a single discovery
 * Uses touch tracking to distinguish taps from scrolls
 */
function DiscoveryCard({ discovery, onClick }) {
  const { highContrast } = useTheme();
  const touchStartRef = useRef(null);
  const didScrollRef = useRef(false);
  const touchHandledRef = useRef(false);

  // Track touch start position
  const handleTouchStart = useCallback((e) => {
    // Stop propagation to prevent panel's swipe-to-dismiss from interfering
    e.stopPropagation();
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    didScrollRef.current = false;
    touchHandledRef.current = false;
  }, []);

  // Detect if finger moved (scrolling)
  const handleTouchMove = useCallback((e) => {
    e.stopPropagation();
    if (!touchStartRef.current) return;

    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    // If moved more than 15px in any direction, it's a scroll (increased from 10px for better tap detection)
    if (deltaX > 15 || deltaY > 15) {
      didScrollRef.current = true;
    }
  }, []);

  // Only trigger click if it was a tap (no scroll movement)
  const handleTouchEnd = useCallback(
    (e) => {
      e.stopPropagation();
      if (!didScrollRef.current && touchStartRef.current) {
        touchHandledRef.current = true;
        onClick();
      }
      touchStartRef.current = null;
      didScrollRef.current = false;
    },
    [onClick]
  );

  // Handle keyboard/mouse clicks normally, but skip if touch already handled
  const handleClick = useCallback(
    (e) => {
      // Prevent synthetic click after touch events
      if (touchHandledRef.current) {
        touchHandledRef.current = false;
        e.preventDefault();
        return;
      }
      // Reset touch ref on every click to prevent stale state issues on touch-enabled desktops
      touchHandledRef.current = false;
      onClick();
    },
    [onClick]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'flex flex-col items-center justify-center p-3 cursor-pointer select-none',
        'bg-bg-card dark:bg-gray-800',
        'dark:border-gray-600',
        'rounded-xl',
        'dark:',
        ' hover:',
        '',
        'transition-all duration-150',
        highContrast && 'border-2 border-hc-border'
      )}
    >
      <span className="text-2xl mb-1">{discovery.resultEmoji}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center line-clamp-2">
        {discovery.resultElement}
      </span>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Date Discovered' },
  { value: 'alpha', label: 'A–Z' },
  { value: 'random', label: 'Random' },
];

/**
 * Deterministic shuffle using a seed so it stays stable within a session
 */
function seededShuffle(arr, seed) {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * FirstDiscoveriesModal - Modal showing all user's first discoveries
 */
export default function FirstDiscoveriesModal({ isOpen, onClose }) {
  const { highContrast } = useTheme();
  const { session } = useAuth();
  const [discoveries, setDiscoveries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [randomSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const scrollRef = useRef(null);

  const fetchAllDiscoveries = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const allDiscoveries = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await fetch(`/api/daily-alchemy/discoveries?page=${page}&limit=1000`, {
          credentials: 'include',
          headers: {
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
        });

        if (!response.ok) throw new Error('Failed to fetch discoveries');

        const data = await response.json();
        allDiscoveries.push(...(data.discoveries || []));
        totalPages = data.pagination?.totalPages ?? 1;
        setTotalCount(data.pagination?.total ?? allDiscoveries.length);
        page++;
      }

      setDiscoveries(allDiscoveries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isOpen && session) {
      fetchAllDiscoveries();
    }
  }, [isOpen, session, fetchAllDiscoveries]);

  // Reset visible count when search/sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortBy]);

  const filteredAndSorted = useMemo(() => {
    let result = discoveries;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((d) => d.resultElement.toLowerCase().includes(q));
    }

    // Sort
    switch (sortBy) {
      case 'alpha':
        result = [...result].sort((a, b) => a.resultElement.localeCompare(b.resultElement));
        break;
      case 'random':
        result = seededShuffle(result, randomSeed);
        break;
      case 'date':
      default:
        // Already sorted by date from API (newest first)
        break;
    }

    return result;
  }, [discoveries, searchQuery, sortBy, randomSeed]);

  const visibleDiscoveries = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
    }
  }, [hasMore]);

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="First Discoveries"
      maxWidth="550px"
      headerClassName="border-b-0"
      contentClassName="p-0 relative"
      scrollRef={scrollRef}
      onScroll={handleScroll}
    >
      {/* Game name header with icon - hidden on standalone */}
      {!isStandaloneAlchemy && (
        <div
          className={cn(
            'px-6 py-3 border-b-[3px] border-gray-200 dark:border-gray-700',
            highContrast ? 'bg-hc-success/20' : 'bg-green-500/30 dark:bg-green-500/30'
          )}
        >
          <div className="flex items-center gap-2">
            <Image src="/ui/games/daily-alchemy.png" alt="" width={20} height={20} />
            <p
              className={cn(
                'text-sm font-semibold',
                highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-200'
              )}
            >
              Daily Alchemy
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!session ? (
          <div className="text-center py-12">
            <Image
              src="/ui/stats/discovery.png"
              alt=""
              width={48}
              height={48}
              className="mx-auto mb-4 opacity-50"
            />
            <p className="text-gray-500 dark:text-gray-400">
              Sign in to track your first discoveries
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-soup-primary rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading discoveries...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 dark:text-red-400">{error}</p>
            <button
              onClick={fetchAllDiscoveries}
              className="mt-4 px-4 py-2 text-sm font-medium text-soup-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="text-center py-12">
            <Image
              src="/ui/stats/discovery.png"
              alt=""
              width={48}
              height={48}
              className="mx-auto mb-4 opacity-50"
            />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No first discoveries yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Be the first to discover a new element combination!
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              You discovered {totalCount} element{totalCount !== 1 ? 's' : ''} before anyone else
            </p>

            {/* Search and sort controls */}
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    'w-full pl-8 pr-3 py-2 text-sm rounded-xl',
                    'bg-bg-card dark:bg-gray-800',
                    'border-2 border-gray-200 dark:border-gray-600',
                    'text-gray-900 dark:text-white',
                    'placeholder:text-gray-400',
                    'focus:outline-none focus:border-soup-primary',
                    'transition-colors',
                    highContrast && 'border-hc-border'
                  )}
                />
              </div>
              <div className="relative">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={cn(
                    'appearance-none pl-8 pr-8 py-2 text-sm rounded-xl cursor-pointer',
                    'bg-bg-card dark:bg-gray-800',
                    'border-2 border-gray-200 dark:border-gray-600',
                    'text-gray-900 dark:text-white',
                    'focus:outline-none focus:border-soup-primary',
                    'transition-colors',
                    highContrast && 'border-hc-border'
                  )}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredAndSorted.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No elements matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              <>
                {searchQuery && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                    {filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {visibleDiscoveries.map((discovery) => (
                    <DiscoveryCard
                      key={discovery.id}
                      discovery={discovery}
                      onClick={() => setSelectedDiscovery(discovery)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Showing {visibleCount} of {filteredAndSorted.length} — scroll for more
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Detail popup overlay */}
      <AnimatePresence>
        {selectedDiscovery && (
          <FirstDiscoveryDetail
            discovery={selectedDiscovery}
            onClose={() => setSelectedDiscovery(null)}
          />
        )}
      </AnimatePresence>
    </LeftSidePanel>
  );
}
