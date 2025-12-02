'use client';

import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  'Rolling film...',
  'Adjusting the projector...',
  'Finding your seat...',
  'Dimming the lights...',
  'Silencing cell phones...',
  'Cueing the trailers...',
  'Loading the reels...',
  'Popping the corn...',
  'Framing the shot...',
  'Checking the focus...',
  'Spooling the film...',
  'Raising the curtain...',
  "Queuing tonight's feature...",
  'Previewing the posters...',
];

export default function ReelConnectionsLoadingSkeleton() {
  const [messages, setMessages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Shuffle messages on mount for random order
    const shuffled = [...LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    setMessages(shuffled);
    setCurrentIndex(0);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;

    let timeoutId = null;

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        // Change to next message in shuffled order
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % messages.length;
          // If we've cycled through all messages, reshuffle
          if (nextIndex === 0) {
            const reshuffled = [...messages].sort(() => Math.random() - 0.5);
            setMessages(reshuffled);
          }
          return nextIndex;
        });
        // Fade back in
        setIsVisible(true);
      }, 150); // Quick fade for fast cycling
    }, 2000); // Change message every 2 seconds for better readability

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1e] via-[#1a1a2e] to-[#0f0f1e] flex items-center justify-center p-4 film-grain">
      <div className="w-full max-w-2xl">
        {/* Header Links Skeleton */}
        <div className="flex items-center justify-between px-2 mb-3">
          <div className="h-4 w-20 bg-white/10 rounded reel-skeleton-shimmer" />
          <div className="flex items-center gap-4">
            <div
              className="h-4 w-14 bg-white/10 rounded reel-skeleton-shimmer"
              style={{ animationDelay: '100ms' }}
            />
            <div
              className="h-4 w-10 bg-white/10 rounded reel-skeleton-shimmer"
              style={{ animationDelay: '200ms' }}
            />
          </div>
        </div>

        {/* Cinematic Marquee Header Skeleton */}
        <div className="relative cinema-gradient rounded-2xl border-[4px] border-[#ffce00]/30 shadow-[6px_6px_0px_rgba(0,0,0,0.8)] p-6 mb-6 overflow-hidden">
          {/* Top Marquee Lights - dim placeholder */}
          <div className="absolute top-0 left-0 right-0 flex justify-around py-2">
            {[...Array(12)].map((_, i) => (
              <div
                key={`top-${i}`}
                className="w-4 h-4 rounded-full bg-[#ffce00]/20 reel-skeleton-shimmer"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>

          {/* Header Content Skeleton */}
          <div className="mt-4 mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-white/10 rounded reel-skeleton-shimmer" />
              <div
                className="h-7 w-44 bg-white/10 rounded-lg reel-skeleton-shimmer"
                style={{ animationDelay: '100ms' }}
              />
              <div
                className="h-5 w-12 bg-[#ffce00]/20 rounded-md reel-skeleton-shimmer"
                style={{ animationDelay: '200ms' }}
              />
            </div>
            <div
              className="h-4 w-48 mx-auto bg-white/10 rounded reel-skeleton-shimmer"
              style={{ animationDelay: '150ms' }}
            />
          </div>

          {/* Mistakes and Timer Skeleton */}
          <div className="flex items-center justify-between gap-4 px-2">
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-white/10 rounded reel-skeleton-shimmer"
                    style={{ animationDelay: `${i * 75}ms` }}
                  />
                ))}
              </div>
              <div className="h-3 w-24 bg-white/10 rounded reel-skeleton-shimmer mt-1" />
            </div>
            <div className="flex flex-col items-center">
              <div className="h-8 w-16 bg-white/10 rounded reel-skeleton-shimmer" />
              <div
                className="h-3 w-10 bg-white/10 rounded reel-skeleton-shimmer mt-1"
                style={{ animationDelay: '50ms' }}
              />
            </div>
          </div>

          {/* Bottom Marquee Lights - dim placeholder */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-around py-2">
            {[...Array(12)].map((_, i) => (
              <div
                key={`bottom-${i}`}
                className="w-4 h-4 rounded-full bg-[#ffce00]/20 reel-skeleton-shimmer"
                style={{ animationDelay: `${i * 50 + 25}ms` }}
              />
            ))}
          </div>
        </div>

        {/* Movie Grid Skeleton - 4x4 grid with posters */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="flex flex-col">
              <div
                className="aspect-[2/3] rounded-xl overflow-hidden border-[4px] border-black/50 shadow-[3px_3px_0px_rgba(0,0,0,0.5)] mb-1 bg-white/5 reel-skeleton-shimmer"
                style={{ animationDelay: `${(i % 4) * 100 + Math.floor(i / 4) * 50}ms` }}
              />
              <div
                className="h-3 w-full bg-white/10 rounded reel-skeleton-shimmer mx-auto"
                style={{ animationDelay: `${(i % 4) * 100 + Math.floor(i / 4) * 50 + 25}ms` }}
              />
            </div>
          ))}
        </div>

        {/* Centered Loading Message - fixed to screen like ready modal */}
        <div className="fixed inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-2xl border-[3px] border-[#ffce00] shadow-[6px_6px_0px_rgba(0,0,0,0.8)] px-8 py-6 text-center mx-4">
            <p
              className={`text-white text-lg font-bold drop-shadow-lg transition-opacity duration-150 ${
                isVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {messages[currentIndex] || 'Loading...'}
            </p>
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="flex gap-3 justify-center mb-6">
          <div className="h-11 w-24 bg-white/10 border-[3px] border-white/10 rounded-xl reel-skeleton-shimmer" />
          <div
            className="h-11 w-20 bg-white/10 border-[3px] border-white/10 rounded-xl reel-skeleton-shimmer"
            style={{ animationDelay: '100ms' }}
          />
          <div
            className="h-11 w-24 bg-white/10 border-[3px] border-white/10 rounded-xl reel-skeleton-shimmer"
            style={{ animationDelay: '200ms' }}
          />
        </div>

        {/* Footer Skeleton */}
        <div className="text-center mt-8 space-y-2">
          <div className="h-4 w-12 mx-auto bg-white/10 rounded reel-skeleton-shimmer" />
          <div
            className="h-3 w-32 mx-auto bg-white/10 rounded reel-skeleton-shimmer"
            style={{ animationDelay: '50ms' }}
          />
        </div>
      </div>
    </div>
  );
}
