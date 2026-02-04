'use client';

import { memo, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

// Hold duration in ms before element is ready to drag (150ms = quick response)
const TOUCH_HOLD_DURATION = 150;
// Long press duration for favorites (shorter than typical long press for snappy feel)
const LONG_PRESS_DURATION = 300;

/**
 * ElementChip - Small clickable chip for displaying an element
 * Designed to fit many elements in a grid layout
 * Memoized to prevent unnecessary re-renders when parent updates
 *
 * Touch behavior:
 * - Quick tap: treated as click (onClick fires)
 * - Long press (300ms): triggers onLongPress (favorites toggle) with pop animation
 * - Desktop drag: standard drag-and-drop still works
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
  // Long press handler for favorites
  onLongPress,
  // Touch drag handlers for mobile (deprecated but kept for backwards compatibility)
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  touchDragThreshold: _touchDragThreshold = 10, // eslint-disable-line no-unused-vars
  // Disable all framer-motion animations
  disableAnimations = false,
}) {
  const { highContrast, reduceMotion } = useTheme();

  // Touch tracking refs for drag detection
  const touchStartPos = useRef(null);
  const hasDragged = useRef(false);
  const holdTimeoutRef = useRef(null);
  const longPressTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  // Visual state for hold-to-drag feedback and long press pop
  const [isHoldReady, setIsHoldReady] = useState(false);
  const [isLongPressPop, setIsLongPressPop] = useState(false);

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

  // Touch event handlers for mobile with long press to favorite
  const handleTouchStart = useCallback(
    (e) => {
      if (disabled) return;

      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      hasDragged.current = false;
      longPressTriggeredRef.current = false;
      setIsHoldReady(false);
      setIsLongPressPop(false);

      // Start hold timer for visual feedback
      if (draggable) {
        holdTimeoutRef.current = setTimeout(() => {
          setIsHoldReady(true);
        }, TOUCH_HOLD_DURATION);
      }

      // Start long press timer for favorites
      if (onLongPress) {
        longPressTimeoutRef.current = setTimeout(() => {
          // Only trigger if we haven't moved significantly
          if (!hasDragged.current && !longPressTriggeredRef.current) {
            longPressTriggeredRef.current = true;
            setIsLongPressPop(true);
            onLongPress(element);
            // Reset pop state after animation
            setTimeout(() => {
              setIsLongPressPop(false);
              setIsHoldReady(false);
            }, 200);
          }
        }, LONG_PRESS_DURATION);
      }
    },
    [disabled, draggable, onLongPress, element]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (disabled || !touchStartPos.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Movement threshold to cancel long press
      const movementThreshold = 10;

      // Check if movement exceeds threshold - cancel long press
      if (distance >= movementThreshold) {
        // Clear all timers - movement cancels long press
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = null;
        }
        setIsHoldReady(false);

        if (!hasDragged.current) {
          hasDragged.current = true;
          onTouchDragStart?.(element);
        }
        // Prevent scrolling while dragging
        if (draggable) {
          e.preventDefault();
          onTouchDragMove?.(touch.clientX, touch.clientY);
        }
      }
    },
    [disabled, draggable, element, onTouchDragStart, onTouchDragMove]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      // Clear all timers
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      if (disabled) {
        setIsHoldReady(false);
        setIsLongPressPop(false);
        return;
      }

      const didDrag = hasDragged.current;
      const didLongPress = longPressTriggeredRef.current;
      const touch = e.changedTouches[0];

      if (didDrag && draggable) {
        // End drag - notify parent with final position
        onTouchDragEnd?.(true, touch.clientX, touch.clientY);
      }
      // For taps (no drag, no long press), we do nothing here - let the native click event handle it
      // This avoids double-firing onClick on mobile

      // Reset touch state
      touchStartPos.current = null;
      hasDragged.current = false;
      longPressTriggeredRef.current = false;
      // Only reset visual state if long press wasn't triggered (it handles its own reset)
      if (!didLongPress) {
        setIsHoldReady(false);
      }
    },
    [disabled, draggable, onTouchDragEnd]
  );

  return (
    <motion.button
      onClick={() => !disabled && onClick?.(element)}
      disabled={disabled}
      draggable={draggable && !disabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Touch handlers for mobile drag with hold detection
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
        // manipulation allows tap and scroll but disables double-tap zoom
        // This makes touch interactions more responsive on mobile
        touchAction: draggable ? 'manipulation' : undefined,
        WebkitUserSelect: draggable ? 'none' : undefined,
      }}
      whileTap={!disabled && !reduceMotion && !disableAnimations ? { scale: 0.95 } : undefined}
      initial={isNew && !reduceMotion && !disableAnimations ? { scale: 0, opacity: 0 } : false}
      animate={
        // Long press "pop" animation for favorites feedback (bigger pop)
        isLongPressPop && !reduceMotion && !disableAnimations
          ? { scale: 1.15, y: -4 }
          : // Hold-ready "pop" animation takes precedence for drag feedback
            isHoldReady && !reduceMotion && !disableAnimations
            ? { scale: 1.08, y: -2 }
            : isNew && !reduceMotion && !disableAnimations
              ? { scale: 1, opacity: 1 }
              : { scale: 1, y: 0 }
      }
      transition={
        isLongPressPop
          ? { type: 'spring', stiffness: 500, damping: 12 }
          : isHoldReady
            ? { type: 'spring', stiffness: 400, damping: 15 }
            : !disableAnimations
              ? { type: 'spring', stiffness: 500, damping: 25 }
              : undefined
      }
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
    prevProps.touchDragThreshold === nextProps.touchDragThreshold &&
    prevProps.disableAnimations === nextProps.disableAnimations &&
    prevProps.onLongPress === nextProps.onLongPress
  );
}

export const ElementChip = memo(ElementChipInner, arePropsEqual);

export default ElementChip;
