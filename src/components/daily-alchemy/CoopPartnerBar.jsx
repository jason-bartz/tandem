'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { playEmoteNotificationSound } from '@/lib/sounds';
import { EmotePicker } from './EmotePicker';

const STATUS_CONFIG = {
  active: {
    color: 'bg-green-500',
    label: 'Active',
  },
  connecting: {
    color: 'bg-blue-500',
    label: 'Connecting...',
  },
  idle: {
    color: 'bg-yellow-500',
    label: 'Idle',
  },
  disconnected: {
    color: 'bg-red-500',
    label: 'Disconnected',
  },
};

/**
 * CoopPartnerBar - Shows partner info, status, and emotes during co-op play
 * Displayed between the header and combination area
 */
function CoopPartnerBarInner({
  partner,
  partnerStatus,
  receivedEmote,
  onSendEmote,
  emoteCooldownActive = false,
  onLeave,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const [isEmotePickerOpen, setIsEmotePickerOpen] = useState(false);
  const statusConfig = STATUS_CONFIG[partnerStatus] || STATUS_CONFIG.disconnected;

  // Play notification sound when partner sends an emote
  useEffect(() => {
    if (receivedEmote) {
      playEmoteNotificationSound();
    }
  }, [receivedEmote]);

  const [sentEmote, setSentEmote] = useState(null);
  const sentTimerRef = useRef(null);

  const handleSelectEmote = useCallback(
    (emoji) => {
      onSendEmote?.(emoji);
      setSentEmote(emoji);
      if (sentTimerRef.current) clearTimeout(sentTimerRef.current);
      sentTimerRef.current = setTimeout(() => setSentEmote(null), 2000);
    },
    [onSendEmote]
  );

  useEffect(() => {
    return () => {
      if (sentTimerRef.current) clearTimeout(sentTimerRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        'relative flex items-center justify-between px-3 py-2',
        'bg-indigo-50/50 dark:bg-indigo-950/20',
        'border-[2px] border-indigo-200 dark:border-indigo-800/50',
        'rounded-xl',
        highContrast && 'border-hc-border'
      )}
    >
      {/* Partner info */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Avatar or initial */}
        {partner?.avatarPath ? (
          <img
            src={partner.avatarPath}
            alt=""
            className="w-6 h-6 rounded-full border border-indigo-300 dark:border-indigo-700 flex-shrink-0"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300 flex-shrink-0">
            {(partner?.username || '?')[0].toUpperCase()}
          </div>
        )}

        {/* Username + status + leave */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate max-w-[140px]">
            {partner?.username || 'Partner'}
            {partner?.countryFlag && <span className="ml-1 text-xs">{partner.countryFlag}</span>}
          </span>
          <div
            className={cn('w-2 h-2 rounded-full flex-shrink-0', statusConfig.color)}
            title={statusConfig.label}
          />
          {partnerStatus === 'disconnected' ? (
            <span className="text-xs text-red-500 dark:text-red-400 flex-shrink-0">has left</span>
          ) : onLeave ? (
            <button
              onClick={onLeave}
              className={cn(
                'flex-shrink-0 p-1 rounded-lg',
                'text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300',
                'hover:bg-red-50 dark:hover:bg-red-900/30',
                'transition-colors'
              )}
              title="Leave session"
              aria-label="Leave session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Received emote */}
        <AnimatePresence>
          {receivedEmote && (
            <motion.span
              key={receivedEmote.timestamp}
              className="flex items-center gap-1 flex-shrink-0"
              initial={!reduceMotion ? { scale: 0, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <span className="text-xs text-indigo-500 dark:text-indigo-400">sent</span>
              <span className="text-xl">{receivedEmote.emoji}</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Emote button + sent feedback (hidden when partner disconnected) */}
      {partnerStatus !== 'disconnected' && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AnimatePresence>
            {sentEmote && (
              <motion.span
                key={sentEmote}
                className="text-xs text-indigo-500 dark:text-indigo-400 whitespace-nowrap"
                initial={!reduceMotion ? { opacity: 0, x: 4 } : false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                sent {sentEmote}
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsEmotePickerOpen(!isEmotePickerOpen)}
            className={cn(
              'w-8 h-8 flex items-center justify-center',
              'hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
              'rounded-lg transition-colors flex-shrink-0',
              isEmotePickerOpen && 'bg-indigo-100 dark:bg-indigo-900/30'
            )}
            title="Send emote"
          >
            <Smile className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          </button>
        </div>
      )}

      {/* Emote Picker Popover */}
      <EmotePicker
        isOpen={isEmotePickerOpen}
        onClose={() => setIsEmotePickerOpen(false)}
        onSelectEmote={handleSelectEmote}
        cooldownActive={emoteCooldownActive}
      />
    </div>
  );
}

export const CoopPartnerBar = memo(CoopPartnerBarInner);
export default CoopPartnerBar;
