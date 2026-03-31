'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getRandomMessage, GAME_OVER_MESSAGES } from '@/lib/daily-alchemy.constants';
import SolutionPathModal from './SolutionPathModal';

/**
 * DailyAlchemyGameOverScreen - Shown when time runs out
 */
export function DailyAlchemyGameOverScreen({
  targetElement,
  targetEmoji,
  completionStats,
  onStartFreePlay,
  onViewArchive,
  solutionPath,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const [showSolutionPath, setShowSolutionPath] = useState(false);

  const handleFreePlayClick = () => {
    onStartFreePlay?.();
  };

  return (
    <div className="flex flex-col items-center flex-1 overflow-y-auto px-1">
      {/* Game Over Message */}
      <motion.div
        className="text-center mb-4"
        initial={!reduceMotion ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className={cn('text-2xl sm:text-3xl font-bold', 'text-red-500 dark:text-red-400')}>
          {completionStats?.gameOverMessage || getRandomMessage(GAME_OVER_MESSAGES)}
        </h2>
      </motion.div>

      {/* Target Not Reached Box */}
      <motion.div
        className={cn(
          'flex flex-col items-center justify-center p-4 mb-6',
          'bg-red-50 dark:bg-red-900/20',
          '',
          'rounded-xl',
          '',
          'w-full max-w-sm',
          highContrast && 'border-[3px]'
        )}
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Target not reached</div>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{targetEmoji}</span>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{targetElement}</span>
        </div>
      </motion.div>

      {/* Reveal Solution Button - Primary */}
      {solutionPath && solutionPath.length > 0 && (
        <motion.div
          className="w-full max-w-sm"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowSolutionPath(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-6 py-4',
              'bg-soup-primary text-white',
              '',
              'rounded-xl font-bold text-lg',
              '',
              'hover:bg-soup-hover',
              ' hover:',
              'active:translate-y-0',
              'transition-all duration-150',
              highContrast && 'border-[4px]'
            )}
          >
            Reveal Solution
          </button>
        </motion.div>
      )}

      {/* Play Archive Button */}
      {onViewArchive && (
        <motion.div
          className="w-full max-w-sm mt-3"
          initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={onViewArchive}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-6 py-3',
              'bg-gray-200 dark:bg-gray-700',
              'text-gray-800 dark:text-gray-200',
              'dark:border-gray-600',
              'rounded-xl font-bold',
              'dark:',
              ' hover:',
              '',
              'transition-all duration-150',
              highContrast && 'border-[4px]'
            )}
          >
            Play Archive
          </button>
        </motion.div>
      )}

      {/* Divider */}
      <motion.div
        className="w-full max-w-sm flex items-center gap-3 my-5"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or</span>
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
      </motion.div>

      {/* Creative Mode Button */}
      <motion.button
        onClick={handleFreePlayClick}
        className={cn(
          'w-full max-w-sm flex items-center justify-center gap-3 py-4',
          'bg-ghost-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
          'dark:border-gray-600',
          'rounded-xl font-bold text-lg',
          'dark:',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          ' hover:',
          'active:translate-y-0',
          'transition-all duration-150',
          highContrast && 'border-[4px] border-hc-border'
        )}
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
      >
        <span>Try Creative Mode</span>
      </motion.button>

      {/* Creative Mode Description */}
      <motion.p
        className="w-full max-w-sm text-center text-sm text-gray-500 dark:text-gray-400 mt-3 px-4"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Combine elements endlessly with no goal or timer.
      </motion.p>

      {/* Solution Path Modal */}
      <SolutionPathModal
        isOpen={showSolutionPath}
        onClose={() => setShowSolutionPath(false)}
        solutionPath={solutionPath}
        targetElement={targetElement}
        targetEmoji={targetEmoji}
      />
    </div>
  );
}

export default DailyAlchemyGameOverScreen;
