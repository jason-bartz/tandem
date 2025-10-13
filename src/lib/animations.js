/**
 * Unified Animation System for Tandem
 * Following Apple Human Interface Guidelines for iOS
 * All animations optimized for 60fps performance on mobile devices
 */

// ============================================
// TIMING CONSTANTS (Apple HIG Standards)
// ============================================

export const TIMING = {
  // Quick interactions (micro-interactions)
  INSTANT: 100, // Button taps, immediate feedback
  FAST: 200, // Subtle state changes

  // Standard transitions (most common)
  STANDARD: 300, // Modal open/close, card flips

  // Prominent transitions (scene changes)
  PROMINENT: 350, // Screen transitions, important state changes

  // Celebration/emphasis
  CELEBRATION: 500, // Success animations, confetti
  EXTENDED: 600, // Complex multi-step animations
};

// ============================================
// EASING CURVES (iOS Native Feel)
// ============================================

export const EASING = {
  // Standard iOS easings
  EASE_IN_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)', // Standard smooth
  EASE_OUT: 'cubic-bezier(0, 0, 0.58, 1)', // Deceleration
  EASE_IN: 'cubic-bezier(0.42, 0, 1, 1)', // Acceleration

  // Spring/bounce (premium feel)
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Gentle overshoot
  SPRING_SOFT: 'cubic-bezier(0.5, 1.2, 0.5, 1)', // Subtle bounce
  SPRING_BOUNCY: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Pronounced bounce

  // Sharp/snappy
  SHARP: 'cubic-bezier(0.4, 0, 0.6, 1)', // Quick and precise

  // iOS system curves
  IOS_DEFAULT: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // iOS standard
  IOS_EASE_IN: 'cubic-bezier(0.42, 0, 1, 1)',
  IOS_EASE_OUT: 'cubic-bezier(0, 0, 0.58, 1)',
};

// ============================================
// ANIMATION PRESETS
// ============================================

/**
 * Page/Screen transitions
 */
export const SCREEN_TRANSITIONS = {
  // Entering from right (new screen)
  slideInRight: {
    keyframes: `
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `,
    animation: `slideInRight ${TIMING.PROMINENT}ms ${EASING.EASE_OUT}`,
  },

  // Exiting to left (current screen)
  slideOutLeft: {
    keyframes: `
      @keyframes slideOutLeft {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(-30px);
        }
      }
    `,
    animation: `slideOutLeft ${TIMING.STANDARD}ms ${EASING.EASE_IN}`,
  },

  // Entering from bottom (sheet-like)
  slideUpFromBottom: {
    keyframes: `
      @keyframes slideUpFromBottom {
        from {
          opacity: 0;
          transform: translateY(40px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    animation: `slideUpFromBottom ${TIMING.PROMINENT}ms ${EASING.EASE_OUT}`,
  },

  // Fade with scale (zoom in)
  fadeZoomIn: {
    keyframes: `
      @keyframes fadeZoomIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
    animation: `fadeZoomIn ${TIMING.PROMINENT}ms ${EASING.EASE_OUT}`,
  },
};

/**
 * Modal animations
 */
export const MODAL_ANIMATIONS = {
  // Modal entrance (scale + fade)
  modalEnter: {
    keyframes: `
      @keyframes modalEnter {
        from {
          opacity: 0;
          transform: scale(0.92) translateY(10px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
    animation: `modalEnter ${TIMING.STANDARD}ms ${EASING.SPRING_SOFT}`,
  },

  // Modal exit
  modalExit: {
    keyframes: `
      @keyframes modalExit {
        from {
          opacity: 1;
          transform: scale(1);
        }
        to {
          opacity: 0;
          transform: scale(0.95);
        }
      }
    `,
    animation: `modalExit ${TIMING.FAST}ms ${EASING.EASE_IN}`,
  },

  // Backdrop fade
  backdropFadeIn: {
    keyframes: `
      @keyframes backdropFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
    animation: `backdropFadeIn ${TIMING.FAST}ms ${EASING.EASE_OUT}`,
  },
};

/**
 * Micro-interactions
 */
export const MICRO_INTERACTIONS = {
  // Button press (tap feedback)
  buttonTap: {
    keyframes: `
      @keyframes buttonTap {
        0% { transform: scale(1); }
        50% { transform: scale(0.97); }
        100% { transform: scale(1); }
      }
    `,
    animation: `buttonTap ${TIMING.INSTANT}ms ${EASING.SHARP}`,
  },

  // Correct answer feedback
  correctPulse: {
    keyframes: `
      @keyframes correctPulse {
        0% { transform: scale(1); }
        25% { transform: scale(1.02); }
        50% { transform: scale(0.98); }
        75% { transform: scale(1.01); }
        100% { transform: scale(1); }
      }
    `,
    animation: `correctPulse ${TIMING.PROMINENT}ms ${EASING.SPRING_SOFT}`,
  },

  // Wrong answer shake
  errorShake: {
    keyframes: `
      @keyframes errorShake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-3px); }
        80% { transform: translateX(3px); }
      }
    `,
    animation: `errorShake ${TIMING.PROMINENT}ms ${EASING.SHARP}`,
  },

  // Hint letter reveal
  letterReveal: {
    keyframes: `
      @keyframes letterReveal {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        50% {
          transform: scale(1.1);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
    animation: `letterReveal ${TIMING.STANDARD}ms ${EASING.SPRING_SOFT}`,
  },

  // Gentle float (for emphasis)
  gentleFloat: {
    keyframes: `
      @keyframes gentleFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
      }
    `,
    animation: `gentleFloat 2s ${EASING.EASE_IN_OUT} infinite`,
  },
};

/**
 * List/stagger animations
 */
export const LIST_ANIMATIONS = {
  // Fade in from bottom (for list items)
  fadeInUp: {
    keyframes: `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    animation: `fadeInUp ${TIMING.STANDARD}ms ${EASING.EASE_OUT}`,
  },

  // Scale fade (for cards)
  scaleFadeIn: {
    keyframes: `
      @keyframes scaleFadeIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `,
    animation: `scaleFadeIn ${TIMING.STANDARD}ms ${EASING.EASE_OUT}`,
  },
};

/**
 * Celebration animations
 */
export const CELEBRATION_ANIMATIONS = {
  // Success bounce
  successBounce: {
    keyframes: `
      @keyframes successBounce {
        0% {
          opacity: 0;
          transform: scale(0.3) translateY(-20px);
        }
        50% {
          opacity: 0.9;
          transform: scale(1.05) translateY(-5px);
        }
        70% {
          transform: scale(0.95) translateY(0);
        }
        100% {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `,
    animation: `successBounce ${TIMING.EXTENDED}ms ${EASING.SPRING_BOUNCY}`,
  },

  // Pulse glow (for achievements)
  pulseGlow: {
    keyframes: `
      @keyframes pulseGlow {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.05);
        }
      }
    `,
    animation: `pulseGlow 2s ${EASING.EASE_IN_OUT} infinite`,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate stagger delay for list items
 * @param {number} index - Item index in list
 * @param {number} baseDelay - Base delay in ms (default 50ms)
 * @returns {string} CSS delay value
 */
export function getStaggerDelay(index, baseDelay = 50) {
  return `${index * baseDelay}ms`;
}

/**
 * Create a CSS animation string
 * @param {string} name - Animation name
 * @param {number} duration - Duration in ms
 * @param {string} easing - Easing function
 * @param {number} delay - Delay in ms
 * @returns {string} Complete animation CSS string
 */
export function createAnimation(name, duration, easing = EASING.EASE_OUT, delay = 0) {
  return `${name} ${duration}ms ${easing} ${delay}ms both`;
}

/**
 * Check if user prefers reduced motion (system setting OR manual override)
 * @returns {boolean} True if reduced motion is preferred
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;

  // Check for manual user preference first
  const userPreference = localStorage.getItem('tandemReduceMotion');
  if (userPreference !== null) {
    return userPreference === 'true';
  }

  // Fallback to system preference
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if animations should be displayed
 * @returns {boolean} True if animations should be shown
 */
export function shouldAnimate() {
  return !prefersReducedMotion();
}

/**
 * Get animation duration based on reduced motion preference
 * @param {number} normalDuration - Normal duration in ms
 * @returns {number} Adjusted duration (0ms if reduced motion enabled)
 */
export function getAnimationDuration(normalDuration) {
  return prefersReducedMotion() ? 0 : normalDuration;
}

/**
 * Apply animation class with automatic cleanup
 * @param {HTMLElement} element - Target element
 * @param {string} animationClass - CSS class to apply
 * @param {number} duration - Duration in ms
 */
export function applyTemporaryAnimation(element, animationClass, duration) {
  if (!element) return;

  // If reduced motion is enabled, skip the animation entirely
  if (prefersReducedMotion()) return;

  element.classList.add(animationClass);

  setTimeout(() => {
    element.classList.remove(animationClass);
  }, duration);
}

// ============================================
// CSS CLASS UTILITIES (for Tailwind)
// ============================================

/**
 * Generate Tailwind-compatible animation classes
 */
export const ANIMATION_CLASSES = {
  // Screen transitions
  'screen-enter': 'animate-screen-enter',
  'screen-exit': 'animate-screen-exit',

  // Modal
  'modal-enter': 'animate-modal-enter',
  'modal-exit': 'animate-modal-exit',
  'backdrop-enter': 'animate-backdrop-enter',

  // Interactions
  'button-tap': 'animate-button-tap',
  'correct-pulse': 'animate-correct-pulse',
  'error-shake': 'animate-error-shake',
  'letter-reveal': 'animate-letter-reveal',

  // Lists
  'fade-in-up': 'animate-fade-in-up',
  'scale-fade-in': 'animate-scale-fade-in',

  // Celebrations
  'success-bounce': 'animate-success-bounce',
  'pulse-glow': 'animate-pulse-glow',
};

// ============================================
// PERFORMANCE OPTIMIZATION HINTS
// ============================================

/**
 * Apply will-change hint for complex animations
 * @param {HTMLElement} element
 * @param {string[]} properties - CSS properties that will change
 */
export function applyWillChange(element, properties = ['transform', 'opacity']) {
  if (!element) return;
  element.style.willChange = properties.join(', ');
}

/**
 * Remove will-change hint after animation
 * @param {HTMLElement} element
 */
export function removeWillChange(element) {
  if (!element) return;
  element.style.willChange = 'auto';
}

/**
 * Optimize element for animations
 * @param {HTMLElement} element
 */
export function optimizeForAnimation(element) {
  if (!element) return;

  // Create new stacking context
  element.style.transform = 'translateZ(0)';
  element.style.backfaceVisibility = 'hidden';
  element.style.perspective = '1000px';
}

export default {
  TIMING,
  EASING,
  SCREEN_TRANSITIONS,
  MODAL_ANIMATIONS,
  MICRO_INTERACTIONS,
  LIST_ANIMATIONS,
  CELEBRATION_ANIMATIONS,
  ANIMATION_CLASSES,
  getStaggerDelay,
  createAnimation,
  prefersReducedMotion,
  shouldAnimate,
  getAnimationDuration,
  applyTemporaryAnimation,
  applyWillChange,
  removeWillChange,
  optimizeForAnimation,
};
