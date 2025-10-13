/**
 * Custom hook for managing animation states
 * Provides utilities for triggering and controlling micro-animations
 * with automatic reduce motion support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { applyAnimation, animateCounter, triggerAnimation } from '@/lib/microAnimations';

/**
 * Main animation hook
 * @returns {object} Animation utilities and state
 */
export function useAnimation() {
  const { reduceMotion } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Apply animation class with automatic cleanup
   * @param {string} animationName - Animation to apply
   * @param {string} fallback - Fallback for reduced motion
   */
  const getAnimation = useCallback(
    (animationName, fallback = 'none') => {
      return applyAnimation(reduceMotion, animationName, fallback);
    },
    [reduceMotion]
  );

  /**
   * Check if animations should run
   */
  const shouldAnimate = useCallback(() => {
    return !reduceMotion;
  }, [reduceMotion]);

  /**
   * Trigger a one-time animation on an element
   * @param {HTMLElement} element - Target element
   * @param {string} className - Animation class
   * @param {function} callback - Optional callback on complete
   */
  const animate = useCallback(
    (element, className, callback) => {
      if (!shouldAnimate()) {
        if (callback) callback();
        return;
      }

      setIsAnimating(true);
      triggerAnimation(element, className, () => {
        setIsAnimating(false);
        if (callback) callback();
      });
    },
    [shouldAnimate]
  );

  return {
    getAnimation,
    shouldAnimate,
    animate,
    isAnimating,
    reduceMotion,
  };
}

/**
 * Hook for counter animations
 * @param {number} targetValue - Target number to count to
 * @param {object} options - Animation options
 */
export function useCounterAnimation(targetValue, options = {}) {
  const { duration = 800, onUpdate } = options;
  const { reduceMotion } = useTheme();
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    if (reduceMotion) {
      // Skip animation, set immediately
      setDisplayValue(targetValue);
      if (onUpdate) onUpdate(targetValue);
      return;
    }

    if (targetValue === previousValue.current) return;

    animateCounter(previousValue.current, targetValue, duration, (current) => {
      setDisplayValue(current);
      if (onUpdate) onUpdate(current);
    });

    previousValue.current = targetValue;
  }, [targetValue, duration, reduceMotion, onUpdate]);

  return displayValue;
}

/**
 * Hook for staggered list animations
 * @param {number} itemCount - Number of items
 * @param {number} baseDelay - Base delay in ms (default 80)
 */
export function useStaggerAnimation(itemCount, baseDelay = 80) {
  const { reduceMotion } = useTheme();

  const getStaggerDelay = useCallback(
    (index) => {
      if (reduceMotion) return '0ms';
      return `${index * baseDelay}ms`;
    },
    [reduceMotion, baseDelay]
  );

  const getStaggerStyle = useCallback(
    (index) => {
      return {
        animationDelay: getStaggerDelay(index),
      };
    },
    [getStaggerDelay]
  );

  return { getStaggerDelay, getStaggerStyle };
}

/**
 * Hook for hover animations (desktop only)
 * @returns {object} Hover state and handlers
 */
export function useHoverAnimation() {
  const { reduceMotion } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!reduceMotion) setIsHovered(true);
  }, [reduceMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsPressed(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!reduceMotion) setIsPressed(true);
  }, [reduceMotion]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  return {
    isHovered,
    isPressed,
    hoverHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
    },
  };
}

/**
 * Hook for touch animations (mobile)
 * @returns {object} Touch state and handlers
 */
export function useTouchAnimation() {
  const { reduceMotion } = useTheme();
  const [isTouched, setIsTouched] = useState(false);

  const handleTouchStart = useCallback(() => {
    if (!reduceMotion) setIsTouched(true);
  }, [reduceMotion]);

  const handleTouchEnd = useCallback(() => {
    setIsTouched(false);
  }, []);

  return {
    isTouched,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for progress bar animations
 * @param {number} targetProgress - Target progress (0-100)
 * @param {number} duration - Animation duration in ms
 */
export function useProgressAnimation(targetProgress, duration = 800) {
  const { reduceMotion } = useTheme();
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setCurrentProgress(targetProgress);
      return;
    }

    const startTime = performance.now();
    const lastProgress = currentProgress;
    const progressDiff = targetProgress - lastProgress;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const newProgress = lastProgress + progressDiff * eased;

      setCurrentProgress(newProgress);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress, duration, reduceMotion]);

  return currentProgress;
}

/**
 * Hook for pulsing animations
 * @param {boolean} shouldPulse - Whether to pulse
 * @param {number} interval - Pulse interval in ms
 */
export function usePulseAnimation(shouldPulse = true, interval = 2000) {
  const { reduceMotion } = useTheme();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (!shouldPulse || reduceMotion) {
      setIsPulsing(false);
      return;
    }

    const pulseTimer = setInterval(() => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);
    }, interval);

    return () => clearInterval(pulseTimer);
  }, [shouldPulse, interval, reduceMotion]);

  return isPulsing;
}

/**
 * Hook for CSS variable-based animations
 */
export function useCSSAnimation() {
  const setCSSVar = useCallback((property, value) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(property, value);
    }
  }, []);

  const removeCSSVar = useCallback((property) => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty(property);
    }
  }, []);

  return { setCSSVar, removeCSSVar };
}

/**
 * Hook for sequential animations
 * @param {Array<Function>} animationSteps - Array of animation functions
 * @param {Array<number>} delays - Delay after each step in ms
 */
export function useSequentialAnimation(animationSteps, delays) {
  const { reduceMotion } = useTheme();
  const [currentStep, setCurrentStep] = useState(-1);

  const start = useCallback(() => {
    if (reduceMotion) {
      // Execute all steps immediately
      animationSteps.forEach((step) => step());
      return;
    }

    setCurrentStep(0);
  }, [animationSteps, reduceMotion]);

  useEffect(() => {
    if (currentStep === -1 || currentStep >= animationSteps.length) return;

    // Execute current step
    animationSteps[currentStep]();

    // Schedule next step
    const delay = delays[currentStep] || 0;
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [currentStep, animationSteps, delays]);

  const reset = useCallback(() => {
    setCurrentStep(-1);
  }, []);

  return { start, reset, currentStep };
}

export default {
  useAnimation,
  useCounterAnimation,
  useStaggerAnimation,
  useHoverAnimation,
  useTouchAnimation,
  useProgressAnimation,
  usePulseAnimation,
  useCSSAnimation,
  useSequentialAnimation,
};
