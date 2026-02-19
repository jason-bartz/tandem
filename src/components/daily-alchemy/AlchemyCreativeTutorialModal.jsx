'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';

const TUTORIAL_STEPS = [
  {
    image: '/game/daily-alchemy/creative-howto/1.webp',
    caption: 'Select two elements to combine — be creative! Tap Combine when ready.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/2.webp',
    caption: 'Swipe up to use your new element immediately, or swipe down to select new elements.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/3.webp',
    caption: 'Flip the switch to subtract one element from another for even more possibilities.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/4.webp',
    caption: 'Save up to 12 of your favorite elements to use often.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/5.webp',
    caption: 'Get creative with your combinations — there are infinite possibilities.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/6.webp',
    caption: 'Create something new and claim a First Discovery as the first player to create it.',
  },
  {
    image: '/game/daily-alchemy/creative-howto/7.webp',
    caption: 'Experiment! Use three save slots to try different things out.',
  },
];

const STORAGE_KEY = 'soupCreativeTutorialDismissed';

/**
 * AlchemyCreativeTutorialModal - Step-by-step tutorial for Creative Mode,
 * shown on first visit to Creative Mode.
 */
export default function AlchemyCreativeTutorialModal({ onClose: onCloseProp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { reduceMotion, highContrast } = useTheme();
  const { lightTap } = useHaptics();

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== 'true') {
      setIsOpen(true);
    } else {
      onCloseProp?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    lightTap();
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onCloseProp?.();
  }, [lightTap, onCloseProp]);

  const handleNext = useCallback(() => {
    lightTap();
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, handleClose, lightTap]);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={handleNext}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'relative w-full max-w-[340px] flex flex-col rounded-2xl overflow-hidden',
              'border-[3px] shadow-[4px_4px_0px_rgba(0,0,0,1)]',
              highContrast
                ? 'bg-hc-surface border-hc-border'
                : 'bg-white dark:bg-gray-800 border-black'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image container — fixed aspect ratio for consistent sizing */}
            <div className="relative w-full" style={{ aspectRatio: '9 / 16' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={step.image}
                    alt={`Step ${currentStep + 1}`}
                    fill
                    className="object-cover"
                    sizes="340px"
                    priority={currentStep === 0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Caption & controls — fixed height so card doesn't shift */}
            <div className="flex flex-col items-center px-5 pt-4 pb-5" style={{ minHeight: 160 }}>
              {/* Step indicator dots */}
              <div className="flex items-center gap-2 mb-3">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'rounded-full transition-all duration-200',
                      i === currentStep
                        ? cn('w-2.5 h-2.5', highContrast ? 'bg-hc-text' : 'bg-green-500')
                        : cn(
                            'w-2 h-2',
                            highContrast ? 'bg-hc-border' : 'bg-gray-300 dark:bg-gray-600'
                          )
                    )}
                  />
                ))}
              </div>

              {/* Caption text */}
              <p
                className={cn(
                  'text-center text-sm leading-relaxed font-medium flex-1 flex items-center',
                  highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-200'
                )}
              >
                {step.caption}
              </p>

              {/* Next / Let's Play button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className={cn(
                  'mt-3 w-full py-2.5 rounded-xl font-bold text-sm',
                  'border-[3px] border-black',
                  'shadow-[3px_3px_0px_rgba(0,0,0,1)]',
                  'active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)]',
                  'transition-all duration-100',
                  highContrast
                    ? 'bg-hc-surface text-hc-text hover:bg-hc-border/20'
                    : isLastStep
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100'
                )}
              >
                {isLastStep ? "Let's Go!" : 'Next'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
