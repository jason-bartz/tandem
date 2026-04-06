'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export const MINI_KEYBOARD_SHORTCUTS = [
  {
    category: 'Navigate',
    shortcuts: [
      { keys: ['\u2190', '\u2191', '\u2192', '\u2193'], description: 'Move between cells' },
      { keys: ['Space'], description: 'Toggle across / down' },
      { keys: ['Tab'], description: 'Next clue in section' },
      { keys: ['Shift', 'Tab'], description: 'Previous clue in section' },
    ],
  },
  {
    category: 'Input',
    shortcuts: [
      { keys: ['A\u2013Z'], description: 'Type a letter' },
      { keys: ['Backspace'], description: 'Delete / move back' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Esc'], description: 'Close modal / dismiss' },
      { keys: ['Ctrl', 'C'], description: 'Check square' },
      { keys: ['Ctrl', 'Shift', 'C'], description: 'Check word' },
      { keys: ['Ctrl', 'R'], description: 'Reveal square' },
      { keys: ['Ctrl', 'Shift', 'R'], description: 'Reveal word' },
    ],
  },
];

export function MiniKeyboardShortcutsModal({ isOpen, onClose }) {
  const { highContrast, reduceMotion } = useTheme();
  const modalRef = useRef(null);

  // Only handle Escape here; the ? toggle is managed by the parent keyboard handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15 }}
          data-mini-help
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            className={cn(
              'relative z-10 w-full max-w-sm',
              'bg-bg-card dark:bg-gray-800',
              'rounded-2xl',
              highContrast && 'border-2 border-hc-border'
            )}
            initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            data-mini-help
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2
                className={cn(
                  'text-base font-bold',
                  'text-gray-900 dark:text-white',
                  highContrast && 'text-hc-text'
                )}
              >
                Keyboard Shortcuts
              </h2>
              <button
                onClick={onClose}
                className={cn(
                  'p-1.5 rounded-lg',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors'
                )}
                aria-label="Close shortcuts"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Shortcut categories */}
            <div className="px-5 pb-4 space-y-3">
              {MINI_KEYBOARD_SHORTCUTS.map((category) => (
                <div key={category.category}>
                  <h3
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider mb-1.5',
                      'text-gray-400 dark:text-gray-500',
                      highContrast && 'text-hc-text'
                    )}
                  >
                    {category.category}
                  </h3>
                  <div className="space-y-1">
                    {category.shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {shortcut.keys.map((key, i) => (
                            <span key={key} className="flex items-center gap-0.5">
                              {i > 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  +
                                </span>
                              )}
                              <kbd
                                className={cn(
                                  'inline-flex items-center justify-center',
                                  'min-w-[22px] h-5 px-1.5',
                                  'text-[10px] font-mono font-medium',
                                  'bg-gray-100 dark:bg-gray-700',
                                  'text-gray-700 dark:text-gray-300',
                                  'border border-gray-300 dark:border-gray-600',
                                  'rounded-md',
                                  highContrast && 'border-2 border-hc-border'
                                )}
                              >
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className={cn(
                'px-5 py-2.5 border-t',
                'border-gray-200 dark:border-gray-700',
                'text-center'
              )}
            >
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                Press{' '}
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-md text-[10px] font-mono border border-gray-300 dark:border-gray-600">
                  ?
                </kbd>{' '}
                to close
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MiniKeyboardShortcutsModal;
