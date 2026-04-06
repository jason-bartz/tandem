'use client';

import { memo, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

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
  // Whether this element was added by a co-op partner
  fromPartner = false,
  // Touch drag handlers for mobile (deprecated but kept for backwards compatibility)
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  touchDragThreshold: _touchDragThreshold = 10, // eslint-disable-line no-unused-vars
  // Disable all framer-motion animations
  disableAnimations = false,
  // Keyboard navigation
  kbIndex = -1, // Index in element bank for keyboard nav
  isKeyboardFocused = false, // Whether this chip has keyboard focus
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
  const [showFavFlash, setShowFavFlash] = useState(false);

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
            // Show favorite flash indicator
            setShowFavFlash(true);
            // Reset pop state after animation
            setTimeout(() => {
              setIsLongPressPop(false);
              setIsHoldReady(false);
            }, 200);
            setTimeout(() => {
              setShowFavFlash(false);
            }, 800);
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

        // Only enter drag mode if hold timer already completed (isHoldReady was true)
        // This allows normal scrolling to work without blocking
        if (!hasDragged.current && isHoldReady) {
          hasDragged.current = true;
          onTouchDragStart?.(element);
        }

        // Reset hold ready state after checking it
        setIsHoldReady(false);

        // Prevent scrolling ONLY while actively dragging (after hold delay completed)
        if (draggable && hasDragged.current) {
          e.preventDefault();
          onTouchDragMove?.(touch.clientX, touch.clientY);
        }
      }
    },
    [disabled, draggable, element, onTouchDragStart, onTouchDragMove, isHoldReady]
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
      // Always reset visual state on touch end to prevent stuck pressed state
      setIsHoldReady(false);
      setIsLongPressPop(false);
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
      // Keyboard navigation index for scroll-into-view
      data-kb-index={kbIndex >= 0 ? kbIndex : undefined}
      className={cn(
        'relative inline-flex items-center justify-center flex-nowrap whitespace-nowrap',
        sizeClasses[size],
        !isSelected && !isTarget && 'bg-bg-card dark:bg-gray-800',
        'dark:border-gray-600',
        'rounded-lg',
        'dark:',
        'font-medium',
        'transition-[box-shadow,background-color,border-color,color,opacity] duration-150',
        !disabled && !draggable && 'cursor-pointer',
        draggable && !disabled && 'cursor-grab active:cursor-grabbing',
        !disabled && ' hover:',
        isSelected &&
          'bg-accent-yellow dark:bg-accent-yellow/30 dark:border-accent-yellow dark:border-[1.5px]',
        isTarget && 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 ring-2 ring-yellow-400',
        disabled && 'opacity-50 cursor-not-allowed',
        isDragging && 'opacity-50',
        highContrast && 'border-2',
        // Prevent text selection during touch drag
        draggable && 'select-none',
        // Keyboard focus ring
        isKeyboardFocused && 'ring-2 ring-soup-primary ring-offset-1'
      )}
      style={{
        // manipulation allows tap and scroll but disables double-tap zoom
        // This makes touch interactions more responsive on mobile
        touchAction: draggable ? 'manipulation' : undefined,
        WebkitUserSelect: draggable ? 'none' : undefined,
        // Prevent Safari's native long-press callout/drag preview (causes double-image ghost)
        WebkitTouchCallout: 'none',
      }}
      whileTap={!disabled && !reduceMotion && !disableAnimations ? { scale: 0.98 } : undefined}
      initial={isNew && !reduceMotion && !disableAnimations ? { scale: 0.3, opacity: 0 } : false}
      animate={
        // Long press "pop" animation for favorites feedback (bigger pop)
        isLongPressPop && !reduceMotion && !disableAnimations
          ? { scale: 1.15, y: -4 }
          : // Hold-ready "pop" animation takes precedence for drag feedback
            isHoldReady && !reduceMotion && !disableAnimations
            ? { scale: 1.08, y: -2 }
            : isNew && !reduceMotion && !disableAnimations
              ? { scale: [0.3, 1.07, 0.97, 1], opacity: 1 }
              : { scale: 1, y: 0 }
      }
      transition={
        isLongPressPop
          ? { type: 'spring', stiffness: 400, damping: 15 }
          : isHoldReady
            ? { type: 'spring', stiffness: 400, damping: 15 }
            : isNew && !disableAnimations
              ? {
                  scale: { duration: 0.2, times: [0, 0.5, 0.8, 1], ease: 'easeOut' },
                  opacity: { duration: 0.1 },
                }
              : !disableAnimations
                ? { type: 'spring', stiffness: 300, damping: 20 }
                : undefined
      }
      aria-label={`${element.name}${isSelected ? ' (selected)' : ''}${isNew ? ' (new)' : ''}`}
      aria-pressed={isSelected}
    >
      {/* Golden gradient background for first discoveries (light mode only) */}
      {element.isFirstDiscovery && !isSelected && !isTarget && (
        <span
          className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-br from-amber-100/60 to-yellow-50/80 dark:bg-none"
          aria-hidden="true"
        />
      )}

      {/* Faint purple gradient for partner elements (light mode only) */}
      {fromPartner && !element.isFirstDiscovery && !isSelected && !isTarget && (
        <span
          className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-br from-indigo-100/80 to-purple-100/60 dark:from-indigo-900/30 dark:to-purple-900/20"
          aria-hidden="true"
        />
      )}

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

      {/* Favorite flash overlay */}
      {showFavFlash && (
        <span
          className={cn(
            'absolute inset-0 rounded-lg pointer-events-none z-20',
            'flex items-center justify-center',
            'bg-accent-green/20 dark:bg-accent-green/30',
            'animate-fade-in'
          )}
          aria-hidden="true"
        >
          <span className="text-xs font-bold text-soup-dark dark:text-accent-green">
            {isFavorite ? '★' : '☆'}
          </span>
        </span>
      )}

      {/* Favorite indicator - takes precedence over NEW badge */}
      {isFavorite && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'w-3 h-3 rounded-full',
            'bg-accent-green',
            'flex items-center justify-center',
            'text-[7px] leading-none text-white'
          )}
        >
          ★
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
            'border border-purple-700'
          )}
        >
          NEW
        </span>
      )}
      <span
        className={cn(emojiSizes[size], 'relative z-10 flex-shrink-0')}
        role="img"
        aria-hidden="true"
      >
        {element.emoji}
      </span>
      <span
        className={cn(
          'relative z-10 text-gray-900 dark:text-white',
          isSelected && 'dark:text-accent-yellow'
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
    prevProps.fromPartner === nextProps.fromPartner &&
    prevProps.isKeyboardFocused === nextProps.isKeyboardFocused
  );
}

export const ElementChip = memo(ElementChipInner, arePropsEqual);

export default ElementChip;
