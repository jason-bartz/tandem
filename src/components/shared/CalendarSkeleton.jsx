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
            className={`aspect-square rounded-lg bg-gray-200 dark:bg-gray-700 ${!reduceMotion ? 'animate-pulse' : ''}`}
            style={{
              animationDelay: !reduceMotion ? `${(i % 7) * 50}ms` : '0ms',
            }}
          />
        ))}
      </div>
    </>
  );
}
