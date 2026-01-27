'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog for anonymous user tracking and game analytics.
 * Automatically captures page views and provides context for custom events.
 */

// Initialize PostHog only on client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    // Capture page views automatically
    capture_pageview: false, // We'll handle this manually for better control
    capture_pageleave: true,
    // Privacy settings
    persistence: 'localStorage+cookie',
    // Performance
    autocapture: false, // Disable autocapture for better performance, we'll track explicitly
    disable_session_recording: false, // Enable session recordings
    // Callback when PostHog is loaded
    loaded: () => {
      // PostHog initialized successfully
    },
  });
}

/**
 * Component to capture page views on route changes
 */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Main PostHog Provider
 */
export default function PostHogProvider({ children }) {
  // Don't render PostHog in iOS/Capacitor builds
  if (process.env.BUILD_TARGET === 'capacitor') {
    return <>{children}</>;
  }

  // Don't render if no PostHog key
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  );
}

// Export posthog instance for direct usage
export { posthog };
