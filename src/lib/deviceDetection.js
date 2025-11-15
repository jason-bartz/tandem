/**
 * Device detection utilities for responsive mobile-first layout
 * Helps distinguish between phone, tablet, and desktop devices
 * Following Apple HIG and mobile best practices
 */

import { useState, useEffect } from 'react';

/**
 * Breakpoints for device detection
 * Phones: <= 768px width AND <= 1000px height (includes modern iPhones with notch/Dynamic Island)
 * Tablets: > 768px width OR > 1000px height
 */
export const DEVICE_BREAKPOINTS = {
  PHONE_WIDTH: 768,
  PHONE_HEIGHT: 1000, // Updated to include iPhone 14/15 Pro Max (~930px)
  SMALL_PHONE_HEIGHT: 700, // iPhone SE, compact devices
  LARGE_PHONE_HEIGHT: 1000, // Modern iPhone Pro Max
};

/**
 * Detect if current device is a phone-sized screen
 * @returns {boolean} true if phone, false if tablet/desktop
 */
export function isMobilePhone() {
  if (typeof window === 'undefined') return false;

  return (
    window.innerWidth <= DEVICE_BREAKPOINTS.PHONE_WIDTH &&
    window.innerHeight <= DEVICE_BREAKPOINTS.PHONE_HEIGHT
  );
}

/**
 * Detect if current device is a small phone (compact screen)
 * @returns {boolean} true if small phone like iPhone SE
 */
export function isSmallPhone() {
  if (typeof window === 'undefined') return false;

  return (
    window.innerWidth <= DEVICE_BREAKPOINTS.PHONE_WIDTH &&
    window.innerHeight < DEVICE_BREAKPOINTS.SMALL_PHONE_HEIGHT
  );
}

/**
 * React hook to detect mobile phone with reactive updates
 * Updates when window is resized or orientation changes
 * @returns {object} Device detection state
 */
export function useDeviceType() {
  const [deviceType, setDeviceType] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        isMobilePhone: false,
        isSmallPhone: false,
        isTablet: false,
        viewportHeight: 0,
        viewportWidth: 0,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPhone =
      width <= DEVICE_BREAKPOINTS.PHONE_WIDTH && height <= DEVICE_BREAKPOINTS.PHONE_HEIGHT;
    const isSmall = isPhone && height < DEVICE_BREAKPOINTS.SMALL_PHONE_HEIGHT;

    return {
      isMobilePhone: isPhone,
      isSmallPhone: isSmall,
      isTablet: !isPhone,
      viewportHeight: height,
      viewportWidth: width,
    };
  });

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPhone =
        width <= DEVICE_BREAKPOINTS.PHONE_WIDTH && height <= DEVICE_BREAKPOINTS.PHONE_HEIGHT;
      const isSmall = isPhone && height < DEVICE_BREAKPOINTS.SMALL_PHONE_HEIGHT;

      setDeviceType({
        isMobilePhone: isPhone,
        isSmallPhone: isSmall,
        isTablet: !isPhone,
        viewportHeight: height,
        viewportWidth: width,
      });
    };

    // Listen for resize and orientation changes
    window.addEventListener('resize', updateDeviceType);
    window.addEventListener('orientationchange', updateDeviceType);

    return () => {
      window.removeEventListener('resize', updateDeviceType);
      window.removeEventListener('orientationchange', updateDeviceType);
    };
  }, []);

  return deviceType;
}

/**
 * Get device-specific CSS classes for conditional styling
 * @returns {string} CSS class names
 */
export function getDeviceClasses() {
  if (typeof window === 'undefined') return '';

  const classes = [];

  if (isMobilePhone()) {
    classes.push('mobile-phone-layout');
  }

  if (isSmallPhone()) {
    classes.push('small-phone-layout');
  }

  return classes.join(' ');
}

/**
 * Calculate optimal component sizes based on viewport
 * @returns {object} Size configuration
 */
export function getResponsiveSizes() {
  if (typeof window === 'undefined') {
    return {
      puzzleRowHeight: 70,
      keyboardHeight: 48,
      headerHeight: 120,
      spacing: 16,
    };
  }

  const height = window.innerHeight;

  // Small phones: compact sizing
  if (height < DEVICE_BREAKPOINTS.SMALL_PHONE_HEIGHT) {
    return {
      puzzleRowHeight: 56,
      keyboardHeight: 40,
      headerHeight: 100,
      spacing: 8,
    };
  }

  // Medium phones: standard sizing
  if (height < DEVICE_BREAKPOINTS.LARGE_PHONE_HEIGHT) {
    return {
      puzzleRowHeight: 64,
      keyboardHeight: 44,
      headerHeight: 110,
      spacing: 12,
    };
  }

  // Large phones/tablets: comfortable sizing
  return {
    puzzleRowHeight: 70,
    keyboardHeight: 48,
    headerHeight: 120,
    spacing: 16,
  };
}
