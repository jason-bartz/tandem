'use client';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * CalendarSkeleton - Loading state for calendar-based archive views
 * Used by ArchiveCalendar, UnifiedArchiveCalendar, CrypticArchiveCalendar
 */
export default function CalendarSkeleton() {
  const { reduceMotion } = useTheme();

  return (
    <>
      {/* Calendar grid skeleton - matches the actual calendar layout */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'skeleton-shimmer' : ''}`}
            style={{
              animationDelay: !reduceMotion ? `${Math.min(i % 7, 4) * 100}ms` : '0ms',
            }}
          />
        ))}
      </div>
    </>
  );
}
