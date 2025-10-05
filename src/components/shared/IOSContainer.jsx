'use client';

import { useEffect } from 'react';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import platformService from '@/services/platform';

export default function IOSContainer({ children }) {
  useEffect(() => {
    if (!platformService.isPlatformNative()) {
      return;
    }

    // Setup iOS-specific configurations
    const setupIOS = async () => {
      try {
        // Configure status bar
        await StatusBar.setStyle({ style: 'dark' });
        await StatusBar.setBackgroundColor({ color: '#ffffff' });

        // Add iOS-specific styles
        document.documentElement.classList.add('ios-app');

        // Handle keyboard events
        const handleKeyboardShow = (info) => {
          document.documentElement.style.setProperty(
            '--keyboard-height',
            `${info.keyboardHeight}px`
          );
          document.documentElement.classList.add('keyboard-visible');

          // Auto-scroll to active input field
          setTimeout(() => {
            const activeElement = document.activeElement;
            if (activeElement && activeElement.tagName === 'INPUT') {
              // Find the scrollable container
              const scrollContainer = document.querySelector('.scrollable');
              if (scrollContainer) {
                const inputRect = activeElement.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();
                const keyboardHeight = info.keyboardHeight || 300;
                const viewportHeight = window.innerHeight - keyboardHeight;

                // Check if input is below the visible area
                if (inputRect.bottom > viewportHeight - 100) {
                  const scrollTop = scrollContainer.scrollTop;
                  const inputTop = inputRect.top - containerRect.top + scrollTop;
                  const desiredPosition = inputTop - 100; // Keep 100px padding from top

                  scrollContainer.scrollTo({
                    top: desiredPosition,
                    behavior: 'smooth',
                  });
                }
              }
            }
          }, 100);
        };

        const handleKeyboardHide = () => {
          document.documentElement.style.setProperty('--keyboard-height', '0px');
          document.documentElement.classList.remove('keyboard-visible');

          // Reset scroll position smoothly
          const scrollContainer = document.querySelector('.scrollable');
          if (scrollContainer) {
            scrollContainer.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }
        };

        // Add keyboard listeners
        Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
        Keyboard.addListener('keyboardWillHide', handleKeyboardHide);

        // Prevent bounce scrolling on iOS
        document.body.addEventListener(
          'touchmove',
          (e) => {
            if (e.target.closest('.scrollable')) {
              return;
            }
            e.preventDefault();
          },
          { passive: false }
        );

        // Add viewport meta for iOS
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.content =
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }

        // Cache recent puzzles for offline use
        if (platformService.isOnline()) {
          platformService.cacheRecentPuzzles();
        }

        return () => {
          // Cleanup listeners
          Keyboard.removeAllListeners();
        };
      } catch (error) {
        // Error setting up iOS container - non-critical
      }
    };

    setupIOS();
  }, []);

  // Add global iOS styles
  useEffect(() => {
    if (!platformService.isPlatformNative()) {
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      /* iOS-specific global styles */
      .ios-app {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      /* Safe area insets for iOS - apply to content, not root */
      .ios-app {
        /* Don't add padding to root - this creates the white frame */
        /* Let individual components handle safe areas */
      }

      /* Keyboard adjustments */
      .ios-app.keyboard-visible {
        transition: all 0.3s ease;
      }

      .ios-app.keyboard-visible .scrollable {
        padding-bottom: calc(var(--keyboard-height, 0px) + 20px);
        transition: padding-bottom 0.3s ease;
      }

      /* Disable bounce scroll - let the mobile-phone-layout handle positioning */
      .ios-app body {
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: none;
      }

      /* Allow scrolling in specific areas */
      .ios-app .scrollable {
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        scroll-behavior: smooth;
        position: relative;
      }

      /* Ensure content is visible when keyboard is shown */
      .ios-app.keyboard-visible .game-content {
        transform: translateY(0);
        transition: transform 0.3s ease;
      }

      /* Input focus styles for iOS */
      .ios-app input:focus,
      .ios-app textarea:focus,
      .ios-app select:focus {
        outline: none;
        border-color: #3b82f6;
      }

      /* Button active states for iOS */
      .ios-app button:active {
        opacity: 0.8;
        transform: scale(0.98);
      }

      /* Disable text selection except in inputs */
      .ios-app *:not(input):not(textarea) {
        -webkit-user-select: none;
        user-select: none;
      }

      /* Fix for iOS rubber band scrolling */
      .ios-app .game-container {
        position: relative;
        overflow: hidden;
      }

      /* Safe area adjustments for control buttons - Dynamic Island aware */
      .ios-app .pt-safe-ios {
        padding-top: max(3rem, calc(env(safe-area-inset-top) + 1.5rem));
        transition: padding-top 0.3s ease;
      }

      /* Additional spacing for devices with Dynamic Island */
      @supports (padding: max(0px)) {
        .ios-app .pt-safe-ios {
          padding-top: max(3.5rem, calc(env(safe-area-inset-top) + 2rem));
        }
      }

      /* Ensure modals appear above everything on iOS */
      .ios-app .modal,
      .ios-app [role="dialog"] {
        z-index: 9999;
      }

      /* iOS-style transitions */
      .ios-app * {
        -webkit-transform: translateZ(0);
        -webkit-backface-visibility: hidden;
      }

      /* Prevent zoom on double tap */
      .ios-app button,
      .ios-app input,
      .ios-app select,
      .ios-app textarea {
        touch-action: manipulation;
      }

      /* Fix for iOS form inputs */
      .ios-app input[type="text"],
      .ios-app input[type="email"],
      .ios-app input[type="password"],
      .ios-app textarea {
        font-size: 16px; /* Prevents zoom on focus */
        -webkit-appearance: none;
        border-radius: 0;
      }

      /* Custom scrollbar for iOS */
      .ios-app ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }

      .ios-app ::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }

      .ios-app ::-webkit-scrollbar-track {
        background: transparent;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return <>{children}</>;
}
