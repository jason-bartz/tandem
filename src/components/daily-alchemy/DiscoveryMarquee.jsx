'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const POLL_INTERVAL = 60_000;

/**
 * DiscoveryMarquee — Continuously scrolling single-row ticker of first discoveries.
 * Duplicate-list technique with pure CSS translateX for seamless infinite loop.
 */
export default function DiscoveryMarquee() {
  const { reduceMotion, highContrast } = useTheme();
  const [discoveries, setDiscoveries] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function fetchDiscoveries() {
      try {
        const res = await fetch('/api/daily-alchemy/discoveries/recent');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.discoveries?.length) {
          setDiscoveries(data.discoveries);
        }
      } catch {
        // Silent fail — marquee is decorative
      }
    }

    fetchDiscoveries();
    const interval = setInterval(fetchDiscoveries, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!discoveries.length) return null;

  const duration = discoveries.length * 5;

  const items = discoveries.map((d, i) => (
    <span
      key={i}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 whitespace-nowrap',
        'text-xs text-gray-500 dark:text-gray-400',
        highContrast && 'text-hc-text'
      )}
    >
      <span className="font-medium text-gray-600 dark:text-gray-300">{d.username}</span>
      <span>first to discover</span>
      <span className="text-sm">{d.emoji}</span>
      <span className="font-jua text-gray-700 dark:text-gray-200">{d.element}</span>
      <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
    </span>
  ));

  return (
    <div
      className="w-full max-w-sm my-4 select-none overflow-hidden whitespace-nowrap"
      role="marquee"
      aria-label="Recent first discoveries by players"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="inline-flex"
        style={
          !reduceMotion
            ? {
                animation: `marquee ${duration}s linear infinite`,
                WebkitAnimation: `marquee ${duration}s linear infinite`,
                willChange: 'transform',
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
              }
            : undefined
        }
      >
        <div className="inline-flex">{items}</div>
        <div className="inline-flex" aria-hidden="true">
          {items}
        </div>
      </div>
    </div>
  );
}
