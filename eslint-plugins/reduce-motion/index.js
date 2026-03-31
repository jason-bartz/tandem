/**
 * ESLint plugin: reduce-motion
 *
 * Enforces accessibility best practices for reduced motion support (WCAG 2.2.2, 2.3.3).
 *
 * Rules:
 * - no-gif-img: Disallows <img> with .gif src — use <ReducedMotionImage> instead.
 * - no-unguarded-animation-class: Warns when shimmer/animation classes appear in
 *   static className strings instead of conditional expressions.
 */

const noGifImg = require('./rules/no-gif-img');
const noUnguardedAnimationClass = require('./rules/no-unguarded-animation-class');

module.exports = {
  rules: {
    'no-gif-img': noGifImg,
    'no-unguarded-animation-class': noUnguardedAnimationClass,
  },
};
