'use client';
import { useState } from 'react';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/contexts/ThemeContext';

const KEYBOARD_LAYOUTS = {
  QWERTY: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  QWERTZ: [
    ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Enter', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ],
  AZERTY: [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['Enter', 'W', 'X', 'C', 'V', 'B', 'N', 'BACKSPACE'],
  ],
};

export default function OnScreenKeyboard({ onKeyPress, disabled = false, layout = 'QWERTY' }) {
  const { lightTap } = useHaptics();
  const { highContrast, isDark } = useTheme();
  const [pressedKey, setPressedKey] = useState(null);

  const handleKeyPress = (key) => {
    if (disabled) return;

    // Visual and haptic feedback
    setPressedKey(key);
    lightTap();

    // Call the parent handler (convert Enter back to ENTER for consistency)
    onKeyPress(key === 'Enter' ? 'ENTER' : key);

    // Clear visual feedback after animation
    setTimeout(() => setPressedKey(null), 100);
  };

  const getKeyClasses = (key) => {
    const isPressed = pressedKey === key;
    const isSpecialKey = key === 'Enter' || key === 'BACKSPACE';

    let baseClasses = `
      select-none cursor-pointer transition-all duration-75 font-semibold
      rounded-md flex items-center justify-center
      ${isSpecialKey ? 'text-xs sm:text-sm px-1 sm:px-2' : 'text-sm sm:text-base'}
      ${isPressed ? 'scale-95' : 'hover:scale-105 active:scale-95'}
    `;

    if (highContrast) {
      if (isDark) {
        baseClasses += `
          ${
            isSpecialKey
              ? 'bg-hc-warning text-black border-2 border-hc-border'
              : 'bg-hc-surface text-hc-text border-2 border-hc-border'
          }
          ${!disabled && 'hover:bg-hc-focus hover:border-hc-focus'}
          ${isPressed && 'bg-hc-focus border-hc-focus'}
        `;
      } else {
        baseClasses += `
          ${
            isSpecialKey
              ? 'bg-hc-primary text-white border-2 border-hc-border'
              : 'bg-hc-surface text-hc-text border-2 border-hc-border'
          }
          ${!disabled && 'hover:bg-hc-focus hover:text-white'}
          ${isPressed && 'bg-hc-focus text-white'}
        `;
      }
    } else {
      if (isDark) {
        baseClasses += `
          ${
            isSpecialKey
              ? 'bg-gray-600 text-gray-100 border border-gray-500'
              : 'bg-gray-700 text-gray-200 border border-gray-600'
          }
          ${!disabled && 'hover:bg-gray-600 hover:border-gray-500'}
          ${isPressed && 'bg-gray-600 border-gray-500'}
        `;
      } else {
        baseClasses += `
          ${
            isSpecialKey
              ? 'bg-gray-400 text-white border border-gray-500'
              : 'bg-gray-200 text-gray-800 border border-gray-300'
          }
          ${!disabled && 'hover:bg-gray-300 hover:border-gray-400'}
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
    return key;
  };

  const getKeyWidth = (key) => {
    if (key === 'Enter') return 'col-span-3';
    if (key === 'BACKSPACE') return 'col-span-2';
    return 'col-span-2';
  };

  const rows = KEYBOARD_LAYOUTS[layout] || KEYBOARD_LAYOUTS.QWERTY;

  // Calculate grid columns based on actual row content
  const getGridConfig = (row, rowIndex) => {
    const letterCount = row.filter((k) => k !== 'Enter' && k !== 'BACKSPACE').length;

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

    // Bottom row - AZERTY has fewer letters (7) so it needs centering
    if (rowIndex === 2) {
      // AZERTY: Enter (3) + 6 letters (12) + Backspace (2) = 17 cols
      // QWERTY/QWERTZ: Enter (3) + 7 letters (14) + Backspace (2) = 19 cols
      const totalCols = 3 + letterCount * 2 + 2;
      const needsCentering = letterCount < 7;
      return {
        className: `grid-cols-${totalCols}`,
        style: `repeat(${totalCols}, minmax(0, 1fr))`,
        padding: needsCentering ? 'px-6 sm:px-8' : '',
      };
    }

    return {
      className: 'grid-cols-19',
      style: 'repeat(19, minmax(0, 1fr))',
      padding: '',
    };
  };

  return (
    <div className="w-full max-w-lg mx-auto px-2 pb-2">
      <div className="space-y-1 sm:space-y-2">
        {rows.map((row, rowIndex) => {
          const gridConfig = getGridConfig(row, rowIndex);
          return (
            <div
              key={rowIndex}
              className={`grid gap-1 sm:gap-1.5 ${gridConfig.className} ${gridConfig.padding}`}
              style={{
                gridTemplateColumns: gridConfig.style,
              }}
            >
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleKeyPress(key)}
                  className={`${getKeyClasses(key)} ${getKeyWidth(key, rowIndex)} h-10 sm:h-12`}
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
