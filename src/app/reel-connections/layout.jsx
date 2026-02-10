'use client';

import { useEffect } from 'react';

/**
 * Reel Connections Layout
 *
 * Handles dynamic favicon switching for the /reel-connections route.
 * Swaps to reel-connections branded favicons on mount and restores
 * original favicons on unmount (when navigating away).
 */
export default function ReelConnectionsLayout({ children }) {
  useEffect(() => {
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    const originalFavicons = new Map();

    faviconLinks.forEach((link) => {
      // Save original href for cleanup
      originalFavicons.set(link, link.href);

      const rel = link.rel;
      const sizes = link.sizes?.value || link.getAttribute('sizes');

      if (rel === 'icon' || rel === 'shortcut icon') {
        if (sizes === '16x16') {
          link.href = '/favicons/reel-connections/favicon-16x16.png';
        } else if (sizes === '32x32') {
          link.href = '/favicons/reel-connections/favicon-32x32.png';
        } else if (sizes === '192x192' || sizes === '512x512') {
          // Android chrome icons - keep as-is or update if you have larger RC icons
          link.href = '/favicons/reel-connections/favicon-32x32.png';
        } else if (!sizes || sizes === 'any') {
          // Default .ico fallback
          link.href = '/favicons/reel-connections/favicon.ico';
        }
      } else if (rel === 'apple-touch-icon') {
        link.href = '/favicons/reel-connections/apple-touch-icon.png';
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

  return children;
}
