/**
 * Rule: no-gif-img
 *
 * Disallows using <img> elements with animated GIF sources.
 * Animated GIFs bypass CSS prefers-reduced-motion rules because they are
 * image-level animation, not CSS animation (WCAG 2.2.2 violation).
 *
 * Use <ReducedMotionImage> from @/components/shared/ReducedMotionImage instead,
 * which swaps to a static fallback when the user prefers reduced motion.
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow <img> with .gif src — use <ReducedMotionImage> for WCAG 2.2.2 compliance',
      category: 'Accessibility',
      recommended: true,
    },
    messages: {
      noGifImg:
        'Animated GIFs bypass CSS reduce-motion rules. Use <ReducedMotionImage src="{{src}}" staticSrc="..." /> instead of <img> for WCAG 2.2.2 compliance.',
    },
    schema: [],
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        // Only check <img> elements (not <Image> from next/image, which doesn't render GIFs inline the same way)
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'img') {
          return;
        }

        const srcAttr = node.attributes.find(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'src'
        );

        if (!srcAttr || !srcAttr.value) return;

        // Check string literal src
        if (srcAttr.value.type === 'Literal' && typeof srcAttr.value.value === 'string') {
          if (srcAttr.value.value.endsWith('.gif')) {
            context.report({
              node,
              messageId: 'noGifImg',
              data: { src: srcAttr.value.value },
            });
          }
        }

        // Check JSX expression with string literal
        if (srcAttr.value.type === 'JSXExpressionContainer') {
          const expr = srcAttr.value.expression;
          if (
            expr.type === 'Literal' &&
            typeof expr.value === 'string' &&
            expr.value.endsWith('.gif')
          ) {
            context.report({
              node,
              messageId: 'noGifImg',
              data: { src: expr.value },
            });
          }
          // Template literals with .gif
          if (expr.type === 'TemplateLiteral') {
            const lastQuasi = expr.quasis[expr.quasis.length - 1];
            if (lastQuasi && lastQuasi.value.raw.endsWith('.gif')) {
              context.report({
                node,
                messageId: 'noGifImg',
                data: { src: '(template literal ending in .gif)' },
              });
            }
          }
        }
      },
    };
  },
};
