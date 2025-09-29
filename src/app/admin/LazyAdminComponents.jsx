/**
 * Lazy loaded admin components
 * Improves initial load time by splitting admin code
 */

'use client';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// Lazy load admin components
export const LazyPuzzleEditor = lazy(() => import('@/components/admin/PuzzleEditor'));
export const LazyPuzzleCalendar = lazy(() => import('@/components/admin/PuzzleCalendar'));
export const LazyStatsOverview = lazy(() => import('@/components/admin/StatsOverview'));
export const LazyBulkImport = lazy(() => import('@/components/admin/BulkImport'));
export const LazyThemeTracker = lazy(() => import('@/components/admin/ThemeTracker'));

// Loading wrapper component
export const AdminComponentWrapper = ({ children }) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px]">
          <LoadingSpinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

// Export convenience components with built-in suspense
export const PuzzleEditorLazy = (props) => (
  <AdminComponentWrapper>
    <LazyPuzzleEditor {...props} />
  </AdminComponentWrapper>
);

export const PuzzleCalendarLazy = (props) => (
  <AdminComponentWrapper>
    <LazyPuzzleCalendar {...props} />
  </AdminComponentWrapper>
);

export const StatsOverviewLazy = (props) => (
  <AdminComponentWrapper>
    <LazyStatsOverview {...props} />
  </AdminComponentWrapper>
);

export const BulkImportLazy = (props) => (
  <AdminComponentWrapper>
    <LazyBulkImport {...props} />
  </AdminComponentWrapper>
);

export const ThemeTrackerLazy = (props) => (
  <AdminComponentWrapper>
    <LazyThemeTracker {...props} />
  </AdminComponentWrapper>
);