'use client';
import { useState } from 'react';

/**
 * AchievementToast - Display achievement unlock notifications
 *
 * Shows toast notifications when players unlock achievements.
 * Called via window.__showAchievementToast by the achievementNotifier module.
 */
export default function AchievementToast() {
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

  return (
    <div
      className={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="bg-amber-400 text-black px-6 py-4 rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center gap-3 max-w-sm">
        <span className="text-3xl">{achievement.emoji}</span>
        <div className="flex-1">
          <div className="font-black text-sm uppercase tracking-wide">Achievement Unlocked!</div>
          <div className="font-bold text-xs mt-0.5">{achievement.name}</div>
        </div>
        <span className="text-3xl">🏆</span>
      </div>
    </div>
  );
}
