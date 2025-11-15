/**
 * Timezone Testing Utility
 *
 * This utility helps verify that timezone handling works consistently
 * across web and iOS platforms, ensuring Wordle-style local timezone
 * puzzle rotation works correctly.
 */

import localDateService from '@/services/localDateService';
import { getCurrentPuzzleNumber, getDateForPuzzleNumber } from '@/lib/puzzleNumber';
import { getCurrentPuzzleInfo } from '@/lib/utils';
import { getTodayKey } from '@/lib/storage';

/**
 * Run comprehensive timezone tests
 * @returns {object} Test results with detailed information
 */
export async function runTimezoneTests() {
  const results = {
    timestamp: new Date().toISOString(),
    platform: detectPlatform(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  // Test 1: LocalDateService consistency
  try {
    const localDate = localDateService.getCurrentDateString();
    const debugInfo = localDateService.getDebugInfo();

    results.tests.push({
      name: 'LocalDateService.getCurrentDateString',
      status: 'passed',
      result: localDate,
      details: debugInfo,
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: 'LocalDateService.getCurrentDateString',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 2: Puzzle number calculation
  try {
    const puzzleNumber = getCurrentPuzzleNumber();
    const puzzleDate = getDateForPuzzleNumber(puzzleNumber);

    results.tests.push({
      name: 'Puzzle Number Calculation',
      status: 'passed',
      puzzleNumber,
      puzzleDate,
      details: {
        browserDate: new Date().toLocaleDateString(),
        calculatedDate: puzzleDate,
      },
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: 'Puzzle Number Calculation',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 3: Storage key generation
  try {
    const storageKey = getTodayKey();
    const localServiceKey = localDateService.getTodayStorageKey();
    const keysMatch = storageKey === localServiceKey;

    results.tests.push({
      name: 'Storage Key Generation',
      status: keysMatch ? 'passed' : 'warning',
      storageKey,
      localServiceKey,
      match: keysMatch,
    });

    if (keysMatch) {
      results.summary.passed++;
    } else {
      results.summary.warnings++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Storage Key Generation',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 4: Utils getCurrentPuzzleInfo consistency
  try {
    const puzzleInfo = getCurrentPuzzleInfo();
    const localDate = localDateService.getCurrentDateString();
    const datesMatch = puzzleInfo.isoDate === localDate;

    results.tests.push({
      name: 'getCurrentPuzzleInfo Consistency',
      status: datesMatch ? 'passed' : 'warning',
      puzzleInfo,
      localDate,
      match: datesMatch,
    });

    if (datesMatch) {
      results.summary.passed++;
    } else {
      results.summary.warnings++;
    }
  } catch (error) {
    results.tests.push({
      name: 'getCurrentPuzzleInfo Consistency',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 5: Date boundary test (11:59 PM and 12:01 AM simulation)
  try {
    const now = new Date();
    const beforeMidnight = new Date(now);
    beforeMidnight.setHours(23, 59, 0, 0);

    const afterMidnight = new Date(now);
    afterMidnight.setDate(afterMidnight.getDate() + 1);
    afterMidnight.setHours(0, 1, 0, 0);

    results.tests.push({
      name: 'Date Boundary Test',
      status: 'info',
      currentTime: now.toLocaleString(),
      beforeMidnight: beforeMidnight.toLocaleString(),
      afterMidnight: afterMidnight.toLocaleString(),
      note: 'Manual verification needed at midnight',
    });
  } catch (error) {
    results.tests.push({
      name: 'Date Boundary Test',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 6: Platform-specific Date handling
  try {
    const jsDate = new Date();
    const dateTests = {
      getFullYear: jsDate.getFullYear(),
      getMonth: jsDate.getMonth(),
      getDate: jsDate.getDate(),
      getHours: jsDate.getHours(),
      getTimezoneOffset: jsDate.getTimezoneOffset(),
      toISOString: jsDate.toISOString(),
      toLocaleDateString: jsDate.toLocaleDateString(),
      intlTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    results.tests.push({
      name: 'Platform Date API',
      status: 'passed',
      details: dateTests,
    });
    results.summary.passed++;
  } catch (error) {
    results.tests.push({
      name: 'Platform Date API',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  // Test 7: Cache behavior
  try {
    localDateService.clearCache();

    // First call (uncached)
    const start1 = performance.now();
    const date1 = localDateService.getCurrentDateString();
    const time1 = performance.now() - start1;

    // Second call (should be cached)
    const start2 = performance.now();
    const date2 = localDateService.getCurrentDateString();
    const time2 = performance.now() - start2;

    const cacheWorking = time2 < time1 && date1 === date2;

    results.tests.push({
      name: 'Cache Performance',
      status: cacheWorking ? 'passed' : 'warning',
      uncachedTime: `${time1.toFixed(2)}ms`,
      cachedTime: `${time2.toFixed(2)}ms`,
      speedup: `${(time1 / time2).toFixed(2)}x`,
      cacheWorking,
    });

    if (cacheWorking) {
      results.summary.passed++;
    } else {
      results.summary.warnings++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Cache Performance',
      status: 'failed',
      error: error.message,
    });
    results.summary.failed++;
  }

  return results;
}

/**
 * Detect current platform
 * @returns {string} Platform identifier
 */
function detectPlatform() {
  if (typeof window === 'undefined') {
    return 'node';
  }

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    return `capacitor-${window.Capacitor.getPlatform()}`;
  }

  const userAgent = window.navigator?.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return 'ios-web';
  }
  if (/Android/i.test(userAgent)) {
    return 'android-web';
  }

  return 'web';
}

/**
 * Display test results in console with formatting
 * @param {object} results - Test results object
 */
export function displayTestResults(results) {
  // eslint-disable-next-line no-console
  console.group('🧪 Timezone Test Results');

  // eslint-disable-next-line no-console
  console.group('Test Results:');
  results.tests.forEach((test) => {
    // Display test status with icon

    if (test.error) {
      // eslint-disable-next-line no-console
      console.error('  Error:', test.error);
    }
    if (test.result !== undefined) {
    }
    if (test.details) {
    }
  });
  // eslint-disable-next-line no-console
  console.groupEnd();

  // eslint-disable-next-line no-console
  console.group('Summary:');

  // eslint-disable-next-line no-console
  console.groupEnd();

  // eslint-disable-next-line no-console
  console.groupEnd();

  return results;
}

/**
 * Run timezone tests and display results
 * Can be called from console: window.testTimezone()
 */
export async function testTimezone() {
  const results = await runTimezoneTests();
  displayTestResults(results);
  return results;
}

// Expose to window for easy console testing in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  window.testTimezone = testTimezone;
  window.localDateService = localDateService;
}
