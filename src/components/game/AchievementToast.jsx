'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * AchievementToast - Display achievement unlock notifications
 *
 * Shows toast notifications when players unlock achievements.
 * Called via window.__showAchievementToast by the achievementNotifier module.
 *
 * Maintains an internal queue so that crossing multiple thresholds in one
 * action (e.g. completing several archive puzzles back-to-back, or signing
 * in for the first time and backfilling many achievements) shows each toast
 * sequentially instead of dropping all but the first.
 */

// Map achievement game type to accent color
function getToastColors(achievement, highContrast) {
  if (highContrast) return 'bg-hc-surface text-hc-text border-2 border-hc-border';
  const id = achievement?.id || '';
  if (id.includes('mini')) return 'bg-accent-yellow text-gray-900 border-2 border-accent-yellow';
  if (id.includes('reel')) return 'bg-accent-red text-white border-2 border-accent-red';
  if (id.includes('soup') || id.includes('alchemy'))
    return 'bg-accent-green text-gray-900 border-2 border-accent-green';
  return 'bg-accent-blue text-white border-2 border-accent-blue'; // Tandem default
}

const TOAST_VISIBLE_MS = 3000;
const TOAST_EXIT_MS = 300;
const TOAST_BETWEEN_MS = 200;

export default function AchievementToast() {
  const { highContrast, reduceMotion } = useTheme();
  const [achievement, setAchievement] = useState(null);
  const [visible, setVisible] = useState(false);

  const queueRef = useRef([]);
  const isShowingRef = useRef(false);
  const timeoutsRef = useRef([]);

  // Process the next item in the queue, if any.
  const processQueue = () => {
    if (isShowingRef.current) return;
    if (queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    isShowingRef.current = true;
    setAchievement(next);
    setVisible(true);

    const visibleTimer = setTimeout(() => {
      setVisible(false);
      const exitTimer = setTimeout(() => {
        setAchievement(null);
        const gapTimer = setTimeout(() => {
          isShowingRef.current = false;
          processQueue();
        }, TOAST_BETWEEN_MS);
        timeoutsRef.current.push(gapTimer);
      }, TOAST_EXIT_MS);
      timeoutsRef.current.push(exitTimer);
    }, TOAST_VISIBLE_MS);
    timeoutsRef.current.push(visibleTimer);
  };

  // Public enqueue: callable from anywhere via the window global.
  const enqueue = (ach) => {
    if (!ach) return;
    queueRef.current.push(ach);
    processQueue();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__showAchievementToast = enqueue;
    }
    return () => {
      // Clean up any pending timeouts on unmount
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      if (typeof window !== 'undefined') {
        // Only clear the global if it still points at our handler
        if (window.__showAchievementToast === enqueue) {
          delete window.__showAchievementToast;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!achievement) {
    return null;
  }

  const colorClasses = getToastColors(achievement, highContrast);

  const variants = {
    hidden: {
      opacity: 0,
      y: -20,
      x: '-50%',
      scale: reduceMotion ? 1 : 0.95,
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
    visible: {
      opacity: 1,
      y: 0,
      x: '-50%',
      scale: 1,
      transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0.0, 0.2, 1] },
    },
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-20 left-1/2 z-[9999]"
          variants={variants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          role="alert"
          aria-live="polite"
        >
          <div
            className={`${colorClasses} px-5 py-3.5 rounded-2xl flex items-center gap-3 w-[90vw] max-w-md`}
          >
            <span className="text-3xl">{achievement.emoji}</span>
            <div className="font-bold text-sm">
              <span className="uppercase tracking-wide opacity-80">Achievement:</span>{' '}
              {achievement.name}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
