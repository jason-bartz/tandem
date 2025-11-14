'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { CRYPTIC_CONFIG } from '@/lib/constants';
import BottomPanel from '@/components/shared/BottomPanel';

/**
 * HintModal - Daily Cryptic Hint System
 * NOW USES: BottomPanel for slide-up behavior so users can see the clue while viewing hints
 *
 * Displays 4 progressive hints (Fodder, Indicator, Definition, First Letter)
 * Users can unlock hints in any order, with colored cards for each hint type
 *
 * @component
 */
export default function HintModal({
  isOpen,
  onClose,
  puzzle,
  hintsUsed,
  unlockedHints,
  onUnlockHint,
  canUseHint,
}) {
  const { highContrast, theme } = useTheme();
  const [revealingHint, setRevealingHint] = useState(null);

  const hintTypeLabels = {
    fodder: 'Fodder',
    indicator: 'Indicator',
    definition: 'Definition',
    letter: 'First Letter',
  };

  const getHintIcon = (type) => {
    const isDark = theme === 'dark';
    const icons = {
      fodder: isDark ? '/icons/ui/fodder-dark.png' : '/icons/ui/fodder.png',
      indicator: isDark ? '/icons/ui/indicator-dark.png' : '/icons/ui/indicator.png',
      definition: isDark ? '/icons/ui/definition-dark.png' : '/icons/ui/definition.png',
      letter: isDark ? '/icons/ui/letter-dark.png' : '/icons/ui/letter.png',
    };
    return icons[type] || (isDark ? '/icons/ui/fodder-dark.png' : '/icons/ui/fodder.png');
  };

  const hintTypeColors = {
    fodder: {
      bg: 'bg-accent-blue/10 dark:bg-blue-900/20',
      border: 'border-accent-blue',
      text: 'text-accent-blue dark:text-blue-400',
      buttonBg: 'bg-accent-blue',
    },
    indicator: {
      bg: 'bg-accent-green/10 dark:bg-green-900/20',
      border: 'border-accent-green',
      text: 'text-accent-green dark:text-green-400',
      buttonBg: 'bg-accent-green',
    },
    definition: {
      bg: 'bg-accent-yellow/10 dark:bg-yellow-900/20',
      border: 'border-accent-yellow',
      text: 'text-accent-yellow dark:text-yellow-400',
      buttonBg: 'bg-accent-yellow',
    },
    letter: {
      bg: 'bg-accent-pink/10 dark:bg-pink-900/20',
      border: 'border-accent-pink',
      text: 'text-accent-pink dark:text-pink-400',
      buttonBg: 'bg-accent-pink',
    },
  };

  const defaultColors = {
    bg: 'bg-gray-50 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-700 dark:text-gray-300',
    buttonBg: 'bg-gray-400',
  };

  const handleUnlockHint = (index) => {
    setRevealingHint(index);
    setTimeout(() => {
      onUnlockHint(index);
      setRevealingHint(null);
    }, 300);
  };

  const isHintUnlocked = (index) => {
    return unlockedHints.includes(index);
  };

  const isHintAvailable = (index) => {
    // All hints are available if we haven't hit the max and haven't used this specific hint
    return hintsUsed < CRYPTIC_CONFIG.MAX_HINTS && !unlockedHints.includes(index);
  };

  return (
    <BottomPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Use Hints"
      maxHeight="70vh"
      footer={
        <div
          className={`text-center text-sm ${
            highContrast ? 'text-hc-text' : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          💡 Use any hints in any order to help solve the cryptic clue
        </div>
      }
    >
      {/* Hint Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {puzzle.hints.slice(0, CRYPTIC_CONFIG.MAX_HINTS).map((hint, index) => {
          const colors = hintTypeColors[hint.type] || defaultColors;
          const unlocked = isHintUnlocked(index);
          const available = isHintAvailable(index);
          const revealing = revealingHint === index;

          return (
            <div
              key={index}
              className={`relative rounded-2xl border-[3px] p-3 transition-all ${
                unlocked
                  ? `${colors.bg} ${colors.border} shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]`
                  : highContrast
                    ? 'bg-hc-surface border-hc-border'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              } ${revealing ? 'animate-pulse' : ''}`}
            >
              {/* Icon */}
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 flex items-center justify-center">
                  <Image src={getHintIcon(hint.type)} alt="" width={40} height={40} />
                </div>
              </div>

              {/* Label */}
              <div
                className={`text-xs font-bold uppercase tracking-wide text-center mb-2 ${
                  unlocked
                    ? highContrast
                      ? 'text-hc-text'
                      : colors.text
                    : highContrast
                      ? 'text-hc-text'
                      : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {hintTypeLabels[hint.type] || 'Hint'}
              </div>

              {/* Hint Text or Unlock Button */}
              {unlocked ? (
                <div
                  className={`text-sm font-medium text-center ${
                    highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {hint.text}
                </div>
              ) : (
                <button
                  onClick={() => handleUnlockHint(index)}
                  disabled={!available || !canUseHint}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs transition-all border-[2px] ${
                    available && canUseHint
                      ? highContrast
                        ? 'bg-hc-primary text-hc-primary-text border-hc-border hover:scale-105 active:scale-95'
                        : `${colors.buttonBg} text-white border-black dark:border-gray-600 hover:scale-105 active:scale-95`
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 border-gray-400 dark:border-gray-500 cursor-not-allowed'
                  }`}
                >
                  {available && canUseHint ? 'Use' : 'Locked'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </BottomPanel>
  );
}
