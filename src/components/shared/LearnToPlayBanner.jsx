'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * LearnToPlayBanner Component
 *
 * A slide-down banner that prompts new users to learn how to play.
 * Appears 3 seconds after the game starts, only for first-time players.
 * Persists across sessions until the user interacts with it.
 *
 * @param {string} gameType - 'tandem', 'soup', or 'reel' to determine styling and localStorage key
 * @param {function} onOpenHowToPlay - Callback to open the How to Play modal
 */
export default function LearnToPlayBanner({ gameType = 'tandem', onOpenHowToPlay }) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const { reduceMotion, highContrast } = useTheme();
  const { lightTap } = useHaptics();

  const storageKey = `${gameType}LearnToPlayDismissed`;

  // Check localStorage and show banner after delay
  useEffect(() => {
    // Check if already dismissed
    if (typeof window === 'undefined') return;

    const isDismissed = localStorage.getItem(storageKey);
    if (isDismissed === 'true') {
      return;
    }

    // Show banner after 3 second delay
    setShouldRender(true);
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [storageKey]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    lightTap();
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    // Dispatch custom event for HintTutorialBanner to listen for
    window.dispatchEvent(new CustomEvent('learnToPlayDismissed', { detail: { gameType } }));
  };

  const handleClick = () => {
    lightTap();
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
    // Dispatch custom event for HintTutorialBanner to listen for
    window.dispatchEvent(new CustomEvent('learnToPlayDismissed', { detail: { gameType } }));
    onOpenHowToPlay?.();
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
  const isTandem = gameType === 'tandem';
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
            ${isTandem ? 'top-[calc(env(safe-area-inset-top,0px)+12px)]' : isSoup ? 'top-[calc(env(safe-area-inset-top,0px)+68px)]' : 'top-[calc(env(safe-area-inset-top,0px)+68px)]'}
          `}
          role="banner"
          aria-label="Learn how to play prompt"
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
                  : isTandem
                    ? 'bg-white/95 dark:bg-gray-800/95 border-blue-400 dark:border-blue-500'
                    : isSoup
                      ? 'bg-white/95 dark:bg-gray-800/95 border-green-500 dark:border-green-400'
                      : 'bg-[#1a1a2e]/95 border-[#ffce00]'
              }
            `}
            style={{
              boxShadow: highContrast
                ? '0 4px 12px rgba(0,0,0,0.3)'
                : isTandem
                  ? '0 4px 16px rgba(59, 130, 246, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
                  : isSoup
                    ? '0 4px 16px rgba(34, 197, 94, 0.25), 0 2px 8px rgba(0, 0, 0, 0.1)'
                    : '0 4px 16px rgba(255, 206, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Hint Icon */}
            <Image
              src="/icons/ui/hint.png"
              alt=""
              width={20}
              height={20}
              className="flex-shrink-0"
            />

            {/* Text */}
            <span
              className={`
                text-sm font-semibold whitespace-nowrap
                ${
                  highContrast
                    ? 'text-hc-text'
                    : isTandem || isSoup
                      ? 'text-gray-800 dark:text-gray-100'
                      : 'text-white'
                }
              `}
            >
              Learn how to play?
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
                    : isTandem || isSoup
                      ? 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                      : 'hover:bg-white/10 text-white/70'
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
