'use client';
import { useState, useCallback, useEffect } from 'react';
import platformService from '@/services/platform';
import { useTheme } from '@/contexts/ThemeContext';

export default function ShareButton({ shareText, className = '' }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [showSuccessBurst, setShowSuccessBurst] = useState(false);
  const { highContrast, reduceMotion } = useTheme();

  useEffect(() => {
    setIsNative(platformService.isPlatformNative());
  }, []);

  const handleShare = useCallback(async () => {
    try {
      // Use platform service for sharing
      const result = await platformService.share({
        text: shareText,
      });

      // Add haptic feedback on iOS
      if (platformService.isPlatformNative()) {
        await platformService.haptic('medium');
      }

      if (result.activityType === 'clipboard') {
        setCopied(true);
        setError(false);
        if (!reduceMotion) {
          setShowSuccessBurst(true);
          setTimeout(() => setShowSuccessBurst(false), 400);
        }

        // Reset after 3 seconds
        setTimeout(() => {
          setCopied(false);
        }, 3000);
      }
    } catch (err) {
      // Failed to share - will try clipboard fallback

      // Fallback to clipboard
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareText);
        } else {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = shareText;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();

          try {
            document.execCommand('copy');
          } catch (err) {
            // Fallback copy failed
            throw new Error('Copy failed');
          } finally {
            textArea.remove();
          }
        }

        setCopied(true);
        setError(false);
        if (!reduceMotion) {
          setShowSuccessBurst(true);
          setTimeout(() => setShowSuccessBurst(false), 400);
        }

        setTimeout(() => {
          setCopied(false);
        }, 3000);
      } catch (fallbackErr) {
        setError(true);
        setTimeout(() => {
          setError(false);
        }, 3000);
      }
    }
  }, [shareText, reduceMotion]);

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`
          share-button
          w-full py-3 px-4
          rounded-2xl font-semibold
          transition-all border-[3px]
          flex items-center justify-center gap-2
          ${
            highContrast
              ? 'bg-hc-success text-hc-success-text border-hc-border hover:bg-hc-focus shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-accent-green text-white border-black dark:border-gray-600 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]'
          }
          ${showSuccessBurst && !reduceMotion ? 'share-success' : ''}
          ${!copied && !error && !reduceMotion ? 'animate-attention-pulse' : ''}
          ${className}
        `}
        aria-label="Share results"
      >
        {copied
          ? 'Copied!'
          : error
            ? 'Failed to copy'
            : isNative
              ? 'Share Results'
              : 'Share Results'}
      </button>

      {/* Visual feedback tooltip */}
      {copied && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 animate-fade-in">
          <div className="bg-gray-900 dark:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm whitespace-nowrap">
            Results copied to clipboard!
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900 dark:bg-gray-700"></div>
          </div>
        </div>
      )}
    </div>
  );
}
