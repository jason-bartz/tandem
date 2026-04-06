'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

/**
 * HintEarnedToast Component
 *
 * Displays a toast notification when a player earns a hint.
 * Flat design: solid accent color, no gradients, Lucide icons.
 */
export default function HintEarnedToast({ isSmallPhone = false, isMobilePhone = false }) {
  const [visible, setVisible] = useState(false);
  const { highContrast, reduceMotion } = useTheme();
  const { lightTap } = useHaptics();

  useEffect(() => {
    const handleHintEarned = () => {
      lightTap();
      setVisible(true);

      setTimeout(() => {
        setVisible(false);
      }, 2500);
    };

    window.addEventListener('hintEarned', handleHintEarned);
    return () => window.removeEventListener('hintEarned', handleHintEarned);
  }, [lightTap]);

  const variants = {
    hidden: {
      opacity: 0,
      y: -20,
      scale: reduceMotion ? 1 : 0.95,
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0.0, 0.2, 1] },
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
              rounded-2xl flex items-center gap-3
              ${isSmallPhone ? 'max-w-[280px]' : isMobilePhone ? 'max-w-xs' : 'max-w-sm'}
              ${
                highContrast
                  ? 'bg-hc-warning text-hc-warning-text border-2 border-hc-border'
                  : 'bg-flat-accent text-gray-900 border-2 border-flat-accent'
              }
            `}
          >
            <Lightbulb
              className={isSmallPhone ? 'w-5 h-5 flex-shrink-0' : 'w-6 h-6 flex-shrink-0'}
            />

            <div className="flex-1">
              <div
                className={`font-bold ${isSmallPhone ? 'text-xs' : 'text-sm'}`}
              >
                Hint Earned!
              </div>
              <div
                className={`opacity-90 ${isSmallPhone ? 'text-[10px]' : 'text-xs'}`}
              >
                You unlocked an extra hint
              </div>
            </div>

            <Sparkles
              className={isSmallPhone ? 'w-4 h-4 flex-shrink-0' : 'w-5 h-5 flex-shrink-0'}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
