'use client';
import { useState, useEffect } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';
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
}) {
  const { lightTap } = useHaptics();
  const { highContrast, isDark } = useTheme();
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load sound preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soundEnabled');
      if (saved !== null) {
        setSoundEnabled(saved === 'true');
      }
    }
  }, []);

  const handleKeyPress = (key, event) => {
    if (disabled) return;

    // Prevent event from bubbling and causing duplicate presses
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Check if this key is already pressed (prevent duplicate rapid presses)
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

    // Clear visual feedback after animation - remove specific key from set
    setTimeout(() => {
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 150);
  };

  const handleKeyRelease = (key) => {
    // Ensure pressed state is cleared on pointer/touch release
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
      rounded-md flex items-center justify-center
      transition-[background-color,border-color,transform] duration-150 ease-out
      ${isSpecialKey ? 'text-sm sm:text-base px-1 sm:px-2' : 'text-lg sm:text-xl'}
      ${isPressed ? 'scale-95' : 'active:scale-95'}
    `;

    if (highContrast) {
      if (isDark) {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border'
              : isBackspaceKey
                ? 'bg-hc-warning text-hc-warning-text border-2 border-hc-border'
                : 'bg-hc-surface text-hc-text border-2 border-hc-border'
          }
          ${!disabled && '@media (hover: hover) { hover:bg-hc-focus hover:border-hc-focus }'}
          ${isPressed && 'bg-hc-focus border-hc-focus'}
        `;
      } else {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border'
              : isBackspaceKey
                ? 'bg-hc-warning text-hc-text border-2 border-hc-border'
                : 'bg-hc-surface text-hc-text border-2 border-hc-border'
          }
          ${!disabled && '@media (hover: hover) { hover:bg-hc-focus hover:text-hc-primary-text }'}
          ${isPressed && 'bg-hc-focus text-hc-primary-text'}
        `;
      }
    } else {
      if (isDark) {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-gray-600 text-gray-100 border border-gray-500'
              : isBackspaceKey
                ? 'bg-gray-600 text-gray-100 border border-gray-500'
                : 'bg-gray-700 text-gray-200 border border-gray-600'
          }
          ${!disabled && 'md:hover:bg-gray-600 md:hover:border-gray-500'}
          ${isPressed && 'bg-gray-600 border-gray-500'}
        `;
      } else {
        baseClasses += `
          ${
            isEnterKey
              ? 'bg-gray-400 text-white border border-gray-500'
              : isBackspaceKey
                ? 'bg-gray-400 text-white border border-gray-500'
                : 'bg-gray-200 text-gray-800 border border-gray-300'
          }
          ${!disabled && 'md:hover:bg-gray-300 md:hover:border-gray-400'}
          ${isPressed && 'bg-gray-300 border-gray-400'}
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
      return 'Enter';
    }
    return key;
  };

  const getKeyWidth = (key) => {
    if (key === 'ENTER') return 'col-span-3';
    if (key === 'BACKSPACE') return 'col-span-3';
    return 'col-span-2';
  };

  const rows = KEYBOARD_LAYOUTS[layout] || KEYBOARD_LAYOUTS.QWERTY;

  // Calculate grid columns based on actual row content
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
      // AZERTY: ENTER (3) + 6 letters (12) + BACKSPACE (3) = 18 cols (centered!)
      // QWERTY/QWERTZ: ENTER (3) + 7 letters (14) + BACKSPACE (3) = 20 cols (matches top row!)
      const totalCols = 3 + letterCount * 2 + 3;
      return {
        className: `grid-cols-${totalCols}`,
        style: `repeat(${totalCols}, minmax(0, 1fr))`,
        padding: '', // No padding needed - now perfectly centered
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
      className={`w-full max-w-lg mx-auto ${
        isSmallPhone ? 'px-1 pb-2' : isMobilePhone ? 'px-1.5 pb-2' : 'px-2 pb-3'
      }`}
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
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onPointerDown={(e) => handleKeyPress(key, e)}
                  onPointerUp={() => handleKeyRelease(key)}
                  onPointerLeave={() => handleKeyRelease(key)}
                  onTouchEnd={() => handleKeyRelease(key)}
                  onTouchCancel={() => handleKeyRelease(key)}
                  className={`${getKeyClasses(key)} ${getKeyWidth(key, rowIndex)} ${
                    isSmallPhone ? 'h-[50px]' : isMobilePhone ? 'h-14' : 'h-14 sm:h-[58px]'
                  }`}
                  aria-label={key === 'BACKSPACE' ? 'Backspace' : key}
                >
                  {getKeyContent(key)}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
