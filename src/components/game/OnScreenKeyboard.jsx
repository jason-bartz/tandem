'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
import { STORAGE_KEYS } from '@/lib/constants';
import { playKeyPressSound } from '@/lib/sounds';

const KEYBOARD_LAYOUTS = {
  QWERTY: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  QWERTZ: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  AZERTY: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE'],
  ],
};

export default function OnScreenKeyboard({
  onKeyPress,
  disabled = false,
  layout = 'QWERTY',
  isSmallPhone = false,
  isMobilePhone = false,
  checkButtonColor = '#3B82F6', // Default blue for Daily Tandem
  actionKeyType = 'check', // 'check' for checkmark (ENTER), 'tab' for tab arrow (TAB)
}) {
  const { lightTap } = useHaptics();
  const { highContrast, isDark, reduceMotion } = useTheme();
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [isVisible, setIsVisible] = useState(reduceMotion); // Immediately visible if reduce motion is on

  // Load sound preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.SOUND);
      setSoundEnabled(saved !== 'false');
    }
  }, []);

  // Show keyboard after screen slide animation completes (350ms)
  useEffect(() => {
    if (!reduceMotion && !isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 350); // Wait for screen slide-up to complete
      return () => clearTimeout(timer);
    }
  }, [isVisible, reduceMotion]);

  // Mark as animated after the cascade animation completes
  useEffect(() => {
    if (!hasAnimated) {
      // Calculate total animation time (350ms screen slide + 3 rows * 30ms base delay + last key delay + animation duration)
      const totalTime = reduceMotion ? 0 : 1150;
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, totalTime);
      return () => clearTimeout(timer);
    }
  }, [hasAnimated, reduceMotion]);

  const handleKeyPress = (key, event) => {
    if (disabled) return;

    // Prevent event from bubbling and causing duplicate presses
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (pressedKeys.has(key)) {
      return;
    }

    // Visual and haptic feedback - add key to pressed set
    setPressedKeys((prev) => new Set(prev).add(key));
    lightTap();

    // Play keypress sound if enabled
    if (soundEnabled) {
      playKeyPressSound();
    }

    // Call the parent handler
    onKeyPress(key);

    setTimeout(() => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 150);
  };

  const handleKeyRelease = (key) => {
    // This is especially important for mobile devices
    setPressedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const getKeyClasses = (key) => {
    const isPressed = pressedKeys.has(key);
    const isEnterKey = key === 'ENTER';
    const isBackspaceKey = key === 'BACKSPACE';
    const isSpecialKey = isEnterKey || isBackspaceKey;

    let baseClasses = `
      select-none cursor-pointer touch-manipulation font-bold
      rounded-xl border-[3px] border-black dark:border-gray-600
      flex items-center justify-center
      shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]
      transition-all duration-150 ease-out
      ${isSpecialKey ? 'text-sm sm:text-base px-1 sm:px-2' : 'text-lg sm:text-xl'}
      ${isPressed ? 'translate-x-[2px] translate-y-[2px] shadow-[1px_1px_0px_rgba(0,0,0,1)]' : 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)]'}
    `;

    if (highContrast) {
      if (isDark) {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-hc-primary text-hc-primary-text border-hc-border'
              : isBackspaceKey
                ? 'bg-hc-warning text-hc-warning-text border-hc-border'
                : 'bg-hc-surface text-hc-text border-hc-border'
          }
          ${!disabled && '@media (hover: hover) { hover:bg-hc-focus hover:border-hc-focus }'}
          ${isPressed && 'bg-hc-focus border-hc-focus'}
        `;
      } else {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-hc-primary text-hc-primary-text border-hc-border'
              : isBackspaceKey
                ? 'bg-hc-warning text-hc-text border-hc-border'
                : 'bg-hc-surface text-hc-text border-hc-border'
          }
          ${!disabled && '@media (hover: hover) { hover:bg-hc-focus hover:text-hc-primary-text }'}
          ${isPressed && 'bg-hc-focus text-hc-primary-text'}
        `;
      }
    } else {
      // Regular styling - neo-brutalist
      if (isDark) {
        baseClasses += `
          ${isBackspaceKey ? 'bg-gray-600 text-gray-100' : 'bg-gray-700 text-gray-200'}
          ${!disabled && !isEnterKey && 'md:hover:bg-gray-600'}
          ${isPressed && !isEnterKey && 'bg-gray-600'}
        `;
      } else {
        baseClasses += `
          ${isBackspaceKey ? 'bg-gray-300 text-gray-800' : 'bg-gray-100 text-gray-800'}
          ${!disabled && !isEnterKey && 'md:hover:bg-gray-200'}
          ${isPressed && !isEnterKey && 'bg-gray-200'}
        `;
      }
    }

    if (disabled) {
      baseClasses += ' opacity-50 cursor-not-allowed';
    }

    return baseClasses;
  };

  const getKeyContent = (key) => {
    if (key === 'BACKSPACE') {
      return (
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"
          />
        </svg>
      );
    }
    if (key === 'ENTER') {
      // Show Tab icon for crossword navigation, checkmark for word games
      if (actionKeyType === 'tab') {
        return (
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            {/* Tab arrow: horizontal line with arrow pointing right */}
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" />
          </svg>
        );
      }
      return (
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return key;
  };

  const getKeyWidth = (key) => {
    if (key === 'ENTER') return 'col-span-3';
    if (key === 'BACKSPACE') return 'col-span-3';
    return 'col-span-2';
  };

  const rows = KEYBOARD_LAYOUTS[layout] || KEYBOARD_LAYOUTS.QWERTY;

  // Calculate waterfall cascade delay for each key
  const getKeyDelay = (rowIndex, keyIndex) => {
    if (reduceMotion) return 0;
    // Add 350ms base delay to wait for screen slide-up animation to complete
    // Then add staggered delays for waterfall effect
    const screenSlideDelay = 350;
    const rowDelay = rowIndex * 30;
    const keyDelay = keyIndex * 25;
    return (screenSlideDelay + rowDelay + keyDelay) / 1000; // Convert to seconds for framer-motion
  };

  // Animation variants for keyboard keys following Apple HIG
  const keyVariants = {
    initial: {
      scale: 0.7,
      opacity: 0,
      y: 10,
    },
    animate: (custom) => ({
      scale: 1,
      opacity: 1,
      y: 0,
      transition: {
        delay: custom.delay,
        duration: reduceMotion ? 0 : 0.3,
        ease: [0.25, 0.1, 0.25, 1], // Apple's ease-in-out curve
      },
    }),
  };

  const getGridConfig = (row, rowIndex) => {
    const letterCount = row.filter((k) => k !== 'ENTER' && k !== 'BACKSPACE').length;

    // For AZERTY second row with 10 letters
    if (rowIndex === 1 && letterCount === 10) {
      return {
        className: 'grid-cols-20',
        style: 'repeat(20, minmax(0, 1fr))',
        padding: '',
      };
    }

    // Top row (10 letters, 2 cols each = 20 cols)
    if (rowIndex === 0) {
      return {
        className: 'grid-cols-20',
        style: 'repeat(20, minmax(0, 1fr))',
        padding: '',
      };
    }

    // Middle row (9 letters, 2 cols each = 18 cols)
    if (rowIndex === 1) {
      return {
        className: 'grid-cols-18',
        style: 'repeat(18, minmax(0, 1fr))',
        padding: 'px-4 sm:px-5',
      };
    }

    // Bottom row - Now perfectly symmetric with ENTER (3) and BACKSPACE (3)
    if (rowIndex === 2) {
      // With X key included:
      // QWERTY/QWERTZ: ENTER (3) + 7 letters (14) + BACKSPACE (3) = 20 cols
      // AZERTY: ENTER (3) + 6 letters (12) + BACKSPACE (3) = 18 cols
      const totalCols = 3 + letterCount * 2 + 3;
      return {
        className: `grid-cols-${totalCols}`,
        style: `repeat(${totalCols}, minmax(0, 1fr))`,
        padding: '', // No padding needed - perfectly centered
      };
    }

    return {
      className: 'grid-cols-20',
      style: 'repeat(20, minmax(0, 1fr))',
      padding: '',
    };
  };

  return (
    <div
      className={`w-full max-w-md mx-auto ${
        isSmallPhone ? 'px-2' : isMobilePhone ? 'px-2' : 'px-3'
      }`}
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      <div
        className={
          isSmallPhone ? 'space-y-1.5' : isMobilePhone ? 'space-y-2' : 'space-y-2 sm:space-y-2.5'
        }
      >
        {rows.map((row, rowIndex) => {
          const gridConfig = getGridConfig(row, rowIndex);
          return (
            <div
              key={rowIndex}
              className={`grid ${
                isSmallPhone ? 'gap-0.5' : isMobilePhone ? 'gap-1' : 'gap-1 sm:gap-1.5'
              } ${gridConfig.className} ${gridConfig.padding}`}
              style={{
                gridTemplateColumns: gridConfig.style,
              }}
            >
              {row.map((key, keyIndex) => (
                <motion.button
                  key={key}
                  type="button"
                  disabled={disabled}
                  variants={keyVariants}
                  initial={!hasAnimated ? 'initial' : false}
                  animate="animate"
                  custom={{ delay: getKeyDelay(rowIndex, keyIndex) }}
                  onPointerDown={(e) => handleKeyPress(key, e)}
                  onPointerUp={() => handleKeyRelease(key)}
                  onPointerLeave={() => handleKeyRelease(key)}
                  onTouchEnd={() => handleKeyRelease(key)}
                  onTouchCancel={() => handleKeyRelease(key)}
                  className={`${getKeyClasses(key)} ${getKeyWidth(key, rowIndex)} ${
                    isSmallPhone ? 'h-9' : isMobilePhone ? 'h-10' : 'h-10 sm:h-11'
                  }`}
                  style={
                    key === 'ENTER' && !highContrast
                      ? {
                          backgroundColor: checkButtonColor,
                          color: '#1F2937',
                          borderColor: '#000000',
                        }
                      : {}
                  }
                  aria-label={
                    key === 'BACKSPACE'
                      ? 'Backspace'
                      : key === 'ENTER'
                        ? actionKeyType === 'tab'
                          ? 'Next clue'
                          : 'Enter'
                        : key
                  }
                >
                  {getKeyContent(key)}
                </motion.button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
