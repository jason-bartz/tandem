'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * HintEarnedToast Component
 *
 * Displays a toast notification when a player earns a hint
 * Following Apple HIG with:
 * - System yellow color for hints
 * - Standard iOS timing (300ms animations)
 * - Backdrop blur for modern iOS glass effect
 * - Proper accessibility support
 * - High contrast mode support
 * - Reduce motion support
 */
export default function HintEarnedToast({ isSmallPhone = false, isMobilePhone = false }) {
  const [visible, setVisible] = useState(false);
  const { highContrast, reduceMotion } = useTheme();
  const { lightTap } = useHaptics();

  useEffect(() => {
    // Listen for hint earned events
    const handleHintEarned = () => {
      // Haptic feedback
      lightTap();

      // Show toast
      setVisible(true);

      // Auto-hide after 2.5 seconds (Apple recommended duration)
      setTimeout(() => {
        setVisible(false);
      }, 2500);
    };

    window.addEventListener('hintEarned', handleHintEarned);

    return () => {
      window.removeEventListener('hintEarned', handleHintEarned);
    };
  }, [lightTap]);

  // Animation variants
  const variants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.4, 0.0, 0.2, 1], // iOS ease-out curve
      },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.4, 0.0, 0.2, 1],
      },
    },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`
            fixed left-1/2 -translate-x-1/2 z-[9998]
            ${isSmallPhone ? 'top-16' : isMobilePhone ? 'top-20' : 'top-24'}
          `}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`
              ${isSmallPhone ? 'px-4 py-2.5' : isMobilePhone ? 'px-5 py-3' : 'px-6 py-3'}
              rounded-2xl shadow-2xl backdrop-blur-sm
              flex items-center gap-3
              ${isSmallPhone ? 'max-w-[280px]' : isMobilePhone ? 'max-w-xs' : 'max-w-sm'}
              ${
                highContrast
                  ? 'bg-hc-warning text-white border-2 border-hc-border'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 dark:from-yellow-500 dark:to-amber-600 text-gray-900 dark:text-gray-900'
              }
            `}
          >
            {/* Lightbulb icon with subtle pulse */}
            <motion.span
              className={isSmallPhone ? 'text-xl' : isMobilePhone ? 'text-2xl' : 'text-2xl'}
              animate={reduceMotion ? {} : { scale: [1, 1.1, 1] }}
              transition={{
                duration: 0.6,
                times: [0, 0.5, 1],
                ease: 'easeInOut',
              }}
            >
              💡
            </motion.span>

            {/* Text content */}
            <div className="flex-1">
              <div
                className={`
                  font-bold
                  ${isSmallPhone ? 'text-xs' : isMobilePhone ? 'text-sm' : 'text-sm'}
                `}
              >
                Hint Earned!
              </div>
              <div
                className={`
                  opacity-90
                  ${isSmallPhone ? 'text-[10px]' : isMobilePhone ? 'text-xs' : 'text-xs'}
                `}
              >
                You unlocked an extra hint
              </div>
            </div>

            {/* Sparkle icon */}
            <motion.span
              className={isSmallPhone ? 'text-lg' : isMobilePhone ? 'text-xl' : 'text-2xl'}
              animate={
                reduceMotion
                  ? {}
                  : {
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.15, 1],
                    }
              }
              transition={{
                duration: 0.8,
                times: [0, 0.33, 0.66, 1],
                ease: 'easeInOut',
              }}
            >
              ✨
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
