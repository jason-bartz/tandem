'use client';
import { useState, useCallback, useEffect } from 'react';
import platformService from '@/services/platform';

export default function ShareButton({ shareText, className = '' }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if running on native platform
    setIsNative(platformService.isPlatformNative());
  }, []);

  const handleShare = useCallback(async () => {
    try {
      // Use platform service for sharing
      const result = await platformService.share({
        title: 'Tandem Daily',
        text: shareText,
        url: 'https://tandemdaily.com'
      });

      // Add haptic feedback on iOS
      if (platformService.isPlatformNative()) {
        await platformService.haptic('medium');
      }

      // Show success feedback if clipboard was used
      if (result.activityType === 'clipboard') {
        setCopied(true);
        setError(false);

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
  }, [shareText]);

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`
          w-full py-3 px-4
          bg-gradient-to-r from-emerald-500 to-teal-500
          text-white rounded-xl font-semibold
          hover:shadow-lg transition-all
          flex items-center justify-center gap-2
          ${className}
        `}
        aria-label="Share results"
      >
        {copied ? 'Copied!' : error ? 'Failed to copy' : isNative ? 'Share Results' : 'Share Results'}
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