'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * FirstDiscoveryToast - Celebration notification for first discoveries
 * Auto-dismisses after timeout or on tap/click
 */
export function FirstDiscoveryToast({ element, emoji, onDismiss, duration = 5000 }) {
  const { reduceMotion, highContrast } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <motion.div
      className="fixed top-4 left-1/2 z-[100] cursor-pointer"
      initial={!reduceMotion ? { y: -100, x: '-50%', opacity: 0 } : { x: '-50%' }}
      animate={{ y: 0, x: '-50%', opacity: 1 }}
      exit={!reduceMotion ? { y: -100, x: '-50%', opacity: 0 } : { x: '-50%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={onDismiss}
    >
      <div
        className={cn(
          'flex items-center gap-3 px-6 py-3',
          'bg-gradient-to-r from-yellow-400 to-orange-400',
          'text-white',
          'border-[3px] border-black',
          'rounded-2xl',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
          highContrast && 'border-[4px]'
        )}
      >
        <motion.span
          className="text-2xl"
          animate={!reduceMotion ? { rotate: [0, -10, 10, -10, 0] } : undefined}
          transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 0.5 }}
        >
          <Sparkles className="w-6 h-6" />
        </motion.span>
        <div>
          <div className="font-bold">First Discovery!</div>
          <div className="text-sm opacity-90">
            You discovered {emoji} <span className="font-jua">{element}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default FirstDiscoveryToast;
