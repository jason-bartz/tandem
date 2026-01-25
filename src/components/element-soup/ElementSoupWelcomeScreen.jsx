'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { STARTER_ELEMENTS } from '@/lib/element-soup.constants';
import PaywallModal from '@/components/PaywallModal';

/**
 * ElementSoupWelcomeScreen - Initial screen before game starts
 * Redesigned with hero target card, 4-column element grid, and full-width CTA
 */
export function ElementSoupWelcomeScreen({
  formattedDate: _formattedDate,
  targetElement,
  targetEmoji,
  parMoves,
  onStart,
  onStartFreePlay,
  isArchive = false,
  puzzleNumber,
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
    <div className="flex flex-col items-center flex-1 px-4">
      {/* Archive Badge */}
      {isArchive && (
        <motion.div
          className="mb-3 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm"
          initial={!reduceMotion ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Puzzle #{puzzleNumber}
        </motion.div>
      )}

      {/* Hero Target Card */}
      <motion.div
        className={cn(
          'w-full max-w-sm p-5 mb-6',
          'bg-gradient-to-br from-soup-light/50 via-soup-light to-soup-light/70',
          'dark:from-soup-primary/20 dark:via-soup-primary/15 dark:to-soup-primary/20',
          'border-[3px] border-black dark:border-gray-600',
          'rounded-2xl',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          highContrast && 'border-[4px] border-hc-border'
        )}
        initial={!reduceMotion ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {/* Today's Target Label */}
        <div className="text-soup-dark dark:text-soup-primary font-bold text-xs tracking-wider mb-3">
          Today&apos;s Target
        </div>

        {/* Emoji + Title Row */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-5xl">{targetEmoji}</span>
          <h1
            className={cn(
              'text-3xl font-jua text-gray-900 dark:text-white',
              highContrast && 'text-hc-text'
            )}
          >
            {targetElement}
          </h1>
        </div>

        {/* Par Display */}
        <p className="text-sm text-gray-600 dark:text-gray-400">Par: {parMoves} moves</p>
      </motion.div>

      {/* Starting Elements Section */}
      <motion.div
        className="w-full max-w-sm mb-5"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <div className="text-gray-600 dark:text-gray-400 font-semibold text-xs tracking-wider mb-3">
          Starting Elements
        </div>

        {/* 4-Column Element Grid */}
        <div className="grid grid-cols-4 gap-2">
          {STARTER_ELEMENTS.map((el) => (
            <motion.div
              key={el.id}
              className={cn(
                'flex flex-col items-center justify-center py-3 px-2',
                'bg-white dark:bg-gray-800',
                'border-[3px] border-black dark:border-gray-600',
                'rounded-xl',
                'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(75,85,99,1)]',
                'hover:bg-gray-50 dark:hover:bg-gray-700',
                'transition-colors duration-150',
                highContrast && 'border-[4px] border-hc-border'
              )}
              whileHover={!reduceMotion ? { scale: 1.05 } : undefined}
            >
              <span className="text-2xl mb-1">{el.emoji}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {el.name}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How to Play Section - Persistent */}
      <motion.div
        className="w-full max-w-sm mb-6"
        initial={!reduceMotion ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {/* How to Play Label */}
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2">
          <Info className="w-4 h-4" />
          <span>How to Play</span>
        </div>

        {/* Instructions Box */}
        <div
          className={cn(
            'p-4',
            'bg-soup-light/50 dark:bg-soup-primary/10',
            'border-2 border-soup-light dark:border-soup-primary/30',
            'rounded-xl',
            'text-sm text-soup-dark dark:text-soup-primary'
          )}
        >
          Combine elements to create new ones. Mix and match until you discover the target element.
          Fewer moves = better score!
        </div>
      </motion.div>

      {/* Full-Width Start Button */}
      <motion.button
        onClick={onStart}
        className={cn(
          'w-full max-w-sm flex items-center justify-center gap-3 py-4',
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
        initial={!reduceMotion ? { opacity: 0, scale: 0.95 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45 }}
        whileTap={!reduceMotion ? { scale: 0.98 } : undefined}
      >
        <Image src="/icons/ui/cauldron.png" alt="" width={24} height={24} />
        <span>Start Mixing</span>
      </motion.button>

      {/* Divider */}
      <motion.div
        className="w-full max-w-sm flex items-center gap-3 my-5"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or</span>
        <div className="flex-1 h-[2px] bg-gray-300 dark:bg-gray-600" />
      </motion.div>

      {/* Free Play Button */}
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
        transition={{ delay: 0.55 }}
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
        <span>Free Play</span>
      </motion.button>

      {/* Free Play Description */}
      <motion.p
        className="w-full max-w-sm text-center text-sm text-gray-500 dark:text-gray-400 mt-3 px-4"
        initial={!reduceMotion ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Combine elements endlessly with no goal or timer. Just pure discovery.
      </motion.p>

      {/* Paywall Modal */}
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}

export default ElementSoupWelcomeScreen;
