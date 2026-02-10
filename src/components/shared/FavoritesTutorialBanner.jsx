'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * FavoritesTutorialBanner Component
 *
 * A slide-down banner that teaches users about the favorites feature.
 * Appears 30 seconds after gameplay starts OR 30 seconds after the hint
 * tutorial banner is dismissed.
 *
 * @param {string} gameType - 'soup' to determine styling and localStorage key
 * @param {boolean} isPlaying - Whether the game is currently being played
 */
export default function FavoritesTutorialBanner({ gameType = 'soup', isPlaying = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(true); // Default to touch for SSR
  const { reduceMotion, highContrast } = useTheme();
  const { lightTap } = useHaptics();
  const timerRef = useRef(null);
  const hasStartedRef = useRef(false);

  const favoritesTutorialKey = `${gameType}FavoritesTutorialDismissed`;
  const hintTutorialKey = `${gameType}HintTutorialDismissed`;

  // Detect touch device for appropriate help text
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Show banner after delay
  const showBannerAfterDelay = (delay = 30000) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setShouldRender(true);
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // Check conditions and show banner
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Don't show if not playing
    if (!isPlaying) return;

    // Don't show if already dismissed
    const isFavoritesTutorialDismissed = localStorage.getItem(favoritesTutorialKey);
    if (isFavoritesTutorialDismissed === 'true') {
      return;
    }

    // Check if hint tutorial is already dismissed
    const isHintTutorialDismissed = localStorage.getItem(hintTutorialKey);

    if (isHintTutorialDismissed === 'true') {
      // Hint tutorial already dismissed, start 30s timer from gameplay start
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        showBannerAfterDelay(30000);
      }
    } else {
      // Listen for the hint tutorial being dismissed via localStorage change
      const checkHintDismissed = () => {
        const dismissed = localStorage.getItem(hintTutorialKey);
        if (dismissed === 'true' && !hasStartedRef.current) {
          hasStartedRef.current = true;
          showBannerAfterDelay(30000);
        }
      };

      // Check periodically if hint tutorial was dismissed
      const interval = setInterval(checkHintDismissed, 1000);

      // Also start a fallback timer - 30s from gameplay if hint tutorial never shows
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        showBannerAfterDelay(30000);
      }

      return () => {
        clearInterval(interval);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, favoritesTutorialKey, hintTutorialKey]);

  // Reset when game stops
  useEffect(() => {
    if (!isPlaying) {
      hasStartedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isPlaying]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    lightTap();
    setIsVisible(false);
    localStorage.setItem(favoritesTutorialKey, 'true');
  };

  const handleClick = () => {
    lightTap();
    setIsVisible(false);
    localStorage.setItem(favoritesTutorialKey, 'true');
  };

  // Animation variants
  const variants = {
    hidden: {
      y: -100,
      opacity: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: reduceMotion ? 0 : 0.4,
        ease: [0.34, 1.56, 0.64, 1], // iOS spring curve
      },
    },
  };

  const isSoup = gameType === 'soup';

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`
            fixed left-0 right-0 z-[100] flex justify-center
            ${isSoup ? 'top-[calc(env(safe-area-inset-top,0px)+68px)]' : 'top-[calc(env(safe-area-inset-top,0px)+68px)]'}
          `}
          role="banner"
          aria-label="Favorites tutorial prompt"
        >
          <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            className={`
              flex items-center gap-2.5 px-4 py-2.5
              rounded-full shadow-lg backdrop-blur-sm
              border-2 cursor-pointer
              transition-transform active:scale-[0.98]
              ${
                highContrast
                  ? 'bg-hc-surface border-hc-border'
                  : isSoup
                    ? 'bg-white/95 dark:bg-gray-800/95 border-sky-500 dark:border-sky-400'
                    : 'bg-white/95 dark:bg-gray-800/95 border-sky-500 dark:border-sky-400'
              }
            `}
            style={{
              boxShadow: highContrast
                ? '0 4px 12px rgba(0,0,0,0.3)'
                : '0 4px 16px rgba(14, 165, 233, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Text */}
            <span
              className={`
                text-sm font-semibold whitespace-nowrap flex items-center gap-1
                ${highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-100'}
              `}
            >
              {isTouchDevice ? 'Long press any element to add to' : 'Drag any element to'}{' '}
              <Image
                src="/ui/shared/favorites.png"
                alt="favorites"
                width={20}
                height={20}
                className="inline-block w-5 h-5"
              />
            </span>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className={`
                ml-1 -mr-1 w-6 h-6 flex items-center justify-center
                rounded-full transition-colors
                ${
                  highContrast
                    ? 'hover:bg-hc-border/30 text-hc-text'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                }
              `}
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
