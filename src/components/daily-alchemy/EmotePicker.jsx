'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { COOP_CONFIG } from '@/lib/daily-alchemy.constants';

/**
 * EmotePicker - Small popover with preset emoji grid for co-op emotes
 * Opens from the emote button in CoopPartnerBar
 */
export function EmotePicker({ isOpen, onClose, onSelectEmote, cooldownActive = false }) {
  const { highContrast, reduceMotion } = useTheme();
  const pickerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };

    // Small delay to prevent the opening click from immediately closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSelect = (emoji) => {
    if (cooldownActive) return;
    onSelectEmote(emoji);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'p-3',
            'bg-white dark:bg-gray-800',
            'border-[3px] border-black dark:border-gray-600',
            'rounded-xl',
            'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
            highContrast && 'border-[4px] border-hc-border'
          )}
          initial={!reduceMotion ? { opacity: 0, scale: 0.9, y: -8 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={!reduceMotion ? { opacity: 0, scale: 0.9, y: -8 } : undefined}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Emoji grid (4x4) */}
          <div className="grid grid-cols-4 gap-1.5">
            {COOP_CONFIG.EMOTE_PRESETS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                disabled={cooldownActive}
                className={cn(
                  'w-10 h-10 flex items-center justify-center text-xl',
                  'rounded-lg',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'active:scale-90',
                  'transition-all duration-100',
                  cooldownActive && 'opacity-40 cursor-not-allowed'
                )}
              >
                {emoji}
              </button>
            ))}
          </div>

          {cooldownActive && (
            <div className="text-[10px] text-gray-400 text-center mt-1.5">Wait a moment...</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EmotePicker;
