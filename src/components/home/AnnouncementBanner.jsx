'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';

const DISMISSED_KEY = 'announcement-dismissed';

export default function AnnouncementBanner() {
  const { highContrast } = useTheme();
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
          // Check if this specific announcement was already dismissed
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

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <AnimatePresence>
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`
          relative w-full rounded-[20px] border-[3px] p-4 mb-4
          ${
            highContrast
              ? 'bg-hc-background border-hc-border text-hc-text'
              : 'bg-accent-blue/10 border-accent-blue/40 text-text-primary dark:bg-accent-blue/15 dark:border-accent-blue/30'
          }
        `}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <Megaphone
            size={18}
            className={`flex-shrink-0 mt-0.5 ${highContrast ? 'text-hc-text' : 'text-accent-blue'}`}
          />
          <p
            className={`flex-1 text-sm font-medium leading-relaxed ${
              highContrast ? 'text-hc-text' : 'text-text-primary'
            }`}
          >
            {announcement.text}
          </p>
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-full transition-colors ${
              highContrast
                ? 'text-hc-text hover:bg-hc-text/10'
                : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            aria-label="Dismiss announcement"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
