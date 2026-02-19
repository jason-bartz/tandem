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
 * ActivityFeedItem - Single item in the partner activity feed
 */
function ActivityFeedItem({ item, reduceMotion, highContrast }) {
  if (item.type === 'combination') {
    const isFirst = item.isFirstDiscovery;
    return (
      <motion.div
        className={cn('text-xs py-0.5', 'text-gray-500 dark:text-gray-400')}
        initial={!reduceMotion ? { opacity: 0, x: -8 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span>{item.elementEmoji}</span>{' '}
        <span
          className={cn(
            'font-medium',
            isFirst
              ? highContrast
                ? 'font-bold text-yellow-700 dark:text-yellow-300'
                : 'text-amber-500 dark:text-amber-300 [text-shadow:0_0_8px_rgba(245,158,11,0.4)] dark:[text-shadow:0_0_8px_rgba(252,211,77,0.35)]'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {item.elementName}
        </span>
        {item.combinedFrom?.length === 2 && (
          <span className="text-gray-400 dark:text-gray-500">
            {' '}
            ({item.combinedFrom[0]} + {item.combinedFrom[1]})
          </span>
        )}
      </motion.div>
    );
  }

  if (item.type === 'emote') {
    return (
      <motion.div
        className="text-xs py-0.5 text-indigo-500 dark:text-indigo-400"
        initial={!reduceMotion ? { opacity: 0, scale: 0.9 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
      >
        <span className="text-indigo-400 dark:text-indigo-500">sent</span>{' '}
        <span className="text-base">{item.emoji}</span>
      </motion.div>
    );
  }

  return null;
}

/**
 * TypingIndicator - Three bouncing dots (iMessage-style)
 */
function TypingIndicator({ reduceMotion }) {
  return (
    <motion.span
      className="flex items-center gap-[2px] ml-1.5"
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.2 }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500"
          animate={!reduceMotion ? { y: [0, -3, 0] } : undefined}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.span>
  );
}

/**
 * CoopPartnerBar - Shows partner info, status, activity feed, and emotes during co-op play
 * Displayed between the header and combination area
 */
function CoopPartnerBarInner({
  partner,
  partnerStatus,
  receivedEmote,
  onSendEmote,
  emoteCooldownActive = false,
  onLeave,
  activityFeed = [],
  partnerIsInteracting = false,
}) {
  const { highContrast, reduceMotion } = useTheme();
  const [isEmotePickerOpen, setIsEmotePickerOpen] = useState(false);
  const feedRef = useRef(null);
  const statusConfig = STATUS_CONFIG[partnerStatus] || STATUS_CONFIG.disconnected;

  // Play notification sound when partner sends an emote
  useEffect(() => {
    if (receivedEmote) {
      playEmoteNotificationSound();
    }
  }, [receivedEmote]);

  // Auto-scroll feed to bottom on new items
  useEffect(() => {
    if (feedRef.current && activityFeed.length > 0) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [activityFeed.length]);

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
        'relative flex flex-col',
        'bg-indigo-50/50 dark:bg-indigo-950/20',
        'border-[2px] border-indigo-200 dark:border-indigo-800/50',
        'rounded-xl',
        'shadow-[0_3px_12px_rgba(99,102,241,0.3)] dark:shadow-[0_3px_12px_rgba(129,140,248,0.35)]',
        highContrast && 'border-hc-border'
      )}
    >
      {/* Header row: partner info + emote controls */}
      <div className="flex items-center justify-between px-3 py-2">
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

          {/* Username + status + leave + typing indicator */}
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

            {/* Typing/activity indicator */}
            <AnimatePresence>
              {partnerIsInteracting && partnerStatus === 'active' && (
                <TypingIndicator reduceMotion={reduceMotion} />
              )}
            </AnimatePresence>
          </div>
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

      {/* Activity Feed */}
      {activityFeed.length > 0 && (
        <div className="border-t border-indigo-100 dark:border-indigo-900/30">
          <div
            ref={feedRef}
            className={cn(
              'max-h-[40px] lg:max-h-[120px] overflow-y-auto overflow-x-hidden',
              'px-3 py-1.5'
            )}
          >
            <div className="space-y-0.5">
              {activityFeed
                .slice()
                .reverse()
                .map((item) => (
                  <ActivityFeedItem
                    key={item.id}
                    item={item}
                    reduceMotion={reduceMotion}
                    highContrast={highContrast}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const CoopPartnerBar = memo(CoopPartnerBarInner);
export default CoopPartnerBar;
