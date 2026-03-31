'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';

const DISMISSED_KEY = 'announcement-dismissed';

export default function AnnouncementBanner() {
  const { highContrast, reduceMotion } = useTheme();
  const { lightTap } = useHaptics();
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const fetchAnnouncement = async () => {
      try {
        const res = await capacitorFetch(getApiUrl('/api/announcements'), {}, false);
        const data = await res.json();

        if (data.success && data.announcement) {
          const dismissedId = localStorage.getItem(DISMISSED_KEY);
          if (dismissedId === String(data.announcement.id)) {
            return;
          }
          setAnnouncement(data.announcement);
        }
      } catch {
        // Silently fail - announcements are non-critical
      }
    };

    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    lightTap();
    setDismissed(true);
    if (announcement) {
      localStorage.setItem(DISMISSED_KEY, String(announcement.id));
    }
  };

  if (!mounted || !announcement || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className={`relative mb-4 rounded-2xl px-4 pt-3 pb-3 ${
          highContrast
            ? 'bg-hc-surface text-hc-text'
            : 'bg-bg-surface dark:bg-bg-card text-text-secondary'
        }`}
        role="status"
        aria-live="polite"
      >
        <button
          onClick={handleDismiss}
          className={`absolute top-2 right-2 p-1 rounded-full transition-colors ${
            highContrast
              ? 'text-hc-text hover:bg-hc-text/10'
              : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
          }`}
          aria-label="Dismiss announcement"
        >
          <X size={14} />
        </button>
        <p
          className={`text-sm text-center leading-relaxed pr-6 ${
            highContrast ? 'text-hc-text opacity-90' : ''
          }`}
        >
          {announcement.text}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
