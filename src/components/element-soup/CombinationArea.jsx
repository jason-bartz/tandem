'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const LOADING_PHRASES = [
  'Transmuting elements...',
  'Harmonizing atoms...',
  'Summoning new compounds...',
  'Defying periodic table...',
  'Channeling elemental energy...',
  'Stirring primordial soup...',
  'Bending thermodynamics...',
  'Rewriting chemistry...',
  'Manifesting matter...',
  'Compressing possibility...',
  'Making something from nothing...',
  'Unlocking atomic secrets...',
  'Reshaping fundamental forces...',
  'Defying Newton...',
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
 * LoadingPhraseMarquee - Scrolling marquee of loading phrases
 */
function LoadingPhraseMarquee({ isActive }) {
  const { reduceMotion } = useTheme();
  const [shuffledPhrases, setShuffledPhrases] = useState([]);

  // Shuffle phrases when combining starts
  useEffect(() => {
    if (isActive) {
      setShuffledPhrases(shuffleArray(LOADING_PHRASES));
    }
  }, [isActive]);

  // Create the marquee text by joining all phrases
  const marqueeText = useMemo(() => {
    if (shuffledPhrases.length === 0) return '';
    return shuffledPhrases.join('   •   ');
  }, [shuffledPhrases]);

  if (!isActive || shuffledPhrases.length === 0) {
    return null;
  }

  // For reduced motion, just show a single phrase
  if (reduceMotion) {
    return <span className="truncate max-w-[120px]">{shuffledPhrases[0]}</span>;
  }

  return (
    <div className="overflow-hidden max-w-[140px] sm:max-w-[160px]">
      <motion.div
        className="whitespace-nowrap"
        animate={{
          x: ['15%', '-50%'],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 6,
            ease: 'linear',
          },
        }}
      >
        <span>{marqueeText}</span>
        <span className="px-3">•</span>
        <span>{marqueeText}</span>
      </motion.div>
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
 * SelectionSlot - Individual slot for selected element
 */
function SelectionSlot({ element, position, onClick, isCombining = false }) {
  const { highContrast, reduceMotion } = useTheme();

  // Wiggle and bang animation for combining
  const wiggleRotation = position === 'first' ? [-3, 3, -3, 3, 0] : [3, -3, 3, -3, 0];
  const bangDirection = position === 'first' ? 35 : -35;

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'w-24 h-24 sm:w-28 sm:h-28',
        'flex flex-col items-center justify-center',
        'bg-white dark:bg-gray-800',
        'border-[3px] border-black dark:border-gray-600',
        'rounded-xl',
        'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(75,85,99,1)]',
        'transition-colors duration-200',
        !element && 'border-dashed hover:border-soup-primary/70 hover:bg-soup-light/30',
        highContrast && 'border-[4px]'
      )}
      animate={
        !reduceMotion && isCombining
          ? {
              rotate: wiggleRotation,
              x: [0, 0, 0, 0, bangDirection],
              scale: [1, 1, 1, 1, 0.9],
            }
          : { rotate: 0, x: 0, scale: 1 }
      }
      transition={
        isCombining
          ? {
              duration: 0.5,
              times: [0, 0.2, 0.4, 0.6, 1],
              ease: 'easeInOut',
            }
          : {
              type: 'spring',
              stiffness: 400,
              damping: 15,
            }
      }
      whileHover={!reduceMotion && !isCombining ? { scale: 1.02 } : undefined}
      whileTap={!reduceMotion && !isCombining ? { scale: 0.98 } : undefined}
      aria-label={
        element ? `Selected: ${element.name}. Click to deselect.` : `Select ${position} element`
      }
    >
      <AnimatePresence mode="wait">
        {element ? (
          <motion.div
            key={element.id}
            initial={!reduceMotion ? { scale: 0, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            exit={!reduceMotion ? { scale: 0, opacity: 0 } : undefined}
            className="flex flex-col items-center overflow-hidden w-full px-1"
          >
            <span className="text-3xl sm:text-4xl mb-1">{element.emoji}</span>
            <ScrollingText
              text={element.name}
              className="text-xs sm:text-sm font-medium text-center text-gray-900 dark:text-white"
            />
          </motion.div>
        ) : (
          <motion.span
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-400 dark:text-gray-500 text-sm"
          >
            Select
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/**
 * CombinationArea - Area where elements are combined
 */
export function CombinationArea({
  selectedA,
  selectedB,
  onClearA,
  onClearB,
  onCombine,
  onClear,
  isCombining,
  isAnimating = false,
  disabled = false,
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
      {/* Selection Slots */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
        <SelectionSlot
          element={selectedA}
          position="first"
          onClick={onClearA}
          isCombining={isAnimating}
        />

        {/* Plus Sign */}
        <motion.div
          className="flex items-center justify-center w-8 h-8"
          animate={
            !reduceMotion && isAnimating
              ? { scale: [1, 1, 1, 1.5, 0.8], rotate: [0, 0, 0, 180, 180] }
              : { scale: 1, rotate: 0 }
          }
          transition={
            isAnimating
              ? { duration: 0.5, times: [0, 0.2, 0.6, 0.8, 1], ease: 'easeInOut' }
              : { duration: 0.3 }
          }
        >
          <Plus
            className={cn(
              'w-6 h-6 sm:w-8 sm:h-8',
              'text-gray-400 dark:text-gray-500',
              isAnimating && 'text-soup-primary',
              highContrast && 'text-hc-text'
            )}
            aria-hidden="true"
          />
        </motion.div>

        <SelectionSlot
          element={selectedB}
          position="second"
          onClick={onClearB}
          isCombining={isAnimating}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onClear}
          disabled={(!selectedA && !selectedB) || isCombining || isAnimating || disabled}
          className={cn(
            'flex-1 py-3',
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

        <motion.button
          onClick={onCombine}
          disabled={!canCombine}
          className={cn(
            'flex-1 py-3',
            'bg-soup-primary text-white',
            'border-[3px] border-black',
            'rounded-xl font-bold',
            'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
            'transition-all duration-150',
            'hover:bg-soup-hover',
            'hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            'active:translate-y-0 active:shadow-none',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] disabled:hover:bg-soup-primary',
            highContrast && 'border-[4px]'
          )}
          whileTap={canCombine && !reduceMotion ? { scale: 0.98 } : undefined}
          aria-label={
            isCombining
              ? 'Combining...'
              : canCombine
                ? `Combine ${selectedA?.name} and ${selectedB?.name}`
                : 'Select two elements to combine'
          }
        >
          {isCombining ? <LoadingPhraseMarquee isActive={isCombining} /> : 'Combine'}
        </motion.button>
      </div>
    </div>
  );
}

export default CombinationArea;
