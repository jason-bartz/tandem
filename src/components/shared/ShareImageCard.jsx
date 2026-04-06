'use client';

import { useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import platformService from '@/services/platform';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ShareImageCard - Renders a hidden card and captures it as a shareable image
 *
 * @param {string} gameName - Name of the game (e.g., "Daily Tandem", "Daily Mini")
 * @param {string} date - Puzzle date string
 * @param {string} emoji - Optional emoji/icon for the game
 * @param {Array} stats - Array of {label, value} objects to display
 * @param {string} accentColor - Tailwind bg class for accent strip (e.g., "bg-accent-blue")
 * @param {string} message - Optional message (e.g., "Perfect solve!")
 * @param {Function} children - Optional custom content renderer
 */
export default function ShareImageCard({
  gameName,
  date,
  emoji = '',
  stats = [],
  accentColor = 'bg-accent-blue',
  message = '',
  buttonClassName = '',
  buttonLabel = 'Share Image',
}) {
  const cardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { reduceMotion } = useTheme();

  const handleShareImage = useCallback(async () => {
    if (!cardRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to generate image');

      // Try native share with image
      if (
        platformService.isPlatformNative() ||
        navigator.canShare?.({ files: [new File([blob], 'share.png', { type: 'image/png' })] })
      ) {
        const file = new File([blob], `${gameName.replace(/\s/g, '-').toLowerCase()}-${date}.png`, {
          type: 'image/png',
        });
        await navigator.share({ files: [file] });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${gameName.replace(/\s/g, '-').toLowerCase()}-${date}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled share or error
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, gameName, date]);

  return (
    <>
      {/* Hidden share card - rendered off-screen for capture */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        <div
          ref={cardRef}
          style={{
            width: 400,
            padding: 32,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: '#FFFFFF',
            borderRadius: 16,
          }}
        >
          {/* Accent strip */}
          <div className={accentColor} style={{ height: 6, borderRadius: 3, marginBottom: 24 }} />

          {/* Game name and date */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            {emoji && <div style={{ fontSize: 40, marginBottom: 8 }}>{emoji}</div>}
            <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{gameName}</div>
            <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{date}</div>
          </div>

          {/* Message */}
          {message && (
            <div
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 16,
              }}
            >
              {message}
            </div>
          )}

          {/* Stats grid */}
          {stats.length > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
                gap: 12,
                marginBottom: 20,
              }}
            >
              {stats.map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: '#F3F4F6',
                    borderRadius: 12,
                    padding: 0,
                    position: 'relative',
                  }}
                >
                  {/* Invisible square sizer */}
                  <div style={{ paddingBottom: '100%' }} />
                  {/* Centered content overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{ fontSize: 24, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6B7280',
                        marginTop: 4,
                        lineHeight: 1,
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: '#9CA3AF',
              fontWeight: 600,
            }}
          >
            tandemdaily.com
          </div>
        </div>
      </div>

      {/* Share image button */}
      <button
        onClick={handleShareImage}
        disabled={isGenerating}
        className={`w-full h-14 px-4 rounded-md font-bold transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 ${buttonClassName}`}
      >
        {isGenerating ? (
          <>
            <span
              className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full ${!reduceMotion ? 'animate-spin' : ''}`}
            />
            Generating...
          </>
        ) : copied ? (
          'Image saved!'
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {buttonLabel}
          </>
        )}
      </button>
    </>
  );
}
