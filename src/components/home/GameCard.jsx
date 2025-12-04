'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { playButtonTone } from '@/lib/sounds';

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
  onClick,
  loading = false,
  completed = false,
  completedMessage = 'Completed!',
  animationDelay = 0,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { lightTap } = useHaptics();

  const handleClick = () => {
    if (loading) return;

    try {
      playButtonTone();
      lightTap();
    } catch (e) {
      // Sound might fail on some browsers
    }

    onClick?.();
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : animationDelay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }
    },
  };

  const tapVariants = {
    tap: reduceMotion ? {} : {
      scale: 0.98,
      x: 2,
      y: 2,
    },
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={loading}
      className={`w-full text-left rounded-[24px] border-[3px] overflow-hidden p-5 transition-shadow cursor-pointer disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)] focus-visible:ring-hc-focus'
          : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] focus-visible:ring-accent-blue'
      }`}
      variants={{ ...cardVariants, ...tapVariants }}
      initial="initial"
      animate="animate"
      whileTap="tap"
      aria-label={`Play ${title}${completed ? ' - Completed' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-[52px] h-[52px] flex-shrink-0 relative">
          {loading ? (
            <div
              className={`w-full h-full rounded-xl bg-gray-200 dark:bg-gray-700 ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
          ) : (
            <Image
              src={icon}
              alt=""
              width={52}
              height={52}
              className="rounded-xl"
              priority
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            className={`text-xl font-bold mb-1 ${
              highContrast
                ? 'text-hc-text'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {title}
          </h3>

          {/* Description */}
          <p
            className={`text-sm leading-snug mb-2 ${
              highContrast
                ? 'text-hc-text opacity-80'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {description}
          </p>

          {/* Puzzle Number */}
          <p
            className={`text-sm font-medium ${
              highContrast
                ? 'text-hc-text opacity-70'
                : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            {loading ? (
              <span className="inline-block w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            ) : completed ? (
              <span className="text-green-600 dark:text-green-400">{completedMessage}</span>
            ) : (
              `Puzzle #${puzzleNumber}`
            )}
          </p>
        </div>

        {/* Chevron indicator */}
        <div className="flex-shrink-0">
          <svg
            className={`w-5 h-5 ${
              highContrast
                ? 'text-hc-text opacity-60'
                : 'text-gray-400 dark:text-gray-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
