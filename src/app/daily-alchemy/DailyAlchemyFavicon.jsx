'use client';

import { useEffect } from 'react';
import { isStandaloneAlchemy } from '@/lib/standalone';

/**
 * DailyAlchemyFavicon - Client component for dynamic favicon switching
 *
 * Swaps to Daily Alchemy branded favicons on mount and restores
 * original favicons on unmount (when navigating away).
 * Uses standalone-specific favicons on dailyalchemy.fun.
 */
export default function DailyAlchemyFavicon() {
  useEffect(() => {
    const dir = isStandaloneAlchemy
      ? '/favicons/daily-alchemy-standalone'
      : '/favicons/daily-alchemy';
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    const originalFavicons = new Map();

    faviconLinks.forEach((link) => {
      // Save original href for cleanup
      originalFavicons.set(link, link.href);

      const rel = link.rel;
      const sizes = link.sizes?.value || link.getAttribute('sizes');

      if (rel === 'icon' || rel === 'shortcut icon') {
        if (sizes === '16x16') {
          link.href = `${dir}/favicon-16x16.png`;
        } else if (sizes === '32x32') {
          link.href = `${dir}/favicon-32x32.png`;
        } else if (sizes === '192x192' || sizes === '512x512') {
          // Android chrome icons - use largest available
          link.href = `${dir}/favicon-32x32.png`;
        } else if (!sizes || sizes === 'any') {
          // Default .ico fallback
          link.href = `${dir}/favicon.ico`;
        }
      } else if (rel === 'apple-touch-icon') {
        link.href = `${dir}/apple-touch-icon.png`;
      }
    });

    // Cleanup: restore original favicons when navigating away
    return () => {
      faviconLinks.forEach((link) => {
        const originalHref = originalFavicons.get(link);
        if (originalHref) {
          link.href = originalHref;
        }
      });
    };
  }, []);

  return null;
}
