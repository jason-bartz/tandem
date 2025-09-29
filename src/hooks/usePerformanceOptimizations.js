/**
 * Performance optimization hooks
 * Provides memoized values and callbacks to prevent unnecessary re-renders
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Debounced callback hook
 */
export function useDebouncedCallback(callback, delay) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback(callback, delay) {
  const lastRunRef = useRef(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastRunRef.current >= delay) {
      lastRunRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]);
}

/**
 * Memoized game stats calculation
 */
export function useMemoizedStats(stats) {
  return useMemo(() => {
    if (!stats) {return null;}

    const winRate = stats.played > 0
      ? Math.round((stats.won / stats.played) * 100)
      : 0;

    const averageTime = stats.totalTime && stats.played
      ? Math.round(stats.totalTime / stats.played)
      : 0;

    const averageMistakes = stats.totalMistakes && stats.played
      ? (stats.totalMistakes / stats.played).toFixed(1)
      : '0';

    return {
      ...stats,
      winRate,
      averageTime,
      averageMistakes
    };
  }, [stats]);
}

/**
 * Memoized puzzle data transformation
 */
export function useMemoizedPuzzleData(puzzle) {
  return useMemo(() => {
    if (!puzzle) {return null;}

    return {
      ...puzzle,
      formattedDate: puzzle.date ? new Date(puzzle.date).toLocaleDateString() : '',
      puzzleCount: puzzle.puzzles ? puzzle.puzzles.length : 0,
      isValid: puzzle.puzzles && puzzle.puzzles.length === 4,
      answers: puzzle.puzzles ? puzzle.puzzles.map(p => p.answer) : []
    };
  }, [puzzle]);
}

/**
 * Lazy value hook - only computes when needed
 */
export function useLazyValue(computeFn, deps = []) {
  const valueRef = useRef(null);
  const depsRef = useRef(deps);
  const isComputedRef = useRef(false);

  // Check if deps changed
  const depsChanged = deps.length !== depsRef.current.length ||
    deps.some((dep, i) => dep !== depsRef.current[i]);

  if (depsChanged) {
    depsRef.current = deps;
    isComputedRef.current = false;
  }

  return useCallback(() => {
    if (!isComputedRef.current) {
      valueRef.current = computeFn();
      isComputedRef.current = true;
    }
    return valueRef.current;
  }, [computeFn]);
}

/**
 * Intersection Observer hook for lazy loading
 */
export function useIntersectionObserver(options = {}) {
  const elementRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {return;}

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '0px'
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin]);

  return [elementRef, isIntersecting];
}

/**
 * Request Animation Frame hook
 */
export function useAnimationFrame(callback) {
  const requestRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time) => {
    callbackRef.current(time);
    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
}

/**
 * Virtual list hook for long lists
 */
export function useVirtualList(items, itemHeight, containerHeight) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    return {
      items: items.slice(startIndex, endIndex + 1),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll
  };
}