'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await capacitorFetch(getApiUrl('/api/announcements'), {}, false);
        const data = await res.json();

        if (data.success && data.announcement) {
          const dismissedId = localStorage.getItem(DISMISSED_KEY);
          if (dismissedId === String(data.announcement.id)) {
            setLoaded(true);
            return;
          }
          setAnnouncement(data.announcement);
        }
      } catch {
        // Silently fail - announcements are non-critical
      }
      setLoaded(true);
    };

    fetchAnnouncement();
  }, []);

  const handleDismiss = () => {
    lightTap();
    setDismissed(true);
    if (announcement) {
      try {
        localStorage.setItem(DISMISSED_KEY, String(announcement.id));
      } catch {
        // Storage quota exceeded
      }
    }
  };

  const showBanner = loaded && announcement && !dismissed;

  // Use a wrapper that transitions from 0 height to auto, avoiding layout shift.
  // Before loaded: render nothing (skeleton handles the space).
  // After loaded with no announcement: collapse smoothly to 0.
  // After loaded with announcement: expand smoothly to auto.
  return (
    <motion.div
      initial={false}
      animate={
        reduceMotion
          ? { opacity: showBanner ? 1 : 0 }
          : {
              height: showBanner ? 'auto' : 0,
              marginBottom: showBanner ? 24 : 0,
              opacity: showBanner ? 1 : 0,
            }
      }
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden"
      style={!showBanner && reduceMotion ? { height: 0, marginBottom: 0 } : undefined}
    >
      {showBanner && (
        <div
          className={`relative rounded-lg px-4 pt-3 pb-3 ${
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
        </div>
      )}
    </motion.div>
  );
}
