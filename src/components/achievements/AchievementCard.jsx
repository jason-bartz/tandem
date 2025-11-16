'use client';

import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

/**
 * AchievementCard - Display individual achievement with locked/unlocked state
 * Shows achievement image, name, description, and progress
 *
 * @param {Object} achievement - Achievement data object
 * @param {boolean} achievement.isUnlocked - Whether user has unlocked this achievement
 * @param {number} achievement.progress - Progress percentage (0-100)
 * @param {string} achievement.name - Achievement name
 * @param {string} achievement.description - Achievement description
 * @param {string} achievement.emoji - Achievement emoji
 * @param {string} achievement.imageFilename - Image filename in public/images/achievements
 * @param {number} achievement.points - Points awarded for this achievement
 * @param {number} achievement.threshold - Threshold to unlock
 * @param {number} achievement.currentValue - User's current value
 * @param {number} index - Index in the list for stagger animation
 */
export default function AchievementCard({ achievement, index = 0 }) {
  const { highContrast, reduceMotion } = useTheme();

  const { isUnlocked, progress, name, description, imageFilename, threshold, currentValue } =
    achievement;

  // Calculate stagger delay for cascade effect (50ms per item)
  const getDelayClass = () => {
    if (reduceMotion) return '';
    const delay = index * 50;
    if (delay === 0) return 'delay-0';
    if (delay <= 50) return 'delay-50';
    if (delay <= 75) return 'delay-75';
    if (delay <= 100) return 'delay-100';
    if (delay <= 150) return 'delay-150';
    if (delay <= 200) return 'delay-200';
    if (delay <= 250) return 'delay-250';
    if (delay <= 300) return 'delay-300';
    if (delay <= 400) return 'delay-400';
    if (delay <= 500) return 'delay-500';
    if (delay <= 600) return 'delay-600';
    if (delay <= 700) return 'delay-700';
    return 'delay-800';
  };

  const delayClass = getDelayClass();
  const animationClass = reduceMotion ? '' : 'animate-fade-in-up';

  return (
    <div
      className={`relative rounded-2xl border-[3px] p-4 transition-all ${animationClass} ${delayClass} ${
        isUnlocked
          ? highContrast
            ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
            : 'bg-white dark:bg-bg-card border-border-main shadow-[4px_4px_0px_rgba(0,0,0,0.15)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.4)]'
          : highContrast
            ? 'bg-hc-surface/40 border-hc-border/40 shadow-[2px_2px_0px_rgba(0,0,0,0.3)]'
            : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.2)]'
      }`}
    >
      {/* Locked Overlay */}
      {!isUnlocked && (
        <div className="absolute inset-0 rounded-2xl bg-black/20 dark:bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <Image
            src="/icons/ui/lock.png"
            alt="Locked"
            width={32}
            height={32}
            className="opacity-60"
          />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Achievement Image */}
        <div className="flex-shrink-0">
          <div
            className={`relative w-16 h-16 rounded-xl border-[2px] overflow-hidden ${
              isUnlocked
                ? highContrast
                  ? 'border-hc-border'
                  : 'border-border-main'
                : 'border-gray-300 dark:border-gray-600 opacity-50'
            }`}
          >
            <Image
              src={
                achievement.gameMode === 'cryptic'
                  ? `/images/cryptic%20achievements/${imageFilename}`
                  : `/images/achievements/${imageFilename}`
              }
              alt={name}
              fill
              className={`object-cover ${!isUnlocked ? 'grayscale' : ''}`}
              sizes="64px"
              onError={(e) => {
                console.error(`Failed to load image: ${e.currentTarget.src}`);
              }}
            />
          </div>
        </div>

        {/* Achievement Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-bold text-base leading-tight mb-1 ${
              isUnlocked
                ? highContrast
                  ? 'text-hc-text'
                  : 'text-gray-900 dark:text-gray-100'
                : highContrast
                  ? 'text-hc-text/60'
                  : 'text-gray-500 dark:text-gray-500'
            }`}
          >
            {name}
          </h3>

          <p
            className={`text-sm ${
              isUnlocked
                ? highContrast
                  ? 'text-hc-text/80'
                  : 'text-gray-600 dark:text-gray-400'
                : highContrast
                  ? 'text-hc-text/50'
                  : 'text-gray-500 dark:text-gray-600'
            } ${!isUnlocked ? 'mb-2' : 'mb-3'}`}
          >
            {description}
          </p>

          {/* Progress Bar (only show for locked achievements) */}
          {!isUnlocked && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span
                  className={`font-medium ${
                    highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-500'
                  }`}
                >
                  Progress: {progress}%
                </span>
                <span
                  className={`font-medium ${
                    highContrast ? 'text-hc-text/70' : 'text-gray-600 dark:text-gray-500'
                  }`}
                >
                  {currentValue} / {threshold}
                </span>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${
                  highContrast ? 'bg-hc-surface' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`h-full rounded-full ${
                    reduceMotion ? 'transition-all duration-500' : 'animate-progress-fill'
                  } ${highContrast ? 'bg-hc-primary' : 'bg-accent-blue'}`}
                  style={{
                    width: reduceMotion ? `${progress}%` : undefined,
                    '--target-width': `${progress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Unlocked Date (optional - could be added later) */}
          {isUnlocked && (
            <div
              className={`text-xs font-medium ${
                highContrast ? 'text-hc-primary' : 'text-green-600 dark:text-green-400'
              }`}
            >
              ✓ Unlocked
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
