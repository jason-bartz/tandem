'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * BottomPanel - Slide-in panel from the bottom
 *
 * Similar to LeftSidePanel but slides up from the bottom of the screen.
 * Perfect for hint systems where users need to see the main content while viewing the panel.
 *
 * Follows Apple HIG and modern mobile game UI best practices:
 * - Slides in from bottom edge
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
 * @param {string} props.maxHeight - Max height of panel (default: '75vh')
 * @param {string} props.maxWidth - Max width of panel (default: full width, e.g., '440px')
 * @param {number} props.zIndex - Z-index for panel (default: 50, use 60 for nested)
 * @param {boolean} props.disableBackdropClick - Prevent closing on backdrop click
 * @param {boolean} props.disableEscape - Prevent closing on ESC key
 * @param {boolean} props.disableSwipe - Prevent closing on swipe gesture
 * @param {React.ReactNode} props.footer - Optional sticky footer content
 * @param {string} props.headerClassName - Additional header classes
 * @param {string} props.contentClassName - Additional content classes
 */
export default function BottomPanel({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  maxHeight = '75vh',
  maxWidth,
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
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);
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

  // Swipe to dismiss (touch gestures - swipe down)
  const handleTouchStart = useCallback(
    (e) => {
      if (disableSwipe) return;
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
      isDragging.current = false;
    },
    [disableSwipe]
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (disableSwipe || touchStartY.current === null) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - touchStartY.current;
      const deltaX = Math.abs(currentX - touchStartX.current);

      // Only trigger swipe if vertical movement is greater than horizontal
      if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > deltaX) {
        isDragging.current = true;

        // Apply transform for visual feedback (swipe down = positive deltaY)
        // IMPORTANT: Preserve the -translate-x-1/2 centering transform when maxWidth is set
        if (deltaY > 0 && panelRef.current) {
          const translateY = Math.min(deltaY, 400); // Limit drag distance
          const hasCentering = panelRef.current.classList.contains('-translate-x-1/2');
          panelRef.current.style.transform = hasCentering
            ? `translateX(-50%) translateY(${translateY}px)`
            : `translateY(${translateY}px)`;
        }
      }
    },
    [disableSwipe]
  );

  const handleTouchEnd = useCallback(
    (e) => {
      if (disableSwipe || touchStartY.current === null) return;

      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      if (panelRef.current) {
        panelRef.current.style.transform = '';
      }

      // Close if swiped down more than 100px
      if (deltaY > 100 && isDragging.current) {
        onClose();
      }

      touchStartY.current = null;
      touchStartX.current = null;
      isDragging.current = false;
    },
    [disableSwipe, onClose]
  );

  const handleBackdropClick = useCallback(
    (e) => {
      if (disableBackdropClick) return;
      if (e.target === e.currentTarget) {
        onClose();
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
        className={`absolute bottom-0 animate-slide-in-bottom shadow-2xl rounded-t-3xl ${
          maxWidth ? 'left-1/2 -translate-x-1/2' : 'left-0 right-0'
        } ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}
        style={{
          maxHeight,
          maxWidth: maxWidth || undefined,
          width: maxWidth ? '100%' : undefined,
          // iOS safe area support
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div
            className={`w-12 h-1.5 rounded-full ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
            }`}
          />
        </div>

        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between px-6 pb-4 ${headerClassName}`}>
            {title && (
              <h2
                id="panel-title"
                className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
              >
                {title}
              </h2>
            )}

            {showCloseButton && (
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
          className={`overflow-y-auto modal-scrollbar px-6 ${
            footer ? 'pb-0' : 'pb-6'
          } ${contentClassName}`}
          style={{
            maxHeight: footer
              ? 'calc(75vh - env(safe-area-inset-bottom) - 120px)' // Subtract header + footer + drag handle
              : 'calc(75vh - env(safe-area-inset-bottom) - 80px)', // Subtract header + drag handle
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`px-6 py-4 border-t ${
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
