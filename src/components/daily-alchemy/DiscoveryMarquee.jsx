'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const DISCOVERY_LIMIT = 50;

/**
 * DiscoveryMarquee — Continuously scrolling single-row ticker of first discoveries.
 * Uses Supabase Realtime to push new discoveries instantly (no polling).
 * Falls back to initial fetch for the first render.
 */
export default function DiscoveryMarquee() {
  const { reduceMotion, highContrast } = useTheme();
  const [discoveries, setDiscoveries] = useState([]);
  const channelRef = useRef(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Initial fetch
    async function fetchInitial() {
      try {
        const { data, error } = await supabase
          .from('element_soup_first_discoveries')
          .select('result_element, result_emoji, username')
          .order('discovered_at', { ascending: false })
          .limit(DISCOVERY_LIMIT);

        if (!error && data?.length) {
          setDiscoveries(data.map(formatDiscovery));
        }
      } catch {
        // Silent fail — marquee is decorative
      }
    }

    fetchInitial();

    // Subscribe to new inserts via Supabase Realtime
    const channel = supabase
      .channel('discovery-marquee')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'element_soup_first_discoveries',
        },
        (payload) => {
          const newDiscovery = formatDiscovery(payload.new);
          setDiscoveries((prev) => [newDiscovery, ...prev].slice(0, DISCOVERY_LIMIT));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  if (!discoveries.length) return null;

  const duration = discoveries.length * 5;

  const items = discoveries.map((d, i) => (
    <span
      key={`${d.element}-${i}`}
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

function formatDiscovery(row) {
  return {
    element: row.result_element,
    emoji: row.result_emoji || '✨',
    username: row.username || 'Anonymous',
  };
}
