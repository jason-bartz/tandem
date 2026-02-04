'use client';

import { memo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * ElementChip - Small clickable chip for displaying an element
 * Designed to fit many elements in a grid layout
 * Memoized to prevent unnecessary re-renders when parent updates
 *
 * Touch drag behavior:
 * - If touch moves less than threshold, treated as a tap (onClick fires)
 * - If touch moves more than threshold, treated as a drag (onTouchDragStart/Move/End fire)
 */
function ElementChipInner({
  element,
  isSelected = false,
  isNew = false,
  isTarget = false,
  isFavorite = false,
  onClick,
  disabled = false,
  size = 'default', // 'default' | 'small' | 'large'
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  // Touch drag handlers for mobile
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  touchDragThreshold = 10,
}) {
  const { highContrast, reduceMotion } = useTheme();

  // Touch tracking refs
  const touchStartPos = useRef(null);
  const hasDragged = useRef(false);

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

  // Touch event handlers for mobile drag
  const handleTouchStart = useCallback(
    (e) => {
      if (disabled || !draggable) return;

      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      hasDragged.current = false;
    },
    [disabled, draggable]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (disabled || !draggable || !touchStartPos.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if movement exceeds threshold
      if (distance >= touchDragThreshold) {
        if (!hasDragged.current) {
          // First time crossing threshold - initiate drag
          hasDragged.current = true;
          onTouchDragStart?.(element);
        }
        // Prevent scrolling while dragging
        e.preventDefault();
        // Notify parent of drag position
        onTouchDragMove?.(touch.clientX, touch.clientY);
      }
    },
    [disabled, draggable, touchDragThreshold, element, onTouchDragStart, onTouchDragMove]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (disabled) return;

      const didDrag = hasDragged.current;
      const touch = e.changedTouches[0];

      if (didDrag) {
        // End drag - notify parent with final position
        onTouchDragEnd?.(true, touch.clientX, touch.clientY);
      } else if (draggable) {
        // Was a tap, not a drag - trigger click
        // preventDefault stops the synthetic click event from firing (prevents double-selection on mobile)
        e.preventDefault();
        onClick?.(element);
      }

      // Reset touch state
      touchStartPos.current = null;
      hasDragged.current = false;
    },
    [disabled, draggable, element, onClick, onTouchDragEnd]
  );

  return (
    <motion.button
      onClick={() => !disabled && onClick?.(element)}
      disabled={disabled}
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Touch handlers for mobile drag with threshold
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        'relative inline-flex items-center justify-center flex-nowrap whitespace-nowrap',
        sizeClasses[size],
        !isSelected && !isTarget && !element.isFirstDiscovery && 'bg-white dark:bg-gray-800',
        element.isFirstDiscovery &&
          !isSelected &&
          !isTarget &&
          'bg-yellow-50 dark:bg-yellow-900/30',
        'border-[2px] border-black dark:border-gray-600',
        'rounded-lg',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
        'font-medium',
        'transition-all duration-150',
        !disabled && !draggable && 'cursor-pointer',
        draggable && !disabled && 'cursor-grab active:cursor-grabbing',
        !disabled && 'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
        !disabled && 'active:translate-y-0 active:shadow-none',
        isSelected && 'bg-[#ffce00] dark:bg-[#ffce00]/70',
        isTarget && 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 ring-2 ring-yellow-400',
        disabled && 'opacity-50 cursor-not-allowed',
        isDragging && 'opacity-50',
        highContrast && 'border-[3px]',
        // Prevent text selection during touch drag
        draggable && 'select-none'
      )}
      style={{
        // Allow vertical scrolling but enable our custom touch drag
        touchAction: draggable ? 'pan-y' : undefined,
        WebkitUserSelect: draggable ? 'none' : undefined,
      }}
      whileTap={!disabled && !reduceMotion ? { scale: 0.95 } : undefined}
      initial={isNew && !reduceMotion ? { scale: 0, opacity: 0 } : false}
      animate={isNew && !reduceMotion ? { scale: 1, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      aria-label={`${element.name}${isSelected ? ' (selected)' : ''}${isNew ? ' (new)' : ''}`}
      aria-pressed={isSelected}
    >
      {/* Gold shimmer effect for first discoveries */}
      {element.isFirstDiscovery && !isSelected && !isTarget && !reduceMotion && (
        <span
          className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none"
          aria-hidden="true"
        >
          <span
            className="absolute inset-0 -translate-x-full animate-[shimmer_5s_ease-in-out_infinite] will-change-transform"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            }}
          />
        </span>
      )}

      {/* Favorite star indicator - takes precedence over NEW badge */}
      {isFavorite && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'w-4 h-4 rounded-full',
            'bg-yellow-400 border border-yellow-600',
            'flex items-center justify-center',
            'shadow-sm'
          )}
        >
          <Star className="w-2.5 h-2.5 text-yellow-700 fill-yellow-700" />
        </span>
      )}
      {/* NEW badge for recently discovered elements (only if not a favorite) */}
      {isNew && !isFavorite && (
        <span
          className={cn(
            'absolute -top-1.5 -right-1.5',
            'px-1 py-0.5',
            'bg-purple-500 text-white',
            'text-[9px] font-bold leading-none',
            'rounded',
            'border border-purple-700',
            'shadow-sm'
          )}
        >
          NEW
        </span>
      )}
      <span className={cn(emojiSizes[size], 'flex-shrink-0')} role="img" aria-hidden="true">
        {element.emoji}
      </span>
      <span
        className={cn(
          'text-gray-900 dark:text-white',
          element.isFirstDiscovery &&
            !isSelected &&
            !isTarget &&
            'text-yellow-700 dark:text-yellow-400'
        )}
      >
        {element.name}
      </span>
    </motion.button>
  );
}

// Custom comparison function for memo - only re-render when meaningful props change
function arePropsEqual(prevProps, nextProps) {
  return (
    prevProps.element.id === nextProps.element.id &&
    prevProps.element.isFirstDiscovery === nextProps.element.isFirstDiscovery &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isNew === nextProps.isNew &&
    prevProps.isTarget === nextProps.isTarget &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.size === nextProps.size &&
    prevProps.draggable === nextProps.draggable &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.touchDragThreshold === nextProps.touchDragThreshold
  );
}

export const ElementChip = memo(ElementChipInner, arePropsEqual);

export default ElementChip;
