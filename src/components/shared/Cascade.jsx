'use client';
import { Children, cloneElement } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Cascade Component
 *
 * A wrapper component that applies staggered entrance animations to its children.
 * Following Apple HIG with proper reduce motion support.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements to animate
 * @param {number} props.stagger - Delay between each child in milliseconds (default: 100)
 * @param {string} props.animation - Animation class to apply (default: 'animate-fade-in-up')
 * @param {number} props.initialDelay - Initial delay before first child animates in ms (default: 0)
 * @param {string} props.className - Additional classes for the wrapper
 *
 * @example
 * <Cascade stagger={100} animation="animate-fade-in-up">
 *   <div>First</div>
 *   <div>Second</div>
 *   <div>Third</div>
 * </Cascade>
 */
export default function Cascade({
  children,
  stagger = 100,
  animation = 'animate-fade-in-up',
  initialDelay = 0,
  className = '',
}) {
  const { reduceMotion } = useTheme();

  // If reduce motion is enabled, don't apply animations
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const childArray = Children.toArray(children);

  return (
    <div className={className}>
      {childArray.map((child, index) => {
        const delay = initialDelay + index * stagger;

        // Map delay to nearest Tailwind utility class
        const getDelayClass = (ms) => {
          if (ms === 0) return 'delay-0';
          if (ms <= 50) return 'delay-50';
          if (ms <= 75) return 'delay-75';
          if (ms <= 100) return 'delay-100';
          if (ms <= 150) return 'delay-150';
          if (ms <= 200) return 'delay-200';
          if (ms <= 250) return 'delay-250';
          if (ms <= 300) return 'delay-300';
          if (ms <= 400) return 'delay-400';
          if (ms <= 500) return 'delay-500';
          if (ms <= 600) return 'delay-600';
          if (ms <= 700) return 'delay-700';
          return 'delay-800';
        };

        const delayClass = getDelayClass(delay);

        // Clone the child and add animation classes
        return cloneElement(child, {
          key: index,
          className: `${child.props.className || ''} ${animation} ${delayClass}`.trim(),
        });
      })}
    </div>
  );
}
