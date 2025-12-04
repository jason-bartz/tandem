'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * LeftSidePanel - Base component for all slide-in panels from the left
 *
 * Follows Apple HIG and modern mobile game UI best practices:
 * - Slides in from left edge
 * - Semi-transparent backdrop
 * - Multiple close methods (X, backdrop, ESC, swipe)
 * - Smooth animations
 * - Focus trapping
 * - Scroll containment
 * - Safe area awareness
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls panel visibility
 * @param {function} props.onClose - Called when panel should close
 * @param {React.ReactNode} props.children - Panel content
 * @param {string} props.title - Optional panel title for header
 * @param {boolean} props.showCloseButton - Show X button (default: true)
 * @param {string} props.maxWidth - Max width of panel (default: '450px')
 * @param {number} props.zIndex - Z-index for panel (default: 50, use 60 for nested)
 * @param {boolean} props.disableBackdropClick - Prevent closing on backdrop click
 * @param {boolean} props.disableEscape - Prevent closing on ESC key
 * @param {boolean} props.disableSwipe - Prevent closing on swipe gesture
 * @param {React.ReactNode} props.footer - Optional sticky footer content
 * @param {string} props.headerClassName - Additional header classes
 * @param {string} props.contentClassName - Additional content classes
 */
export default function LeftSidePanel({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  maxWidth = '450px',
  zIndex = 50,
  disableBackdropClick = false,
  disableEscape = false,
  disableSwipe = false,
  footer,
  headerClassName = '',
  contentClassName = '',
}) {
  const { theme } = useTheme();
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen || disableEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, disableEscape]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTab);

    // Focus first element when opening
    firstElement?.focus();

    return () => panel.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Swipe to dismiss (touch gestures)
  const handleTouchStart = useCallback(
    (e) => {
      if (disableSwipe) return;
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    },
    [disableSwipe]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (disableSwipe || touchStartX.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartX.current;
      const deltaY = Math.abs(currentY - touchStartY.current);

      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY) {
        isDragging.current = true;

        // Apply transform for visual feedback (swipe left = negative deltaX)
        if (deltaX < 0 && panelRef.current) {
          const translateX = Math.max(deltaX, -400); // Limit drag distance
          panelRef.current.style.transform = `translateX(${translateX}px)`;
        }
      }
    },
    [disableSwipe]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (disableSwipe || touchStartX.current === null) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX.current;

      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }

      // Close if swiped left more than 100px
      if (deltaX < -100 && isDragging.current) {
        onClose?.();
      }

      touchStartX.current = null;
      touchStartY.current = null;
      isDragging.current = false;
    },
    [disableSwipe, onClose]
  );

  const handleBackdropClick = useCallback(
    (e) => {
      if (disableBackdropClick) return;
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [disableBackdropClick, onClose]
  );

  if (!isOpen) return null;

  const panel = (
    <div
      className={`fixed inset-0 animate-backdrop-enter`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'panel-title' : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleBackdropClick} />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`absolute left-0 top-0 bottom-0 w-[90vw] animate-slide-in-left shadow-2xl ${
          theme === 'dark' ? 'bg-gray-900' : 'bg-ghost-white'
        }`}
        style={{
          maxWidth,
          // iOS safe area support
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`flex items-center justify-between px-6 py-4 border-b-[3px] ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            } ${headerClassName}`}
          >
            {title && (
              <h2
                id="panel-title"
                className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {title}
              </h2>
            )}

            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className={`ml-auto p-2 rounded-full transition-colors ${
                  theme === 'dark'
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Close panel"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className={`flex-1 overflow-y-auto modal-scrollbar ${
            footer ? 'pb-0' : 'pb-6'
          } ${contentClassName}`}
          style={{
            maxHeight: footer
              ? 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 64px - 72px)' // Subtract header + footer
              : 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 64px)', // Subtract header
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`px-6 py-4 border-t-[3px] ${
              theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  // Render to body using portal
  return typeof document !== 'undefined' ? createPortal(panel, document.body) : null;
}
