// Analytics configuration and tracking functions
// Ready for Google Analytics, Meta Pixel, and other tracking services

export const analyticsConfig = {
  // Google Analytics 4
  ga4: {
    measurementId: process.env.NEXT_PUBLIC_GA4_ID || '', // e.g., 'G-XXXXXXXXXX'
    enabled: !!process.env.NEXT_PUBLIC_GA4_ID,
  },

  // Google Tag Manager
  gtm: {
    containerId: process.env.NEXT_PUBLIC_GTM_ID || '', // e.g., 'GTM-XXXXXX'
    enabled: !!process.env.NEXT_PUBLIC_GTM_ID,
  },

  // Meta/Facebook Pixel
  metaPixel: {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
    enabled: !!process.env.NEXT_PUBLIC_META_PIXEL_ID,
  },

  // Microsoft Clarity
  clarity: {
    projectId: process.env.NEXT_PUBLIC_CLARITY_ID || '',
    enabled: !!process.env.NEXT_PUBLIC_CLARITY_ID,
  },
};

// Track page views
export function trackPageView(url, title) {
  if (typeof window === 'undefined') {
    return;
  }

  // Google Analytics 4
  if (analyticsConfig.ga4.enabled && window.gtag) {
    window.gtag('config', analyticsConfig.ga4.measurementId, {
      page_path: url,
      page_title: title,
    });
  }

  // Meta Pixel
  if (analyticsConfig.metaPixel.enabled && window.fbq) {
    window.fbq('track', 'PageView');
  }

  // Custom tracking
  logEvent('page_view', {
    url,
    title,
    timestamp: new Date().toISOString(),
  });
}

// Track custom events
export function trackEvent(eventName, parameters = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  // Google Analytics 4
  if (analyticsConfig.ga4.enabled && window.gtag) {
    window.gtag('event', eventName, parameters);
  }

  // Meta Pixel custom events
  if (analyticsConfig.metaPixel.enabled && window.fbq) {
    window.fbq('trackCustom', eventName, parameters);
  }

  // GTM data layer push
  if (analyticsConfig.gtm.enabled && window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...parameters,
    });
  }

  // Custom logging
  logEvent(eventName, parameters);
}

// Game-specific tracking events
export const GameEvents = {
  PUZZLE_STARTED: 'puzzle_started',
  PUZZLE_COMPLETED: 'puzzle_completed',
  PUZZLE_FAILED: 'puzzle_failed',
  HINT_USED: 'hint_used',
  SHARE_CLICKED: 'share_clicked',
  SHARE_COMPLETED: 'share_completed',
  ARCHIVE_VIEWED: 'archive_viewed',
  STATS_VIEWED: 'stats_viewed',
  THEME_CHANGED: 'theme_changed',
  PWA_INSTALLED: 'pwa_installed',
};

// Track game events with enriched data
export function trackGameEvent(event, additionalData = {}) {
  const baseData = {
    puzzle_number: additionalData.puzzleNumber || null,
    puzzle_date: additionalData.puzzleDate || new Date().toISOString().split('T')[0],
    user_agent: navigator.userAgent,
    screen_size: `${window.screen.width}x${window.screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  };

  const eventData = {
    ...baseData,
    ...additionalData,
  };

  trackEvent(event, eventData);

  // Special handling for key events
  switch (event) {
    case GameEvents.PUZZLE_COMPLETED:
      // Track completion as a conversion
      if (analyticsConfig.ga4.enabled && window.gtag) {
        window.gtag('event', 'conversion', {
          send_to: `${analyticsConfig.ga4.measurementId}/puzzle_complete`,
          value: 1,
          currency: 'USD',
        });
      }
      if (analyticsConfig.metaPixel.enabled && window.fbq) {
        window.fbq('track', 'CompleteRegistration', {
          value: eventData.score || 0,
          currency: 'USD',
          content_name: `Puzzle #${eventData.puzzleNumber}`,
        });
      }
      break;

    case GameEvents.SHARE_COMPLETED:
      // Track successful shares
      if (analyticsConfig.metaPixel.enabled && window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: 'Game Share',
          content_category: 'Social',
        });
      }
      break;
  }
}

// Track user engagement time
let engagementStartTime = Date.now();
let totalEngagementTime = 0;

export function startEngagementTimer() {
  engagementStartTime = Date.now();
}

export function pauseEngagementTimer() {
  if (engagementStartTime) {
    totalEngagementTime += Date.now() - engagementStartTime;
    engagementStartTime = null;
  }
}

export function getEngagementTime() {
  let currentSession = 0;
  if (engagementStartTime) {
    currentSession = Date.now() - engagementStartTime;
  }
  return Math.floor((totalEngagementTime + currentSession) / 1000); // Return in seconds
}

// Track performance metrics
export function trackPerformance() {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  // Wait for page load to complete
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const dnsTime = perfData.domainLookupEnd - perfData.domainLookupStart;
      const tcpTime = perfData.connectEnd - perfData.connectStart;
      const requestTime = perfData.responseEnd - perfData.requestStart;

      trackEvent('performance_metrics', {
        page_load_time: pageLoadTime,
        dom_ready_time: domReadyTime,
        dns_lookup_time: dnsTime,
        tcp_connect_time: tcpTime,
        request_time: requestTime,
        user_agent: navigator.userAgent,
      });

      // Core Web Vitals (if available)
      if (window.PerformanceObserver) {
        try {
          // LCP (Largest Contentful Paint)
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            trackEvent('web_vitals_lcp', {
              value: lastEntry.renderTime || lastEntry.loadTime,
              element: lastEntry.element?.tagName,
            });
          });
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

          // FID (First Input Delay)
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              trackEvent('web_vitals_fid', {
                value: entry.processingStart - entry.startTime,
                event_type: entry.name,
              });
            });
          });
          fidObserver.observe({ type: 'first-input', buffered: true });

          // CLS (Cumulative Layout Shift)
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            trackEvent('web_vitals_cls', {
              value: clsValue,
            });
          });
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          // Error tracking web vitals
        }
      }
    }, 0);
  });
}

// Custom event logging (for debugging or custom analytics)
function logEvent(eventName, data) {
  // Store events in session storage for debugging
  try {
    const events = JSON.parse(sessionStorage.getItem('analytics_events') || '[]');
    events.push({
      event: eventName,
      data,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 50 events
    if (events.length > 50) {
      events.shift();
    }

    sessionStorage.setItem('analytics_events', JSON.stringify(events));
  } catch (e) {
    // Ignore storage errors
  }
}

// Initialize analytics on page load
export function initializeAnalytics() {
  if (typeof window === 'undefined') {
    return;
  }

  // Track initial page view
  trackPageView(window.location.pathname, document.title);

  // Track performance metrics
  trackPerformance();

  // Start engagement timer
  startEngagementTimer();

  // Track when user leaves
  window.addEventListener('beforeunload', () => {
    pauseEngagementTimer();
    trackEvent('session_end', {
      engagement_time: getEngagementTime(),
      page_views: sessionStorage.getItem('page_view_count') || 1,
    });
  });

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseEngagementTimer();
    } else {
      startEngagementTimer();
    }
  });

  // Track PWA installation
  window.addEventListener('appinstalled', () => {
    trackEvent(GameEvents.PWA_INSTALLED);
  });
}
