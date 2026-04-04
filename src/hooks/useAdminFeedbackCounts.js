'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import adminService from '@/services/admin.service';
import logger from '@/lib/logger';

const POLL_INTERVAL = 60_000; // 60 seconds
const ADMIN_BASE_TITLE = 'Tandem Admin';

/**
 * Hook that fetches feedback counts on mount, polls every 60s,
 * and updates the browser tab title + favicon badge when new feedback exists.
 */
export default function useAdminFeedbackCounts() {
  const [counts, setCounts] = useState(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const originalFaviconRef = useRef(null);

  const fetchCounts = useCallback(async () => {
    try {
      const data = await adminService.getFeedbackCounts();
      setCounts(data);
    } catch (error) {
      logger.error('[useAdminFeedbackCounts] poll error', error);
    }
  }, []);

  // Set counts from child components (e.g. FeedbackDashboard after status change)
  const updateCounts = useCallback((newCounts) => {
    setCounts(newCounts);
  }, []);

  // Update tab title based on new count
  useEffect(() => {
    const newCount = counts?.new || 0;
    document.title = newCount > 0 ? `(${newCount}) ${ADMIN_BASE_TITLE}` : ADMIN_BASE_TITLE;

    return () => {
      document.title = ADMIN_BASE_TITLE;
    };
  }, [counts]);

  // Update favicon badge based on new count
  useEffect(() => {
    const newCount = counts?.new || 0;
    const faviconLink =
      document.querySelector('link[rel="icon"][sizes="32x32"]') ||
      document.querySelector('link[rel="icon"]');

    if (!faviconLink) return;

    // Store original favicon on first run
    if (!originalFaviconRef.current) {
      originalFaviconRef.current = faviconLink.href;
    }

    if (newCount === 0) {
      faviconLink.href = originalFaviconRef.current;
      return;
    }

    // Draw badge on favicon
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const size = 32;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw original favicon
      ctx.drawImage(img, 0, 0, size, size);

      // Draw red circle badge
      const badgeRadius = 8;
      const badgeX = size - badgeRadius;
      const badgeY = badgeRadius;

      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff5757';
      ctx.fill();

      // Draw count text
      const label = newCount > 99 ? '99' : String(newCount);
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${label.length > 1 ? 9 : 11}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX, badgeY + 0.5);

      faviconLink.href = canvas.toDataURL('image/png');
    };
    img.src = originalFaviconRef.current;
  }, [counts]);

  // Fetch on mount + start polling
  useEffect(() => {
    fetchCounts();

    intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL);

    // Pause polling when tab is hidden, resume when visible
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
      } else {
        fetchCounts();
        intervalRef.current = setInterval(fetchCounts, POLL_INTERVAL);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchCounts]);

  return { counts, updateCounts, refetch: fetchCounts };
}
