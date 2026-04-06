'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { playButtonTone } from '@/lib/sounds';
import { ASSET_VERSION } from '@/lib/constants';

/**
 * GameCard - Clickable card for game selection on the home page
 *
 * Features:
 * - Entire card is clickable
 * - Compact layout with icon, title, description, and puzzle number
 * - Neo-brutalist design with shadow
 * - High contrast and dark mode support
 * - Respects reduced motion preferences
 * - 44pt minimum touch target (Apple HIG)
 */
export default function GameCard({
  icon,
  title,
  description,
  puzzleNumber,
  creator,
  onClick,
  loading = false,
  completed = false,
  completedMessage = 'Completed!',
  animationDelay = 0,
  showNewBadge = false,
  unavailable = false,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { lightTap } = useHaptics();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    if (loading || isNavigating) return;

    try {
      playButtonTone();
      lightTap();
    } catch (e) {
      // Sound might fail on some browsers
    }

    setIsNavigating(true);
    onClick?.();
  };

  const isDisabled = loading || isNavigating;

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : animationDelay,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  const tapVariants = {
    tap: reduceMotion
      ? {}
      : {
          scale: 0.98,
        },
  };

  const wiggleVariants = {
    animate: reduceMotion
      ? {}
      : {
          rotate: [0, -6, 6, -6, 6, 0],
          transition: {
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 3,
            ease: 'easeInOut',
          },
        },
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isDisabled}
      className={`relative w-full text-left rounded-lg overflow-hidden p-5 cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all duration-200 hover:scale-[1.02] ${
        highContrast
          ? 'bg-hc-surface border-hc-border focus-visible:ring-hc-focus'
          : 'bg-ghost-white dark:bg-bg-card border-border-main dark:focus-visible:ring-accent-blue'
      }`}
      variants={{ ...cardVariants, ...tapVariants }}
      initial="initial"
      animate="animate"
      whileTap="tap"
      aria-label={`Play ${title}${completed ? ' - Completed' : ''}${showNewBadge ? ' - New' : ''}`}
    >
      {/* Loading overlay when navigating */}
      {isNavigating && (
        <div className={`absolute inset-0 z-20 flex items-center justify-center rounded-lg ${
          highContrast ? 'bg-hc-surface/60' : 'bg-ghost-white/60 dark:bg-bg-card/60'
        }`}>
          <div className={`w-5 h-5 border-2 rounded-full animate-spin ${
            highContrast ? 'border-hc-border border-t-hc-text' : 'border-gray-400 border-t-gray-900 dark:border-gray-500 dark:border-t-white'
          }`} />
        </div>
      )}

      {/* Completed Badge */}
      {completed && !showNewBadge && (
        <motion.span
          className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full z-10 ${
            highContrast ? 'bg-hc-text text-hc-background' : 'bg-green-500 text-white'
          }`}
          initial={reduceMotion ? false : { scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: animationDelay + 0.2 }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.span>
      )}
      {/* New Badge */}
      {showNewBadge && (
        <motion.span
          className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full z-10 ${
            highContrast ? 'bg-hc-text text-hc-background' : 'bg-accent-blue text-white'
          }`}
          variants={wiggleVariants}
          animate="animate"
        >
          new!
        </motion.span>
      )}
      <div className="flex items-center gap-4">
        {/* Icon - always show immediately (preloaded in head) */}
        <div className="w-[52px] h-[52px] flex-shrink-0 relative">
          <Image
            src={`${icon}?v=${ASSET_VERSION}`}
            alt=""
            width={52}
            height={52}
            className="rounded-xl"
            priority
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`text-xl font-bold mb-1 ${
              highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {title}
          </h3>

          {/* Description */}
          <p
            className={`text-sm leading-snug mb-2 ${
              highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {description}
          </p>

          {/* Puzzle Number and Creator Attribution */}
          <div
            className={`text-sm font-medium ${
              highContrast ? 'text-hc-text' : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            {unavailable ? (
              <span className={highContrast ? 'text-hc-warning-text' : 'text-amber-600 dark:text-amber-400'}>Will be ready shortly!</span>
            ) : completed ? (
              <span className={highContrast ? 'text-hc-success-text' : 'text-green-600 dark:text-green-400'}>{completedMessage}</span>
            ) : (
              <>
                <span className="block">{`Puzzle #${puzzleNumber}`}</span>
                {creator && (
                  <span className={`block text-xs ${highContrast ? 'text-hc-text' : 'text-accent-blue dark:text-accent-blue'}`}>
                    By {creator}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chevron indicator */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 ${
              highContrast ? 'text-hc-text' : 'text-gray-400 dark:text-gray-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
