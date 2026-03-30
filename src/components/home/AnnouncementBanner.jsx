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
        className={`relative mb-2 ${
          highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center gap-2 px-3 py-2">
          <p
            className={`text-sm text-center leading-snug ${
              highContrast ? 'text-hc-text opacity-90' : ''
            }`}
          >
            <span className="mr-1.5" aria-hidden="true">
              ✨
            </span>
            {announcement.text}
          </p>
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              highContrast
                ? 'text-hc-text hover:bg-hc-text/10'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label="Dismiss announcement"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
