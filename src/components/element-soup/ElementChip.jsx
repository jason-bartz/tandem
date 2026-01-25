'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * ElementChip - Small clickable chip for displaying an element
 * Designed to fit many elements in a grid layout
 */
export function ElementChip({
  element,
  isSelected = false,
  isNew = false,
  isTarget = false,
  onClick,
  disabled = false,
  size = 'default', // 'default' | 'small' | 'large'
}) {
  const { highContrast, reduceMotion } = useTheme();

  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-2.5 py-1.5 text-sm gap-1.5',
    large: 'px-3 py-2 text-base gap-2',
  };

  const emojiSizes = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
  };

  return (
    <motion.button
      onClick={() => !disabled && onClick?.(element)}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center',
        sizeClasses[size],
        !isSelected && !isTarget && 'bg-white dark:bg-gray-800',
        'border-[2px] border-black dark:border-gray-600',
        'rounded-lg',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
        'font-medium',
        'cursor-pointer',
        'transition-all duration-150',
        !disabled && 'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
        !disabled && 'active:translate-y-0 active:shadow-none',
        isSelected && 'bg-green-200 dark:bg-green-700/50',
        isTarget && 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 ring-2 ring-yellow-400',
        disabled && 'opacity-50 cursor-not-allowed',
        highContrast && 'border-[3px]'
      )}
      style={
        element.isFirstDiscovery && !isSelected && !isTarget
          ? {
              background: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)',
            }
          : undefined
      }
      whileTap={!disabled && !reduceMotion ? { scale: 0.95 } : undefined}
      initial={isNew && !reduceMotion ? { scale: 0, opacity: 0 } : false}
      animate={isNew && !reduceMotion ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      aria-label={`${element.name}${isSelected ? ' (selected)' : ''}${isNew ? ' (new)' : ''}`}
      aria-pressed={isSelected}
    >
      <span className={emojiSizes[size]} role="img" aria-hidden="true">
        {element.emoji}
      </span>
      <span className="whitespace-nowrap text-gray-900 dark:text-white">{element.name}</span>
    </motion.button>
  );
}

export default ElementChip;
