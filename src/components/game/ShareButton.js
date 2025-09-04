'use client';
import { useState, useCallback } from 'react';

export default function ShareButton({ shareText, className = '' }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      // Modern clipboard API with fallback
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
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
          console.error('Fallback copy failed:', err);
          throw new Error('Copy failed');
        } finally {
          textArea.remove();
        }
      }

      // Show success feedback
      setCopied(true);
      setError(false);

      // Reset after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);

    } catch (err) {
      console.error('Failed to copy:', err);
      setError(true);
      
      // Reset error after 3 seconds
      setTimeout(() => {
        setError(false);
      }, 3000);
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
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-2.684 0m-9.032 0a3 3 0 002.684 0m6.348 0a3 3 0 100-5.368m0 5.368a3 3 0 100-5.368m-6.348 0a3 3 0 100 5.368" 
          />
        </svg>
        <span>
          {copied ? 'Copied!' : error ? 'Failed to copy' : 'Share Results'}
        </span>
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