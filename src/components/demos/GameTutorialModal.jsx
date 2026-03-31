'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * GameTutorialModal - Shared first-visit tutorial shell.
 *
 * Replaces the old step-by-step screenshot carousels with a single
 * auto-playing animated demo and captions that advance in sync with
 * the demo timeline.
 *
 * @param {React.ReactNode} demo - The demo component (e.g. <TandemDemo />)
 * @param {string|null} caption - Current caption text (driven by demo timeline)
 * @param {string} storageKey - localStorage key for dismissal tracking
 * @param {string} gameType - Game identifier for the learnToPlayDismissed event
 * @param {string} accentColorClass - Tailwind bg class for the CTA button
 * @param {string} accentHoverClass - Tailwind bg class for CTA hover
 * @param {string} [ctaTextColor='text-white'] - Text color class for CTA
 * @param {function} [onClose] - Callback when tutorial is dismissed
 */
export default function GameTutorialModal({
  demo,
  caption,
  storageKey,
  gameType,
  accentColorClass,
  accentHoverClass,
  ctaTextColor = 'text-white',
  onClose: onCloseProp,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { reduceMotion, highContrast } = useTheme();
  const { lightTap } = useHaptics();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed !== 'true') {
      setIsOpen(true);
    } else {
      onCloseProp?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    lightTap();
    setIsOpen(false);
    localStorage.setItem(storageKey, 'true');
    if (gameType) {
      window.dispatchEvent(new CustomEvent('learnToPlayDismissed', { detail: { gameType } }));
    }
    onCloseProp?.();
  }, [lightTap, storageKey, gameType, onCloseProp]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />

          {/* Modal card */}
          <motion.div
            initial={!reduceMotion ? { scale: 0.95, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            exit={!reduceMotion ? { scale: 0.95, opacity: 0 } : undefined}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'relative w-full max-w-[340px] flex flex-col rounded-lg overflow-hidden',
              highContrast
                ? 'bg-hc-surface border-2 border-hc-border'
                : 'bg-bg-card dark:bg-gray-800'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated demo area */}
            <div className="w-full">{demo}</div>

            {/* Caption & controls */}
            <div className="flex flex-col items-center px-5 pt-4 pb-5" style={{ minHeight: 120 }}>
              {/* Caption text — auto-advances with demo */}
              <div className="flex-1 flex items-center mb-3">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={caption || 'default'}
                    initial={!reduceMotion ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={!reduceMotion ? { opacity: 0, y: -4 } : undefined}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'text-center text-sm leading-relaxed font-medium',
                      highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-200'
                    )}
                  >
                    {caption || 'Watch how it works...'}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Let's Play button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className={cn(
                  'w-full py-2.5 rounded-md font-bold text-sm',
                  'transition-all duration-200 hover:scale-105',
                  highContrast
                    ? 'bg-hc-primary text-white'
                    : `${accentColorClass} hover:${accentHoverClass} ${ctaTextColor}`
                )}
              >
                Let&apos;s Play!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
