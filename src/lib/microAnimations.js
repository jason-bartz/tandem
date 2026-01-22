/**
 * Micro-Animation Definitions for Tandem
 * Subtle, delightful animations following Apple HIG standards
 * All animations respect reduce motion preferences
 */

// ============================================
// ANSWER ROW ANIMATIONS (1.3)
// ============================================

export const ANSWER_ANIMATIONS = {
  // Multi-stage correct answer celebration
  correctCelebration: {
    keyframes: `
      @keyframes correctCelebration {
        0% {
          transform: scale(1);
        }
        10% {
          transform: scale(0.98);
        }
        40% {
          transform: scale(1.02);
        }
        60% {
          transform: scale(0.99);
        }
        80% {
          transform: scale(1.01);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
    animation: 'correctCelebration 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Gradient sweep for correct answer
  gradientSweep: {
    keyframes: `
      @keyframes gradientSweep {
        0% {
          background-position: 200% center;
        }
        100% {
          background-position: -200% center;
        }
      }
    `,
    animation: 'gradientSweep 800ms ease-out',
  },

  // Soft glow pulse
  softGlowPulse: {
    keyframes: `
      @keyframes softGlowPulse {
        0%, 100% {
          box-shadow: 0 0 0 rgba(13, 148, 136, 0);
        }
        50% {
          box-shadow: 0 0 20px rgba(13, 148, 136, 0.4);
        }
      }
    `,
    animation: 'softGlowPulse 2s ease-in-out infinite',
  },

  // Enhanced shake with rotation
  enhancedShake: {
    keyframes: `
      @keyframes enhancedShake {
        0%, 100% {
          transform: translateX(0) rotate(0deg);
        }
        10% {
          transform: translateX(-8px) rotate(-1deg);
        }
        30% {
          transform: translateX(8px) rotate(1deg);
        }
        50% {
          transform: translateX(-6px) rotate(-0.5deg);
        }
        70% {
          transform: translateX(6px) rotate(0.5deg);
        }
        90% {
          transform: translateX(-2px) rotate(0deg);
        }
      }
    `,
    animation: 'enhancedShake 500ms cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Focus ring breathing pulse
  focusPulse: {
    keyframes: `
      @keyframes focusPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.5);
        }
        50% {
          transform: scale(1.01);
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.3);
        }
      }
    `,
    animation: 'focusPulse 2s ease-in-out infinite',
  },
};

// ============================================
// EMOJI ANIMATIONS (1.4)
// ============================================

export const EMOJI_ANIMATIONS = {
  // Subtle 3D hover tilt (desktop only)
  hoverTilt: {
    keyframes: `
      @keyframes hoverTilt {
        0% {
          transform: perspective(500px) rotateY(0deg) rotateX(0deg);
        }
        100% {
          transform: perspective(500px) rotateY(5deg) rotateX(-5deg);
        }
      }
    `,
    animation: 'hoverTilt 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  },

  // Touch squish and bounce
  touchSquish: {
    keyframes: `
      @keyframes touchSquish {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(0.92);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
    animation: 'touchSquish 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Victory wiggle for solved emojis
  victoryWiggle: {
    keyframes: `
      @keyframes victoryWiggle {
        0%, 100% {
          transform: rotate(0deg);
        }
        25% {
          transform: rotate(-8deg) scale(1.1);
        }
        75% {
          transform: rotate(8deg) scale(1.1);
        }
      }
    `,
    animation: 'victoryWiggle 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Gentle loading pulse
  loadingPulse: {
    keyframes: `
      @keyframes loadingPulse {
        0%, 100% {
          opacity: 0.6;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.05);
        }
      }
    `,
    animation: 'loadingPulse 1.5s ease-in-out infinite',
  },
};

// ============================================
// STATS & COUNTER ANIMATIONS (2.1, 2.2)
// ============================================

export const STATS_ANIMATIONS = {
  // Number count-up animation
  countUp: {
    keyframes: `
      @keyframes countUp {
        0% {
          transform: translateY(10px);
          opacity: 0;
        }
        100% {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
    animation: 'countUp 400ms cubic-bezier(0, 0, 0.2, 1)',
  },

  // Micro-bounce for timer updates
  timerBounce: {
    keyframes: `
      @keyframes timerBounce {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.08);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
    animation: 'timerBounce 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Milestone celebration burst
  milestoneBurst: {
    keyframes: `
      @keyframes milestoneBurst {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
        }
        50% {
          transform: scale(1.15);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
        }
      }
    `,
    animation: 'milestoneBurst 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Staggered modal entry
  staggerEntry: (index) => ({
    animationDelay: `${index * 80}ms`,
  }),

  // Progress bar fill
  progressFill: {
    keyframes: `
      @keyframes progressFill {
        0% {
          width: 0%;
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        100% {
          width: var(--target-width);
          opacity: 1;
        }
      }
    `,
    animation: 'progressFill 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  },
};

// ============================================
// BUTTON ANIMATIONS (3.1, 3.2, 3.3)
// ============================================

export const BUTTON_ANIMATIONS = {
  // Hover lift (desktop)
  hoverLift: {
    keyframes: `
      @keyframes hoverLift {
        0% {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        100% {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      }
    `,
    animation: 'hoverLift 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  },

  // Touch press
  touchPress: {
    keyframes: `
      @keyframes touchPress {
        0% {
          transform: scale(1);
        }
        100% {
          transform: scale(0.96);
        }
      }
    `,
    animation: 'touchPress 100ms cubic-bezier(0.4, 0, 1, 1) forwards',
  },

  // Spring release
  springRelease: {
    keyframes: `
      @keyframes springRelease {
        0% {
          transform: scale(0.96);
        }
        50% {
          transform: scale(1.02);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
    animation: 'springRelease 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // Icon rotation
  iconRotate: {
    keyframes: `
      @keyframes iconRotate {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(5deg);
        }
      }
    `,
    animation: 'iconRotate 150ms ease-out forwards',
  },

  // Disabled pulse
  disabledPulse: {
    keyframes: `
      @keyframes disabledPulse {
        0%, 100% {
          opacity: 0.5;
        }
        50% {
          opacity: 0.7;
        }
      }
    `,
    animation: 'disabledPulse 2s ease-in-out infinite',
  },

  // Toggle slide
  toggleSlide: {
    keyframes: `
      @keyframes toggleSlide {
        0% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(var(--slide-distance));
        }
      }
    `,
    animation: 'toggleSlide 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },

  // Toggle background morph
  toggleMorph: {
    keyframes: `
      @keyframes toggleMorph {
        0% {
          background: var(--color-from);
        }
        100% {
          background: var(--color-to);
        }
      }
    `,
    animation: 'toggleMorph 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },

  // Close button rotate
  closeRotate: {
    keyframes: `
      @keyframes closeRotate {
        0% {
          transform: rotate(0deg) scale(1);
        }
        100% {
          transform: rotate(90deg) scale(0.9);
        }
      }
    `,
    animation: 'closeRotate 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  },

  // Background pulse (hover)
  backgroundPulse: {
    keyframes: `
      @keyframes backgroundPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.9;
        }
      }
    `,
    animation: 'backgroundPulse 1.5s ease-in-out infinite',
  },
};

// ============================================
// LOADING ANIMATIONS (4.2)
// ============================================

export const LOADING_ANIMATIONS = {
  // Enhanced skeleton shimmer
  skeletonShimmer: {
    keyframes: `
      @keyframes skeletonShimmer {
        0% {
          background-position: -1000px 0;
        }
        100% {
          background-position: 1000px 0;
        }
      }
    `,
    animation: 'skeletonShimmer 2s ease-in-out infinite',
    background: `linear-gradient(
      90deg,
      rgba(200, 200, 200, 0.1) 0%,
      rgba(200, 200, 200, 0.3) 20%,
      rgba(255, 255, 255, 0.5) 40%,
      rgba(200, 200, 200, 0.3) 60%,
      rgba(200, 200, 200, 0.1) 100%
    )`,
    backgroundSize: '1000px 100%',
  },

  // iOS-style spinner
  iosSpinner: {
    keyframes: `
      @keyframes iosSpinner {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
    animation: 'iosSpinner 1s linear infinite',
  },

  // Progressive stagger fade
  progressiveFade: (index) => ({
    opacity: 0,
    animation: 'fadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
    animationDelay: `${index * 100}ms`,
  }),
};

// ============================================
// EMPTY STATE ANIMATIONS (4.3)
// ============================================

export const EMPTY_STATE_ANIMATIONS = {
  // Gentle float
  gentleFloat: {
    keyframes: `
      @keyframes gentleFloat {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }
    `,
    animation: 'gentleFloat 3s ease-in-out infinite',
  },

  // Content fade-in
  contentFadeIn: {
    keyframes: `
      @keyframes contentFadeIn {
        0% {
          opacity: 0;
          transform: translateY(10px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
    animation: 'contentFadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
  },
};

// ============================================
// SHARE BUTTON ANIMATIONS (5.2)
// ============================================

export const SHARE_ANIMATIONS = {
  // Attention pulse with glow
  attentionPulse: {
    keyframes: `
      @keyframes attentionPulse {
        0%, 100% {
          transform: scale(1);
          box-shadow: 3px 3px 0px rgba(0,0,0,1);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 3px 3px 0px rgba(0,0,0,1), 0 0 20px rgba(74, 222, 128, 0.5);
        }
      }
    `,
    animation: 'attentionPulse 2s ease-in-out infinite',
  },

  // Hover shine
  hoverShine: {
    keyframes: `
      @keyframes hoverShine {
        0% {
          background-position: -100% center;
        }
        100% {
          background-position: 200% center;
        }
      }
    `,
    animation: 'hoverShine 600ms ease-out',
  },

  // Success burst
  successBurst: {
    keyframes: `
      @keyframes successBurst {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.15);
        }
        100% {
          transform: scale(1);
        }
      }
    `,
    animation: 'successBurst 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Apply animation with reduce motion check
 * @param {boolean} reduceMotion - Reduce motion preference
 * @param {string} animation - Animation to apply
 * @param {string} fallback - Fallback for reduced motion (default: 'none')
 */
export function applyAnimation(reduceMotion, animation, fallback = 'none') {
  return reduceMotion ? fallback : animation;
}

/**
 * Counter animation with easing
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Duration in ms
 * @param {function} callback - Callback with current value
 */
export function animateCounter(start, end, duration, callback) {
  const startTime = performance.now();
  const range = end - start;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic easing
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + range * eased);

    callback(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Get CSS variable for dynamic animations
 * @param {string} property - CSS property
 * @param {string} value - Value to set
 */
export function setCSSVariable(property, value) {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(property, value);
  }
}

/**
 * Trigger one-time animation on element
 * @param {HTMLElement} element - Target element
 * @param {string} animationClass - Animation class name
 * @param {function} onComplete - Callback when animation completes
 */
export function triggerAnimation(element, animationClass, onComplete) {
  if (!element) return;

  element.classList.add(animationClass);

  const handleAnimationEnd = () => {
    element.classList.remove(animationClass);
    element.removeEventListener('animationend', handleAnimationEnd);
    if (onComplete) onComplete();
  };

  element.addEventListener('animationend', handleAnimationEnd);
}

export default {
  ANSWER_ANIMATIONS,
  EMOJI_ANIMATIONS,
  STATS_ANIMATIONS,
  BUTTON_ANIMATIONS,
  LOADING_ANIMATIONS,
  EMPTY_STATE_ANIMATIONS,
  SHARE_ANIMATIONS,
  applyAnimation,
  animateCounter,
  setCSSVariable,
  triggerAnimation,
};
