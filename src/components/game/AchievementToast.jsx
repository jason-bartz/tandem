'use client';
import { useState, useEffect } from 'react';
import gameCenterService from '@/services/gameCenter.service';

export default function AchievementToast() {
  const [achievement, setAchievement] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Subscribe to achievement unlocks
    const unsubscribe = gameCenterService.onAchievementUnlocked((achievements) => {
      if (achievements && achievements.length > 0) {
        // Show first achievement (if multiple, queue them)
        showAchievement(achievements[0]);

        // Show subsequent achievements with delay
        achievements.slice(1).forEach((ach, index) => {
          setTimeout(() => showAchievement(ach), (index + 1) * 3500);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const showAchievement = (ach) => {
    setAchievement(ach);
    setVisible(true);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setVisible(false);
      // Clear achievement after fade out animation
      setTimeout(() => setAchievement(null), 300);
    }, 3000);
  };

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
