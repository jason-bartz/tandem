'use client';
import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * HintDisplay Component
 *
 * Displays contextual hints below the focused answer field
 * Following Apple HIG with:
 * - Smooth animations (0.3s standard)
 * - System yellow color for hints
 * - SF Symbol lightbulb icon
 * - Proper spacing (8pt grid)
 * - Accessibility support
 */
export default function HintDisplay({
  hint,
  isVisible,
  answerIndex,
  onDismiss,
  isSmallPhone = false,
  isMobilePhone = false
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { selectionStart } = useHaptics();
  const [hasAnnounced, setHasAnnounced] = useState(false);
  const announceRef = useRef(null);

  // Announce hint to screen readers when it appears
  useEffect(() => {
    if (isVisible && hint && !hasAnnounced) {
      // Small haptic feedback when hint appears
      selectionStart();

      // Announce to VoiceOver
      if (announceRef.current) {
        announceRef.current.textContent = `Hint for answer ${answerIndex + 1}: ${hint}`;
      }
      setHasAnnounced(true);
    } else if (!isVisible) {
      setHasAnnounced(false);
    }
  }, [isVisible, hint, answerIndex, hasAnnounced, selectionStart]);

  // Animation variants
  const variants = {
    hidden: {
      opacity: 0,
      y: -10,
      height: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: 'easeInOut'
      }
    },
    visible: {
      opacity: 1,
      y: 0,
      height: 'auto',
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <>
      {/* Hidden announcer for screen readers */}
      <div
        ref={announceRef}
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      <AnimatePresence>
        {isVisible && hint && (
          <motion.div
            key={`hint-${answerIndex}`}
            variants={variants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={`
              ${isSmallPhone ? 'mt-1' : isMobilePhone ? 'mt-1.5' : 'mt-2'}
              ${isSmallPhone ? 'mx-2' : isMobilePhone ? 'mx-2.5' : 'mx-3'}
              overflow-hidden
            `}
          >
            <div
              className={`
                flex items-center gap-2
                ${isSmallPhone ? 'px-2.5 py-1.5' : isMobilePhone ? 'px-3 py-2' : 'px-3.5 py-2.5'}
                rounded-lg
                ${highContrast
                  ? 'bg-hc-warning/20 border-2 border-hc-warning'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600'
                }
                shadow-sm
              `}
            >
              {/* Lightbulb Icon */}
              <span
                className={`
                  ${isSmallPhone ? 'text-base' : isMobilePhone ? 'text-lg' : 'text-xl'}
                  flex-shrink-0
                `}
                role="img"
                aria-label="Hint"
              >
                💡
              </span>

              {/* Hint Text */}
              <p
                className={`
                  ${isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm sm:text-base'}
                  ${highContrast
                    ? 'text-hc-text font-medium'
                    : 'text-gray-700 dark:text-gray-200'
                  }
                  flex-1 leading-snug
                `}
              >
                {hint}
              </p>

              {/* Optional Dismiss Button (for accessibility) */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className={`
                    ${isSmallPhone ? 'p-1' : 'p-1.5'}
                    rounded-md
                    ${highContrast
                      ? 'hover:bg-hc-surface focus:bg-hc-surface'
                      : 'hover:bg-yellow-100 dark:hover:bg-yellow-800/30 focus:bg-yellow-100 dark:focus:bg-yellow-800/30'
                    }
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-500
                  `}
                  aria-label="Dismiss hint"
                >
                  <svg
                    className={`
                      ${isSmallPhone ? 'w-3 h-3' : 'w-4 h-4'}
                      ${highContrast ? 'text-hc-text' : 'text-gray-500 dark:text-gray-400'}
                    `}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Subtle connection line to answer field */}
            <div
              className={`
                mx-auto
                ${isSmallPhone ? 'w-0.5 h-1' : 'w-0.5 h-1.5'}
                ${highContrast
                  ? 'bg-hc-warning'
                  : 'bg-yellow-300 dark:bg-yellow-600'
                }
                opacity-30
                -mt-px
              `}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}