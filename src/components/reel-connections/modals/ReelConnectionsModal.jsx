'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * ReelConnectionsModal - Base modal component styled for the cinematic Reel Connections theme
 *
 * Follows Apple HIG and modern mobile game UI best practices:
 * - Slides up from bottom (iOS-style sheet presentation)
 * - Semi-transparent backdrop with blur
 * - Multiple close methods (X, backdrop, ESC, swipe)
 * - Smooth animations
 * - Focus trapping
 * - Scroll containment
 * - Safe area awareness
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {function} props.onClose - Called when modal should close
 * @param {React.ReactNode} props.children - Modal content
 * @param {string} props.title - Modal title for header
 * @param {string} props.maxHeight - Max height of modal (default: '80vh')
 */
export default function ReelConnectionsModal({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '80vh',
}) {
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const touchStartY = useRef(null);
  const isDragging = useRef(false);

  // Prevent body scroll when modal is open
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
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll(
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

    modal.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Swipe to dismiss (touch gestures)
  const handleTouchStart = useCallback((e) => {
    // Only start swipe if at top of scroll
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY > 10) {
      isDragging.current = true;

      // Apply transform for visual feedback
      if (modalRef.current) {
        const translateY = Math.min(deltaY, 200);
        modalRef.current.style.transform = `translateY(${translateY}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartY.current === null) return;

      const deltaY = e.changedTouches[0].clientY - touchStartY.current;

      if (modalRef.current) {
        modalRef.current.style.transform = '';
      }

      // Close if swiped down more than 100px
      if (deltaY > 100 && isDragging.current) {
        onClose?.();
      }

      touchStartY.current = null;
      isDragging.current = false;
    },
    [onClose]
  );

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 animate-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal Container - Centered */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className="relative w-full max-w-lg animate-modal-enter"
          style={{
            maxHeight,
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Modal Content Card */}
          <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-2xl border-[3px] border-[#ffce00] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-white/10">
              {/* Drag Handle */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full" />

              {title && (
                <h2 id="modal-title" className="text-xl font-bold text-white drop-shadow-lg pt-2">
                  {title}
                </h2>
              )}

              <button
                onClick={onClose}
                className="ml-auto p-2 rounded-full transition-all hover:bg-white/10 text-white/70 hover:text-white"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div
              ref={contentRef}
              className="overflow-y-auto modal-scrollbar px-5 py-4"
              style={{
                maxHeight: `calc(${maxHeight} - 80px)`,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render to body using portal
  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
