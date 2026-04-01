'use client';
import { useState } from 'react';

/**
 * AchievementToast - Display achievement unlock notifications
 *
 * Shows toast notifications when players unlock achievements.
 * Called via window.__showAchievementToast by the achievementNotifier module.
 */

// Map achievement game type to accent color
function getToastColors(achievement) {
  const id = achievement?.id || '';
  if (id.includes('mini')) return 'bg-accent-yellow text-black';
  if (id.includes('reel')) return 'bg-red-500 text-white';
  if (id.includes('soup') || id.includes('alchemy')) return 'bg-accent-green text-black';
  return 'bg-accent-blue text-white'; // Tandem default
}

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

  const colorClasses = getToastColors(achievement);

  return (
    <div
      className={`
        fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999]
        transition-all duration-300 ease-out
        ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`${colorClasses} px-5 py-3.5 rounded-2xl flex items-center gap-3 max-w-sm border-2 border-black/10`}
      >
        <span className="text-4xl">{achievement.emoji}</span>
        <div className="flex-1">
          <div className="font-black text-[10px] uppercase tracking-widest opacity-80">
            Achievement Unlocked
          </div>
          <div className="font-bold text-sm mt-0.5">{achievement.name}</div>
        </div>
        <span className="text-3xl">🏆</span>
      </div>
    </div>
  );
}
