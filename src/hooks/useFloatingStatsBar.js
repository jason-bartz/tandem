import { useState, useEffect, useRef, useCallback } from 'react';

const HEADER_STATE = {
  FULL_HEADER: 'FULL_HEADER',
  COMPACT_VISIBLE: 'COMPACT_VISIBLE',
  COMPACT_HIDDEN: 'COMPACT_HIDDEN',
};

// Hysteresis thresholds to prevent oscillation
const SCROLL_THRESHOLD_DOWN = 20; // Show compact when scrolling down past this
const SCROLL_THRESHOLD_UP = 10; // Show full when scrolling to very top (must be very close to top)

export function useFloatingStatsBar({ gameStarted, gameWon, gameOver }) {
  const [headerState, setHeaderState] = useState(HEADER_STATE.FULL_HEADER);
  const [scrollY, setScrollY] = useState(0);
  const [showNavRow, setShowNavRow] = useState(false); // Track nav row visibility - hidden by default
  const scrollContainerRef = useRef(null);
  const rafIdRef = useRef(null);
  const headerStateRef = useRef(HEADER_STATE.FULL_HEADER); // Track state without causing re-renders
  const scrollDetectionEnabledRef = useRef(false); // Cooldown flag

  // Keep ref in sync with state
  useEffect(() => {
    headerStateRef.current = headerState;
  }, [headerState]);

  // Handle header/nav state based on game status
  useEffect(() => {
    // When game ends, reset to full header with nav row visible
    if (gameWon || gameOver) {
      setHeaderState(HEADER_STATE.FULL_HEADER);
      setShowNavRow(true); // Show nav row when game ended
      scrollDetectionEnabledRef.current = false;
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    let cooldownTimer = null;

    if (!gameStarted) {
      // Before game starts: full header at top, nav row hidden initially
      setHeaderState(HEADER_STATE.FULL_HEADER);
      setShowNavRow(false); // Hide nav row for cleaner initial appearance
      scrollDetectionEnabledRef.current = true; // Enable scroll detection to reveal nav
    } else {
      // Show compact bar after brief delay when game starts
      scrollDetectionEnabledRef.current = false;
      cooldownTimer = setTimeout(() => {
        scrollDetectionEnabledRef.current = true;
        // Always show compact bar after game starts (no scroll needed)
        setHeaderState(HEADER_STATE.COMPACT_VISIBLE);
        setShowNavRow(false); // Hide nav row when compact bar appears
      }, 500); // 500ms delay for smooth transition
    }

    let lastScrollY = container.scrollTop;
    let hasScrolled = false; // Track if user has scrolled at all

    const handleScroll = () => {
      if (rafIdRef.current) return;

      rafIdRef.current = requestAnimationFrame(() => {
        const currentScrollY = container.scrollTop;
        const currentState = headerStateRef.current;
        const scrollingDown = currentScrollY > lastScrollY;

        setScrollY(currentScrollY);

        // Mark that user has scrolled
        if (!hasScrolled && Math.abs(currentScrollY - lastScrollY) > 2) {
          hasScrolled = true;
        }

        // Only perform state transitions if cooldown period is over
        if (scrollDetectionEnabledRef.current) {
          // Hysteresis logic to prevent flickering
          if (currentState === HEADER_STATE.FULL_HEADER) {
            // Show nav row when at very top and user has interacted
            if (currentScrollY < SCROLL_THRESHOLD_UP && hasScrolled) {
              setShowNavRow(true);
            }
            // Only transition to compact when scrolled down past threshold (and game started)
            if (gameStarted && scrollingDown && currentScrollY > SCROLL_THRESHOLD_DOWN) {
              setHeaderState(HEADER_STATE.COMPACT_VISIBLE);
              setShowNavRow(false); // Hide nav row when switching to compact
            }
          } else if (currentState === HEADER_STATE.COMPACT_VISIBLE) {
            // Only transition back to full when scrolled up past lower threshold
            if (!scrollingDown && currentScrollY < SCROLL_THRESHOLD_UP) {
              setHeaderState(HEADER_STATE.FULL_HEADER);
              setShowNavRow(true); // Show nav row when switching to full header
            }
          } else if (currentState === HEADER_STATE.COMPACT_HIDDEN) {
            // Allow scrolling to reveal full header or compact bar even when hidden
            if (currentScrollY < SCROLL_THRESHOLD_UP) {
              setHeaderState(HEADER_STATE.FULL_HEADER);
              setShowNavRow(true); // Show nav row with full header
            } else if (currentScrollY > SCROLL_THRESHOLD_DOWN) {
              setHeaderState(HEADER_STATE.COMPACT_VISIBLE);
              setShowNavRow(false); // Hide nav row with compact bar
            }
          }
        }

        lastScrollY = currentScrollY;
        rafIdRef.current = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (cooldownTimer) clearTimeout(cooldownTimer);
      container.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [gameStarted, gameWon, gameOver]); // Remove headerState from dependencies

  const showStatsBar = useCallback(() => {
    setHeaderState(HEADER_STATE.COMPACT_VISIBLE);
  }, []);

  const hideStatsBar = useCallback(() => {
    setHeaderState(HEADER_STATE.COMPACT_HIDDEN);
  }, []);

  return {
    headerState,
    scrollY,
    scrollContainerRef,
    showStatsBar,
    hideStatsBar,
    showNavRow,
    isCompactVisible: headerState === HEADER_STATE.COMPACT_VISIBLE,
    isCompactHidden: headerState === HEADER_STATE.COMPACT_HIDDEN,
    isFullHeader: headerState === HEADER_STATE.FULL_HEADER,
  };
}
