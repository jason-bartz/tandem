'use client';

import Image from 'next/image';
import { ArrowDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import LeftSidePanel from '@/components/shared/LeftSidePanel';
import { cn } from '@/lib/utils';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * Get emoji for an element name
 * Checks starter elements first, then uses a fallback
 */
function getElementEmoji(elementName) {
  const starter = STARTER_ELEMENTS.find((e) => e.name.toLowerCase() === elementName.toLowerCase());
  return starter?.emoji || null;
}

/**
 * CombinationStep - Shows a single step in the solution path
 */
function CombinationStep({ step, stepNumber, isLast, emojiMap }) {
  const { highContrast } = useTheme();
  const elementAEmoji = emojiMap[step.elementA?.toLowerCase()] || getElementEmoji(step.elementA);
  const elementBEmoji = emojiMap[step.elementB?.toLowerCase()] || getElementEmoji(step.elementB);
  const resultEmoji = emojiMap[step.result?.toLowerCase()] || getElementEmoji(step.result);

  return (
    <div className="flex flex-col items-center">
      {/* Step indicator */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center mb-3',
          'bg-soup-primary text-white font-bold text-sm',
          'border-2',
          ''
        )}
      >
        {stepNumber}
      </div>

      {/* Combination row */}
      <div className="flex items-center justify-center gap-2 w-full">
        {/* Element A */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-2',
            'bg-bg-card dark:bg-gray-800',
            'dark:border-gray-600',
            'rounded-lg',
            '',
            highContrast && 'border-2 border-hc-border'
          )}
        >
          {elementAEmoji && <span className="text-lg">{elementAEmoji}</span>}
          <span className="text-sm font-medium text-gray-900 dark:text-white">{step.elementA}</span>
        </div>

        {/* Plus sign */}
        <span className="text-gray-400 font-bold text-lg">+</span>

        {/* Element B */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 py-2',
            'bg-bg-card dark:bg-gray-800',
            'dark:border-gray-600',
            'rounded-lg',
            '',
            highContrast && 'border-2 border-hc-border'
          )}
        >
          {elementBEmoji && <span className="text-lg">{elementBEmoji}</span>}
          <span className="text-sm font-medium text-gray-900 dark:text-white">{step.elementB}</span>
        </div>
      </div>

      {/* Arrow down */}
      <ArrowDown className="w-5 h-5 text-gray-400 my-2" />

      {/* Result */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5',
          isLast
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40'
            : 'bg-gray-50 dark:bg-gray-700/50',
          'dark:border-gray-600',
          'rounded-xl',
          isLast ? '' : '',
          highContrast && 'border-2 border-hc-border'
        )}
      >
        {resultEmoji && <span className={cn('text-xl', isLast && 'text-2xl')}>{resultEmoji}</span>}
        <span
          className={cn(
            'font-bold text-gray-900 dark:text-white',
            isLast ? 'text-lg' : 'text-base'
          )}
        >
          {step.result}
        </span>
        {isLast && (
          <span className="ml-1 text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
            Target
          </span>
        )}
      </div>

      {/* Connector line (except for last step) */}
      {!isLast && <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600 my-2" />}
    </div>
  );
}

/**
 * SolutionPathModal - Shows the shortest path to reach the target element
 * Used when player fails (time runs out) to reveal the solution
 */
export default function SolutionPathModal({
  isOpen,
  onClose,
  solutionPath,
  targetElement,
  targetEmoji,
}) {
  const { highContrast } = useTheme();

  // Build emoji map from the solution path results
  // This helps us show emojis for intermediate elements
  // Since each step's result can be an input for later steps, we build the map
  // so emojis cascade through the path
  const emojiMap = {};
  if (solutionPath) {
    solutionPath.forEach((step) => {
      // If this step contains emoji info, store it
      // Check both 'emoji' (database format) and 'resultEmoji' (alternative format)
      const resultEmoji = step.emoji || step.resultEmoji;
      if (resultEmoji) {
        emojiMap[step.result?.toLowerCase()] = resultEmoji;
      }
      if (step.elementAEmoji) {
        emojiMap[step.elementA?.toLowerCase()] = step.elementAEmoji;
      }
      if (step.elementBEmoji) {
        emojiMap[step.elementB?.toLowerCase()] = step.elementBEmoji;
      }
    });
    // Add target emoji
    if (targetElement && targetEmoji) {
      emojiMap[targetElement.toLowerCase()] = targetEmoji;
    }
  }

  return (
    <LeftSidePanel
      isOpen={isOpen}
      onClose={onClose}
      title="Solution Path"
      maxWidth="500px"
      headerClassName="border-b-0"
      contentClassName="p-0 relative"
      footer={
        <button
          onClick={onClose}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-lg transition-all',
            'bg-soup-primary text-white',
            '',
            '',
            ' hover:',
            '',
            highContrast && 'bg-hc-primary border-hc-border'
          )}
        >
          Got It
        </button>
      }
    >
      {/* Game name header with icon - hidden on standalone */}
      {!isStandaloneAlchemy && (
        <div
          className={cn(
            'px-6 py-3 border-b-[3px] border-gray-200 dark:border-gray-700',
            highContrast ? 'bg-hc-success/20' : 'bg-green-500/30 dark:bg-green-500/30'
          )}
        >
          <div className="flex items-center gap-2">
            <Image src="/ui/games/daily-alchemy.png" alt="" width={20} height={20} />
            <p
              className={cn(
                'text-sm font-semibold',
                highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-200'
              )}
            >
              Daily Alchemy
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!solutionPath || solutionPath.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Solution path not available</p>
          </div>
        ) : (
          <>
            {/* Description */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Here&apos;s just one path to reach{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {targetEmoji} {targetElement}
                </span>
                . Try again tomorrow, the number of combinations are infinite!
              </p>
            </div>

            {/* Solution path steps */}
            <div className="flex flex-col items-center pb-4">
              {solutionPath.map((step, index) => (
                <CombinationStep
                  key={index}
                  step={step}
                  stepNumber={index + 1}
                  isLast={index === solutionPath.length - 1}
                  emojiMap={emojiMap}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </LeftSidePanel>
  );
}
