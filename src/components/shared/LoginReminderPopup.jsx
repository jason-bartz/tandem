'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

const STORAGE_KEY = 'loginReminderDismissedAt';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * LoginReminderPopup Component
 *
 * A slide-down popup that reminds non-logged-in users to create an account
 * after completing a puzzle. Appears briefly after the complete screen loads.
 * If dismissed, won't show again for one week.
 *
 * @param {boolean} isVisible - Whether to show the popup
 * @param {function} onSignUp - Callback when user clicks to sign up
 * @param {function} onDismiss - Callback when user dismisses the popup
 * @param {string} gameType - 'tandem', 'mini', 'soup', or 'reel' to determine styling
 */
export default function LoginReminderPopup({
  isVisible,
  onSignUp,
  onDismiss,
  gameType = 'tandem',
}) {
  const [shouldRender, setShouldRender] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isDismissedRecently, setIsDismissedRecently] = useState(true); // Start true to prevent flash
  const { reduceMotion, highContrast } = useTheme();
  const { lightTap } = useHaptics();

  // Check if popup was dismissed within the last week
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < ONE_WEEK_MS) {
        setIsDismissedRecently(true);
        return;
      }
    }
    setIsDismissedRecently(false);
  }, []);

  // Delay showing the popup slightly for a nicer entrance
  useEffect(() => {
    if (isVisible && !isDismissedRecently) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setShowPopup(true);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setShowPopup(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isDismissedRecently]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    lightTap();
    // Store dismissal timestamp
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    setShowPopup(false);
    onDismiss?.();
  };

  const handleClick = () => {
    lightTap();
    setShowPopup(false);
    onSignUp?.();
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

  // Styling based on game type
  const isReel = gameType === 'reel';
  const isMini = gameType === 'mini';
  const isSoup = gameType === 'soup';

  if (!shouldRender) return null;

  return (
    <AnimatePresence>
      {showPopup && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed left-0 right-0 z-[100] flex justify-center top-[calc(env(safe-area-inset-top,0px)+12px)] px-4"
          role="banner"
          aria-label="Sign up reminder"
        >
          <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            className={`
              flex items-center gap-2 px-4 py-2.5
              rounded-full shadow-lg backdrop-blur-sm
              border-2 cursor-pointer
              transition-all active:scale-[0.98]
              hover:scale-[1.02]
              ${
                highContrast
                  ? 'bg-hc-surface border-hc-border hover:bg-hc-primary/10'
                  : isReel
                    ? 'bg-[#1a1a2e]/95 border-[#ffce00] hover:bg-[#1a1a2e] hover:border-[#ffe44d]'
                    : isMini
                      ? 'bg-white/95 dark:bg-gray-800/95 border-amber-400 dark:border-amber-500 hover:bg-white hover:border-amber-500 dark:hover:bg-gray-800 dark:hover:border-amber-400'
                      : isSoup
                        ? 'bg-white/95 dark:bg-gray-800/95 border-green-500 dark:border-green-400 hover:bg-white hover:border-green-600 dark:hover:bg-gray-800 dark:hover:border-green-300'
                        : 'bg-white/95 dark:bg-gray-800/95 border-blue-400 dark:border-blue-500 hover:bg-white hover:border-blue-500 dark:hover:bg-gray-800 dark:hover:border-blue-400'
              }
            `}
            style={{
              boxShadow: highContrast
                ? '0 4px 12px rgba(0,0,0,0.3)'
                : isReel
                  ? '0 4px 16px rgba(255, 206, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3)'
                  : isMini
                    ? '0 4px 16px rgba(245, 158, 11, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : isSoup
                      ? '0 4px 16px rgba(34, 197, 94, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
                      : '0 4px 16px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Text - single line, underlined to indicate clickability */}
            <span
              className={`
                text-sm font-semibold whitespace-nowrap underline decoration-1 underline-offset-2
                ${
                  highContrast
                    ? 'text-hc-text decoration-hc-text/50'
                    : isReel
                      ? 'text-white decoration-white/50'
                      : 'text-gray-800 dark:text-gray-100 decoration-gray-400 dark:decoration-gray-500'
                }
              `}
            >
              Sign up for free and join the leaderboard!
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
                    : isReel
                      ? 'hover:bg-white/10 text-white/70'
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
