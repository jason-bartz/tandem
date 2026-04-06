'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * AchievementToast - Display achievement unlock notifications
 *
 * Shows toast notifications when players unlock achievements.
 * Called via window.__showAchievementToast by the achievementNotifier module.
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

export default function AchievementToast() {
  const { highContrast, reduceMotion } = useTheme();
  const [achievement, setAchievement] = useState(null);
  const [visible, setVisible] = useState(false);

  const showAchievement = (ach) => {
    setAchievement(ach);
    setVisible(true);

    setTimeout(() => {
      setVisible(false);

      setTimeout(() => setAchievement(null), 300);
    }, 3000);
  };

  // Expose showAchievement globally for the achievementNotifier module
  if (typeof window !== 'undefined') {
    window.__showAchievementToast = showAchievement;
  }

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
