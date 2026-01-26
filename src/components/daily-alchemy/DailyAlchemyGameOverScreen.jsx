'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { formatTime, getRandomMessage, GAME_OVER_MESSAGES } from '@/lib/daily-alchemy.constants';
import PaywallModal from '@/components/PaywallModal';

/**
 * StatCard - Individual stat display with custom icon image
 */
function StatCard({ iconSrc, label, value }) {
  const { highContrast } = useTheme();

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3',
        'bg-white dark:bg-gray-800',
        'border-[2px] border-black',
        'rounded-xl',
        'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
        highContrast && 'border-[3px]'
      )}
    >
      <Image src={iconSrc} alt="" width={24} height={24} className="w-6 h-6" />
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
        <div className="font-bold text-gray-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

/**
 * DailyAlchemyGameOverScreen - Shown when time runs out
 */
export function DailyAlchemyGameOverScreen({
  targetElement,
  targetEmoji,
  elapsedTime,
  movesCount,
  completionStats,
  onRetry,
  onStartFreePlay,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const { isActive: hasSubscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const handleFreePlayClick = () => {
    if (hasSubscription) {
      onStartFreePlay?.();
    } else {
      setShowPaywall(true);
    }
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
          'border-[2px] border-black',
          'rounded-xl',
          'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
          'w-full max-w-sm',
          highContrast && 'border-[3px]'
        )}
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Target not reached</div>
        <div className="flex items-center gap-2">
          <span className="text-3xl opacity-50">{targetEmoji}</span>
          <span className="text-2xl font-bold text-gray-400 dark:text-gray-500 line-through">
            {targetElement}
          </span>
        </div>
      </motion.div>

      {/* Stats Grid - Time and Moves */}
      <motion.div
        className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6"
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <StatCard iconSrc="/icons/ui/stopwatch.png" label="Time" value={formatTime(elapsedTime)} />
        <StatCard iconSrc="/icons/ui/par.png" label="Moves" value={movesCount} />
      </motion.div>

      {/* Encouragement Text */}
      <motion.p
        className="text-center text-gray-600 dark:text-gray-400 mb-6 max-w-sm"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        Don&apos;t give up! Try again and see if you can reach {targetElement} before time runs out.
      </motion.p>

      {/* Action Buttons */}
      <motion.div
        className="flex flex-col gap-3 w-full max-w-sm"
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Retry Button - Primary */}
        <button
          onClick={onRetry}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-6 py-4',
            'bg-soup-primary text-white',
            'border-[3px] border-black',
            'rounded-xl font-bold text-lg',
            'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            'hover:bg-soup-hover',
            'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
            'active:translate-y-0 active:shadow-none',
            'transition-all duration-150',
            highContrast && 'border-[4px]'
          )}
        >
          <RotateCcw className="w-5 h-5" />
          <span>Try Again</span>
        </button>
      </motion.div>

      {/* Divider */}
      <motion.div
        className="w-full max-w-sm flex items-center gap-3 my-5"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
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
          'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200',
          'border-[3px] border-black dark:border-gray-600',
          'rounded-xl font-bold text-lg',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(75,85,99,1)]',
          'hover:bg-gray-50 dark:hover:bg-gray-700',
          'hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)]',
          'active:translate-y-0 active:shadow-none',
          'transition-all duration-150',
          highContrast && 'border-[4px] border-hc-border'
        )}
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
      >
        {!hasSubscription && (
          <Image
            src="/icons/ui/lock.png"
            alt="Locked"
            width={20}
            height={20}
            className="opacity-70"
          />
        )}
        <span>Try Creative Mode</span>
      </motion.button>

      {/* Creative Mode Description */}
      <motion.p
        className="w-full max-w-sm text-center text-sm text-gray-500 dark:text-gray-400 mt-3 px-4"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        Combine elements endlessly with no goal or timer.
      </motion.p>

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

export default DailyAlchemyGameOverScreen;
