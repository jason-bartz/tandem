'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import { cn } from '@/lib/utils';
import { isStandaloneAlchemy } from '@/lib/standalone';

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
          'border-[3px] border-black dark:border-gray-600',
          'rounded-xl',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          'my-auto',
          highContrast && 'border-[4px] border-hc-border'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            'hover:bg-black/10 dark:hover:bg-white/10',
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
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'bg-white dark:bg-gray-800',
                'border-[2px] border-black dark:border-gray-600',
                'rounded-lg',
                'shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              )}
            >
              <span className="text-lg">{discovery.elementAEmoji}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {discovery.elementA}
              </span>
            </div>
            <span className="text-gray-400 font-bold">+</span>
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'bg-white dark:bg-gray-800',
                'border-[2px] border-black dark:border-gray-600',
                'rounded-lg',
                'shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              )}
            >
              <span className="text-lg">{discovery.elementBEmoji}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {discovery.elementB}
              </span>
            </div>
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
        'bg-white dark:bg-gray-800',
        'border-[2px] border-black dark:border-gray-600',
        'rounded-xl',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]',
        'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]',
        'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        'transition-all duration-150',
        highContrast && 'border-[3px] border-hc-border'
      )}
    >
      <span className="text-2xl mb-1">{discovery.resultEmoji}</span>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center line-clamp-2">
        {discovery.resultElement}
      </span>
    </div>
  );
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

  const fetchDiscoveries = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/daily-alchemy/discoveries?limit=200', {
        credentials: 'include',
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch discoveries');
      }

      const data = await response.json();
      setDiscoveries(data.discoveries || []);
      setTotalCount(data.pagination?.total ?? (data.discoveries || []).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isOpen && session) {
      fetchDiscoveries();
    }
  }, [isOpen, session, fetchDiscoveries]);

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="First Discoveries"
      maxWidth="550px"
      headerClassName="border-b-0"
      contentClassName="p-0 relative"
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
            <Image src="/icons/ui/daily-alchemy.png" alt="" width={20} height={20} />
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
              src="/icons/ui/discovery.png"
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
              onClick={fetchDiscoveries}
              className="mt-4 px-4 py-2 text-sm font-medium text-soup-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="text-center py-12">
            <Image
              src="/icons/ui/discovery.png"
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {discoveries.map((discovery) => (
                <DiscoveryCard
                  key={discovery.id}
                  discovery={discovery}
                  onClick={() => setSelectedDiscovery(discovery)}
                />
              ))}
            </div>
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
