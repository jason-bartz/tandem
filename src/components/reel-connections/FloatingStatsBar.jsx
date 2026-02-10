import React, { useRef, useCallback } from 'react';
import Image from 'next/image';
import { useHaptics } from '@/hooks/useHaptics';

const GESTURE_MIN_DISTANCE = 20;
const GESTURE_MIN_VELOCITY = 0.3;

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const FloatingStatsBar = ({
  mistakes,
  currentTime,
  archiveDate,
  puzzleDate,
  isVisible,
  isHidden,
  onShow,
  onHide,
  showNavRow = false,
  pullOffset = 0,
  isPulling = false,
  reduceMotion = false,
  highContrast = false,
}) => {
  // Always call hooks unconditionally (Rules of Hooks)
  const statsBarRef = useRef(null);
  const gestureStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const { lightTap, mediumTap } = useHaptics();

  // Format date
  const displayDate = archiveDate
    ? new Date(archiveDate + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : puzzleDate
      ? new Date(puzzleDate + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  // Touch handlers
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    gestureStartRef.current = {
      y: touch.clientY,
      time: Date.now(),
    };
    isDraggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!gestureStartRef.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - gestureStartRef.current.y;

    if (Math.abs(deltaY) > 5) {
      isDraggingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!gestureStartRef.current || !isDraggingRef.current) return;

      const touch = e.changedTouches[0];
      const deltaY = touch.clientY - gestureStartRef.current.y;
      const deltaTime = Date.now() - gestureStartRef.current.time;
      const velocity = Math.abs(deltaY) / deltaTime;

      // Swipe up to hide
      if (deltaY < -GESTURE_MIN_DISTANCE || (velocity > GESTURE_MIN_VELOCITY && deltaY < 0)) {
        mediumTap();
        onHide();
      }
      // Swipe down to show
      else if (deltaY > GESTURE_MIN_DISTANCE || (velocity > GESTURE_MIN_VELOCITY && deltaY > 0)) {
        lightTap();
        onShow();
      }

      // Reset
      isDraggingRef.current = false;
      gestureStartRef.current = null;
    },
    [onHide, onShow, mediumTap, lightTap]
  );

  // If neither visible nor hidden, don't show (FULL_HEADER state)
  const shouldRender = isVisible || isHidden;

  return (
    <div
      ref={statsBarRef}
      className="fixed left-0 right-0 z-20"
      style={{
        top: showNavRow
          ? 'calc(64px + env(safe-area-inset-top, 0px))'
          : 'calc(env(safe-area-inset-top, 0px))',
        transform:
          isHidden || !shouldRender
            ? `translateY(calc(-120% + ${pullOffset}px))`
            : `translateY(${pullOffset}px)`,
        opacity: shouldRender ? 1 : 0,
        transition:
          isPulling || reduceMotion
            ? 'none'
            : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease, top 300ms ease',
        willChange: shouldRender ? 'transform, opacity, top' : 'auto',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
      }}
      role="banner"
      aria-label="Game statistics"
    >
      <div
        className={`
          h-[44px]
          stats-bar-backdrop
          ${isHidden ? 'pointer-events-none' : ''}
          ${
            highContrast
              ? 'bg-hc-error/95 border-b-2 border-hc-border'
              : 'bg-red-700/90 border-b-2 border-red-900/50'
          }
        `}
      >
        <div className="h-full px-4 flex items-center justify-between max-w-md mx-auto">
          {/* Mistakes */}
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => {
              const isMistake = i < mistakes;
              return (
                <div key={i} className="w-5 h-5 flex items-center justify-center">
                  <Image
                    src={
                      isMistake
                        ? '/game/reel-connections/wrong.png'
                        : '/game/reel-connections/popcorn.png'
                    }
                    alt={isMistake ? 'Mistake' : 'Remaining'}
                    width={16}
                    height={16}
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
              );
            })}
          </div>

          {/* Timer */}
          <div className="flex items-center">
            <p
              className={`text-base font-bold tabular-nums ${
                highContrast ? 'text-white' : 'text-white'
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              {formatTime(currentTime)}
            </p>
          </div>

          {/* Date */}
          <div className="flex items-center">
            <p
              className={`text-xs font-semibold tabular-nums whitespace-nowrap ${
                highContrast ? 'text-white/90' : 'text-white/90'
              }`}
            >
              {displayDate}
            </p>
          </div>
        </div>
      </div>

      {/* Pull indicator - only show when compact bar is visible */}
      {isVisible && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1 pb-2 px-4 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div
            className={`w-8 h-1 rounded-full ${highContrast ? 'bg-hc-border/40' : 'bg-white/20'}`}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(FloatingStatsBar);
