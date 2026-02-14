'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrl, capacitorFetch } from '@/lib/api-config';
import { SOUP_API, MATCHMAKING_CONFIG } from '@/lib/daily-alchemy.constants';
import logger from '@/lib/logger';

/**
 * useMatchmaking - Manages Quick Match matchmaking queue lifecycle
 *
 * Handles entering/leaving the queue, polling for matches via heartbeat,
 * and timeout management.
 *
 * @param {Object} options
 * @param {Function} options.onMatchFound - Callback when a match is found with match data
 */
export function useMatchmaking({ onMatchFound }) {
  // Queue state
  const [status, setStatus] = useState('idle'); // idle | selecting_mode | searching | matched | timeout | error
  const [matchedData, setMatchedData] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [waitTime, setWaitTime] = useState(0);
  const [error, setError] = useState(null);

  // Refs for intervals and cleanup
  const heartbeatIntervalRef = useRef(null);
  const waitTimeIntervalRef = useRef(null);
  const softTimeoutRef = useRef(null);
  const hardTimeoutRef = useRef(null);
  const statusRef = useRef(status);
  const onMatchFoundRef = useRef(onMatchFound);
  const searchStartedAtRef = useRef(null);

  // Keep refs in sync
  statusRef.current = status;
  onMatchFoundRef.current = onMatchFound;

  /**
   * Clean up all intervals and timeouts
   */
  const clearAllTimers = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (waitTimeIntervalRef.current) {
      clearInterval(waitTimeIntervalRef.current);
      waitTimeIntervalRef.current = null;
    }
    if (softTimeoutRef.current) {
      clearTimeout(softTimeoutRef.current);
      softTimeoutRef.current = null;
    }
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }, []);

  /**
   * Clear only UI timers (wait counter + soft timeout), keep heartbeat alive
   */
  const clearUiTimers = useCallback(() => {
    if (waitTimeIntervalRef.current) {
      clearInterval(waitTimeIntervalRef.current);
      waitTimeIntervalRef.current = null;
    }
    if (softTimeoutRef.current) {
      clearTimeout(softTimeoutRef.current);
      softTimeoutRef.current = null;
    }
  }, []);

  /**
   * Fire cancel request to the API
   */
  const cancelQueueEntry = useCallback(async () => {
    try {
      const url = getApiUrl(SOUP_API.COOP_MATCHMAKE);
      await capacitorFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
    } catch {
      // Best effort — don't block on failure
    }
  }, []);

  /**
   * Handle a successful match
   */
  const handleMatch = useCallback(
    (data) => {
      clearAllTimers();
      setStatus('matched');
      setMatchedData(data);
      onMatchFoundRef.current?.(data);
    },
    [clearAllTimers]
  );

  /**
   * Start the heartbeat polling loop
   */
  const startPolling = useCallback(() => {
    // Track when this search started (for minimum search duration)
    searchStartedAtRef.current = Date.now();

    // Prevent duplicate heartbeat intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Heartbeat every 3 seconds — runs during both 'searching' AND 'timeout'
    heartbeatIntervalRef.current = setInterval(async () => {
      const currentStatus = statusRef.current;
      if (currentStatus !== 'searching' && currentStatus !== 'timeout') return;

      try {
        const url = getApiUrl(SOUP_API.COOP_MATCHMAKE);
        const response = await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat' }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) return;

        if (data.status === 'matched') {
          handleMatch(data);
        } else if (data.status === 'waiting') {
          setQueuePosition(data.queuePosition || null);
        } else if (data.status === 'expired') {
          // Ignore expired during minimum search period to avoid premature timeout
          const elapsed = Date.now() - (searchStartedAtRef.current || 0);
          if (elapsed < MATCHMAKING_CONFIG.MINIMUM_SEARCH_MS) return;
          // Queue entry was cleaned up
          clearAllTimers();
          setStatus('timeout');
        }
      } catch (err) {
        logger.error('[Matchmaking] Heartbeat error', { error: err.message });
      }
    }, MATCHMAKING_CONFIG.HEARTBEAT_INTERVAL_MS);

    // Wait time counter (1 second increment)
    if (waitTimeIntervalRef.current) {
      clearInterval(waitTimeIntervalRef.current);
    }
    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((t) => t + 1);
    }, 1000);

    // Soft timeout — show "no players found" UI but keep heartbeat alive
    if (softTimeoutRef.current) {
      clearTimeout(softTimeoutRef.current);
    }
    softTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'searching') {
        setStatus('timeout');
        // Only stop the wait counter + soft timeout, heartbeat keeps running
        clearUiTimers();
      }
    }, MATCHMAKING_CONFIG.SOFT_TIMEOUT_MS);

    // Hard timeout — cancel queue entry and stop everything
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
    }
    hardTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'searching' || statusRef.current === 'timeout') {
        cancelQueueEntry();
        clearAllTimers();
        setStatus('timeout');
      }
    }, MATCHMAKING_CONFIG.HARD_TIMEOUT_MS);
  }, [clearAllTimers, clearUiTimers, handleMatch, cancelQueueEntry]);

  /**
   * Open mode selection for Quick Match
   */
  const startMatchmaking = useCallback(() => {
    setStatus('selecting_mode');
    setError(null);
    setMatchedData(null);
    setQueuePosition(null);
    setWaitTime(0);
  }, []);

  /**
   * Select a mode and enter the queue
   */
  const selectMode = useCallback(
    async (mode) => {
      try {
        setStatus('searching');
        setError(null);
        setWaitTime(0);

        const url = getApiUrl(SOUP_API.COOP_MATCHMAKE);
        const response = await capacitorFetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', mode }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to enter queue');
          setStatus('error');
          return;
        }

        if (data.status === 'matched') {
          // Immediately matched
          handleMatch(data);
        } else {
          // Waiting — start polling
          startPolling();
        }
      } catch (err) {
        logger.error('[Matchmaking] Join error', { error: err.message });
        setError('Failed to enter queue');
        setStatus('error');
      }
    },
    [handleMatch, startPolling]
  );

  /**
   * Cancel matchmaking and leave the queue
   */
  const cancelMatchmaking = useCallback(() => {
    const wasActive = statusRef.current === 'searching' || statusRef.current === 'timeout';
    clearAllTimers();
    if (wasActive) {
      cancelQueueEntry();
    }
    setStatus('idle');
    setMatchedData(null);
    setQueuePosition(null);
    setWaitTime(0);
    setError(null);
  }, [clearAllTimers, cancelQueueEntry]);

  /**
   * Extend search after soft timeout.
   * Heartbeat is already running — just restart the UI timers.
   */
  const extendSearch = useCallback(() => {
    setStatus('searching');
    searchStartedAtRef.current = Date.now();

    // Restart wait time counter
    if (waitTimeIntervalRef.current) {
      clearInterval(waitTimeIntervalRef.current);
    }
    waitTimeIntervalRef.current = setInterval(() => {
      setWaitTime((t) => t + 1);
    }, 1000);

    // Reset soft timeout
    if (softTimeoutRef.current) {
      clearTimeout(softTimeoutRef.current);
    }
    softTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'searching') {
        setStatus('timeout');
        clearUiTimers();
      }
    }, MATCHMAKING_CONFIG.SOFT_TIMEOUT_MS);

    // Reset hard timeout
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
    }
    hardTimeoutRef.current = setTimeout(() => {
      if (statusRef.current === 'searching' || statusRef.current === 'timeout') {
        cancelQueueEntry();
        clearAllTimers();
        setStatus('timeout');
      }
    }, MATCHMAKING_CONFIG.HARD_TIMEOUT_MS);
  }, [clearAllTimers, clearUiTimers, cancelQueueEntry]);

  /**
   * Clear error and return to idle
   */
  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  // Cancel queue on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (statusRef.current === 'searching' || statusRef.current === 'timeout') {
        // Use sendBeacon for reliable delivery during page unload
        const url = getApiUrl(SOUP_API.COOP_MATCHMAKE);
        const body = JSON.stringify({ action: 'cancel' });
        navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
      if (statusRef.current === 'searching' || statusRef.current === 'timeout') {
        cancelQueueEntry();
      }
    };
  }, [clearAllTimers, cancelQueueEntry]);

  return {
    status,
    matchedData,
    queuePosition,
    waitTime,
    error,
    startMatchmaking,
    selectMode,
    cancelMatchmaking,
    extendSearch,
    clearError,
  };
}
