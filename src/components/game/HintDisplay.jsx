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
  isMobilePhone = false,
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
        ease: 'easeInOut',
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      height: 'auto',
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: 'easeInOut',
      },
    },
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
              ${isSmallPhone ? 'mt-2' : isMobilePhone ? 'mt-2' : 'mt-2'}
            `}
          >
            <div
              className={`
                flex items-start gap-2
                ${isSmallPhone ? 'px-3 py-2' : isMobilePhone ? 'px-3 py-2' : 'px-4 py-3'}
                rounded-2xl
                border-[3px]
                ${
                  highContrast
                    ? 'bg-hc-warning border-hc-warning shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                    : 'bg-accent-yellow dark:bg-yellow-600 border-accent-yellow dark:border-yellow-700 shadow-[3px_3px_0px_rgba(0,0,0,0.3)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.3)]'
                }
              `}
            >
              {/* Hint Text */}
              <p
                className={`
                  ${isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm sm:text-base'}
                  ${
                    highContrast
                      ? 'text-hc-text font-bold'
                      : 'text-gray-900 dark:text-gray-100 font-semibold'
                  }
                  flex-1 leading-relaxed
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
                    rounded-lg
                    ${
                      highContrast
                        ? 'hover:bg-hc-surface focus:bg-hc-surface'
                        : 'hover:bg-yellow-500 dark:hover:bg-yellow-700 focus:bg-yellow-500 dark:focus:bg-yellow-700'
                    }
                    transition-colors
                    focus:outline-none focus:ring-2 focus:ring-yellow-800
                  `}
                  aria-label="Dismiss hint"
                >
                  <svg
                    className={`
                      ${isSmallPhone ? 'w-3 h-3' : 'w-4 h-4'}
                      ${highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'}
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
