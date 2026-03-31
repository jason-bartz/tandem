/**
 * Rule: no-unguarded-animation-class
 *
 * Warns when animation-related CSS classes (skeleton-shimmer, reel-skeleton-shimmer,
 * animate-*) appear in static className strings instead of conditional expressions.
 *
 * Animation classes should be conditionally applied based on the reduceMotion
 * preference from useTheme() to ensure component-level reduce motion support.
 *
 * Allowed patterns (will NOT trigger):
 *   className={`... ${reduceMotion ? '' : 'skeleton-shimmer'}`}
 *   className={`... ${!reduceMotion ? 'animate-fade-in' : ''}`}
 *   className={someVariable}  (dynamic, assumed to be handled)
 *
 * Disallowed patterns (WILL trigger):
 *   className="skeleton-shimmer bg-gray-200"
 *   className="animate-fade-in text-center"
 *
 * Exceptions: animate-spin is excluded (loading spinners are acceptable per WCAG
 * when they are brief and indicate loading state).
 */

const ANIMATION_PATTERN =
  /\b(skeleton-shimmer|reel-skeleton-shimmer|animate-(?!spin\b)[a-z][\w-]*)\b/;

// Classes that are acceptable without reduce motion guards
const ALLOWED_CLASSES = new Set([
  'animate-spin', // Brief loading indicators are acceptable per WCAG
]);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require animation classes to be conditionally applied based on reduceMotion',
      category: 'Accessibility',
      recommended: true,
    },
    messages: {
      unguardedAnimationClass:
        'Animation class "{{className}}" should be conditionally applied based on reduceMotion. ' +
        "Use a template literal with a reduceMotion check: `${reduceMotion ? '' : '{{className}}'}`",
    },
    schema: [],
  },

  create(context) {
    return {
      JSXAttribute(node) {
        if (!node.name || node.name.name !== 'className') return;

        // Only flag static string literals — template literals and expressions
        // are assumed to contain conditional logic
        if (!node.value) return;

        let classString = null;

        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          classString = node.value.value;
        }

        if (!classString) return;

        const match = classString.match(ANIMATION_PATTERN);
        if (match && !ALLOWED_CLASSES.has(match[0])) {
          context.report({
            node,
            messageId: 'unguardedAnimationClass',
            data: { className: match[0] },
          });
        }
      },
    };
  },
};
