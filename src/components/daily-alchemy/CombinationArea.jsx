'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { playSwitchClickSound } from '@/lib/sounds';

const COMBINE_ICONS = [
  'biohazard',
  'book-dead',
  'castle',
  'cat-space',
  'cauldron',
  'crab',
  'crystal-ball',
  'dice-d20',
  'disease',
  'dna',
  'dolphin',
  'explosion',
  'flask',
  'ghost',
  'hat-wizard',
  'hockey-mask',
  'industrial-pollution',
  'magic-wand',
  'meteor',
  'octopus',
  'physics',
  'planet-ringed',
  'shrimp',
  'snail',
  'spaghetti-monster-flying',
  'staff-wizard',
  'story-book',
  'sword',
  't-rex',
  'telescope',
  'tubes',
  'ufo',
  'unicorn',
  'user-alien',
  'user-robot',
  'wave',
  'whale',
  'yin-yang',
];

/**
 * Shuffles array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * CombineIconCycler - Cycles through icons with a spin transition
 */
function CombineIconCycler({ isActive }) {
  const { reduceMotion } = useTheme();
  const [currentIcon, setCurrentIcon] = useState(COMBINE_ICONS[0]);
  const [iconKey, setIconKey] = useState(0);
  const queueRef = useRef([]);
  const lastIconRef = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    // Initialize queue and show first icon
    queueRef.current = shuffleArray(COMBINE_ICONS);
    const first = queueRef.current.shift();
    lastIconRef.current = first;
    setCurrentIcon(first);
    setIconKey(0);

    const interval = setInterval(() => {
      // Reshuffle when exhausted, avoiding repeat at boundary
      if (queueRef.current.length === 0) {
        const newQueue = shuffleArray(COMBINE_ICONS);
        if (newQueue[0] === lastIconRef.current) {
          newQueue.push(newQueue.shift());
        }
        queueRef.current = newQueue;
      }
      const next = queueRef.current.shift();
      lastIconRef.current = next;
      setCurrentIcon(next);
      setIconKey((k) => k + 1);
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  if (reduceMotion) {
    return (
      <img
        src={`/game/daily-alchemy/combine-icons/${currentIcon}.webp`}
        alt=""
        className="w-5 h-5"
      />
    );
  }

  return (
    <div className="relative w-5 h-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={iconKey}
          initial={{ opacity: 0, rotate: -180, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 180, scale: 0.5 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={`/game/daily-alchemy/combine-icons/${currentIcon}.webp`}
            alt=""
            className="w-5 h-5"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * ScrollingText - Auto-scrolls text if it overflows
 */
function ScrollingText({ text, className }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const { reduceMotion } = useTheme();

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      setShouldScroll(textWidth > containerWidth);
    }
  }, [text]);

  // If reduce motion or no scroll needed, just show truncated text
  if (reduceMotion || !shouldScroll) {
    return (
      <div ref={containerRef} className={cn('overflow-hidden w-full', className)}>
        <span ref={textRef} className="block truncate">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('overflow-hidden w-full', className)}>
      <motion.span
        ref={textRef}
        className="inline-block whitespace-nowrap"
        animate={{
          x: ['0%', '-50%'],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: Math.max(text.length * 0.3, 6),
            ease: 'linear',
          },
        }}
      >
        {text}
        <span className="px-4">•</span>
        {text}
      </motion.span>
    </div>
  );
}

/**
 * Count the number of visible emoji/grapheme clusters in a string
 * Uses Intl.Segmenter when available, falls back to spread operator
 */
function countGraphemes(str) {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(str)].length;
  }
  // Fallback: spread operator handles most emoji correctly
  return [...str].length;
}

/**
 * SelectionSlot - Individual slot for selected element
 * Supports drag-and-drop to add elements
 */
function SelectionSlot({
  element,
  position,
  onClick,
  isShaking = false,
  onDrop,
  disabled = false,
  isActive = false,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);

  // Wobble animation - alternates left/right with rotation
  const wobbleDirection = position === 'first' ? 1 : -1;

  // Determine emoji size based on grapheme count
  const emojiCount = element?.emoji ? countGraphemes(element.emoji) : 1;
  const isMultiEmoji = emojiCount >= 3;

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.elementName && onDrop) {
          onDrop(data.elementName, position);
        }
      } catch {
        // Invalid data
      }
    },
    [disabled, onDrop, position]
  );

  return (
    <motion.button
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'w-24 h-24 sm:w-28 sm:h-28 shrink-0',
        'flex flex-col items-center justify-center',
        'bg-white dark:bg-gray-800',
        'border-[3px] border-black dark:border-gray-600',
        'rounded-xl',
        // Only show shadow when element is present
        element && 'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(75,85,99,1)]',
        !element && 'border-dashed hover:border-soup-primary/70 hover:bg-soup-light/30',
        isDragOver && !element && 'border-soup-primary bg-soup-light/50 scale-105',
        // Active slot highlight
        isActive && 'ring-[3px] ring-soup-primary ring-offset-1',
        highContrast && 'border-[4px]'
      )}
      animate={
        !reduceMotion && isShaking
          ? {
              x: [
                0,
                6 * wobbleDirection,
                -6 * wobbleDirection,
                5 * wobbleDirection,
                -5 * wobbleDirection,
                0,
              ],
              rotate: [
                0,
                3 * wobbleDirection,
                -3 * wobbleDirection,
                2 * wobbleDirection,
                -2 * wobbleDirection,
                0,
              ],
              scale: [1, 0.98, 0.98, 0.97, 0.98, 0.97],
            }
          : { x: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={
        isShaking
          ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 300, damping: 20 }
      }
      whileHover={!reduceMotion && !isShaking ? { scale: 1.02 } : undefined}
      whileTap={!reduceMotion && !isShaking ? { scale: 0.98 } : undefined}
      aria-label={
        element
          ? `Selected: ${element.name}. Click to target this slot.`
          : `Select ${position} element`
      }
    >
      {element ? (
        <div className="flex flex-col items-center overflow-hidden w-full px-1">
          <span
            className={cn('mb-1', isMultiEmoji ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl')}
          >
            {element.emoji}
          </span>
          <ScrollingText
            text={element.name}
            className="text-xs sm:text-sm font-medium text-center text-gray-900 dark:text-white"
          />
        </div>
      ) : (
        <span className="text-gray-400 dark:text-gray-500 text-sm">Select</span>
      )}
    </motion.button>
  );
}

/**
 * CombinationArea - Area where elements are combined
 * Supports drag-and-drop to add elements to slots
 */
export function CombinationArea({
  selectedA,
  selectedB,
  onSelectSlot, // Callback when slot is clicked: (position) => void
  onCombine,
  onClear,
  isCombining,
  isAnimating = false,
  disabled = false,
  combinationError = null,
  onDropElement, // Callback when element is dropped: (elementName, position) => void
  hintMessage = null, // Current hint message to display
  onDismissHint, // Callback to dismiss hint message
  // Subtraction mode
  isSubtractMode = false,
  onToggleOperator, // Callback to toggle between + and -
  freePlayMode = false,
  // Active slot
  activeSlot = null, // 'first' | 'second' | null
}) {
  const { highContrast, reduceMotion } = useTheme();

  const canCombine = selectedA && selectedB && !isCombining && !isAnimating && !disabled;

  return (
    <div
      className={cn(
        'p-4 sm:p-6',
        'bg-soup-light/50 dark:bg-soup-primary/10',
        'border-[3px] border-black dark:border-gray-600',
        'rounded-2xl',
        'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(75,85,99,1)]',
        highContrast && 'border-[4px] border-hc-border'
      )}
    >
      {/* Inline Error Message */}
      <AnimatePresence>
        {combinationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'mb-3 px-4 py-2',
              'bg-amber-50 dark:bg-amber-900/30',
              'border-2 border-amber-300 dark:border-amber-600',
              'rounded-xl',
              'text-amber-700 dark:text-amber-300',
              'text-sm text-center font-medium'
            )}
          >
            {combinationError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint Message Banner - styled to match Daily Tandem */}
      <AnimatePresence>
        {hintMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mb-3"
          >
            <div
              className={cn(
                'px-3 py-2 sm:px-4 sm:py-3',
                'rounded-xl sm:rounded-2xl',
                'border-[3px]',
                highContrast
                  ? 'bg-hc-warning border-hc-warning shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                  : 'bg-accent-yellow dark:bg-yellow-600 border-accent-yellow dark:border-yellow-700 shadow-[3px_3px_0px_rgba(0,0,0,0.3)]',
                'flex items-start gap-2'
              )}
            >
              <Image
                src="/ui/shared/hint.png"
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 flex-shrink-0 mt-0.5"
              />
              <p
                className={cn(
                  'text-sm sm:text-base flex-1 leading-relaxed',
                  highContrast
                    ? 'text-hc-text font-bold'
                    : 'text-gray-900 dark:text-gray-100 font-semibold'
                )}
              >
                {hintMessage}
              </p>
              {onDismissHint && (
                <button
                  onClick={onDismissHint}
                  className={cn(
                    'p-1 sm:p-1.5 rounded-lg transition-colors flex-shrink-0',
                    highContrast
                      ? 'hover:bg-hc-surface focus:bg-hc-surface'
                      : 'hover:bg-yellow-500 dark:hover:bg-yellow-700 focus:bg-yellow-500 dark:focus:bg-yellow-700',
                    'focus:outline-none focus:ring-2 focus:ring-yellow-800'
                  )}
                  aria-label="Dismiss hint"
                >
                  <X
                    className={cn(
                      'w-4 h-4',
                      highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                    )}
                  />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Slots */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
        <SelectionSlot
          element={selectedA}
          position="first"
          onClick={() => onSelectSlot?.('first')}
          isShaking={isCombining || isAnimating}
          onDrop={onDropElement}
          disabled={disabled || isCombining || isAnimating}
          isActive={activeSlot === 'first'}
        />

        {/* Operator - Segmented pill toggle in Creative Mode, static icon otherwise */}
        {freePlayMode ? (
          <div
            className={cn(
              'flex items-center shrink-0',
              'border-[3px] border-black dark:border-gray-600 rounded-lg',
              'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
              'overflow-hidden',
              // Force GPU compositing so Safari maintains overflow clip during color transitions
              '[backface-visibility:hidden]',
              highContrast && 'border-[4px]'
            )}
          >
            <button
              type="button"
              onClick={() => {
                if (!isCombining && !isAnimating && isSubtractMode) {
                  playSwitchClickSound();
                  onToggleOperator?.();
                }
              }}
              disabled={isCombining || isAnimating}
              className={cn(
                'w-8 h-8 flex items-center justify-center transition-colors duration-200',
                !isSubtractMode
                  ? 'bg-soup-primary text-black'
                  : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600',
                'disabled:cursor-not-allowed'
              )}
              aria-label="Switch to combine mode"
              aria-pressed={!isSubtractMode}
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="w-[2px] bg-black dark:bg-gray-600 self-stretch" />
            <button
              type="button"
              onClick={() => {
                if (!isCombining && !isAnimating && !isSubtractMode) {
                  playSwitchClickSound();
                  onToggleOperator?.();
                }
              }}
              disabled={isCombining || isAnimating}
              className={cn(
                'w-8 h-8 flex items-center justify-center transition-colors duration-200',
                isSubtractMode
                  ? 'bg-red-400 dark:bg-red-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600',
                'disabled:cursor-not-allowed'
              )}
              aria-label="Switch to subtract mode"
              aria-pressed={isSubtractMode}
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <motion.div
            className="flex items-center justify-center w-8 h-8 shrink-0"
            animate={
              !reduceMotion && (isCombining || isAnimating)
                ? { scale: 1.3, rotate: 180 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Plus
              className={cn(
                'w-6 h-6 sm:w-8 sm:h-8',
                'text-gray-400 dark:text-gray-500',
                (isCombining || isAnimating) && 'text-soup-primary',
                highContrast && 'text-hc-text'
              )}
            />
          </motion.div>
        )}

        <SelectionSlot
          element={selectedB}
          position="second"
          onClick={() => onSelectSlot?.('second')}
          isShaking={isCombining || isAnimating}
          onDrop={onDropElement}
          disabled={disabled || isCombining || isAnimating}
          isActive={activeSlot === 'second'}
        />
      </div>

      {/* Action Buttons - aligned to match element slots above */}
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={onClear}
          disabled={(!selectedA && !selectedB) || isCombining || isAnimating || disabled}
          className={cn(
            'w-[96px] sm:w-[112px] shrink-0 grow-0 py-1.5 sm:py-3',
            'bg-gray-200 dark:bg-gray-700',
            'border-[3px] border-black dark:border-gray-600',
            'rounded-xl font-bold',
            'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(75,85,99,1)]',
            'transition-all duration-150',
            'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            'active:translate-y-0 active:shadow-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
            'text-gray-900 dark:text-white',
            highContrast && 'border-[4px]'
          )}
          aria-label="Clear selections"
        >
          Clear
        </button>

        {/* Spacer matching operator toggle width */}
        <div className={cn('shrink-0', freePlayMode ? 'w-[70px]' : 'w-8')} aria-hidden="true" />

        <motion.button
          onClick={() => canCombine && onCombine()}
          disabled={!canCombine && !isCombining && !isAnimating}
          className={cn(
            'w-[96px] sm:w-[112px] shrink-0 grow-0 py-1.5 sm:py-3',
            'border-[3px] border-black',
            'rounded-xl font-bold',
            'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
            'transition-all duration-200',
            'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            'active:translate-y-0 active:shadow-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
            'overflow-hidden',
            isSubtractMode
              ? 'bg-red-400 dark:bg-red-500 text-white hover:bg-red-500 dark:hover:bg-red-600 disabled:hover:bg-red-400 dark:disabled:hover:bg-red-500'
              : 'bg-soup-primary text-black hover:bg-soup-hover disabled:hover:bg-soup-primary',
            highContrast && 'border-[4px]'
          )}
          animate={{ scale: 1 }}
          whileTap={canCombine && !reduceMotion ? { scale: 0.98 } : undefined}
          aria-label={
            isCombining || isAnimating
              ? isSubtractMode
                ? 'Subtracting...'
                : 'Combining...'
              : canCombine
                ? isSubtractMode
                  ? `Subtract ${selectedB?.name} from ${selectedA?.name}`
                  : `Combine ${selectedA?.name} and ${selectedB?.name}`
                : isSubtractMode
                  ? 'Select two elements to subtract'
                  : 'Select two elements to combine'
          }
        >
          <span className="flex items-center justify-center">
            {isCombining ? (
              <CombineIconCycler isActive={isCombining} />
            ) : isSubtractMode ? (
              'Subtract'
            ) : (
              'Combine'
            )}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

export default CombinationArea;
