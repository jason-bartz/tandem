'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Capacitor } from '@capacitor/core';
import { useTheme } from '@/contexts/ThemeContext';
import { ASSET_VERSION } from '@/lib/constants';

const loadingMessages = [
  'Calibrating cryptic coefficients...',
  'Syncing synonyms...',
  'Balancing tandem handlebars...',
  'Herding metaphorical cats...',
  'Brewing fresh vocabulary...',
  'Untangling thematic threads...',
  'Optimizing wordplay algorithms...',
  'Reticulating syllables...',
  'Consulting the emoji oracle...',
];

/**
 * Skeleton card component for game cards
 */
function GameCardSkeleton({
  reduceMotion,
  highContrast,
  animationDelay = 0,
  loadingText = null,
  isTextVisible = true,
}) {
  return (
    <div
      className={`w-full rounded-[24px] border-[3px] overflow-hidden p-5 relative ${
        highContrast
          ? 'bg-hc-surface border-hc-border shadow-[4px_4px_0px_rgba(0,0,0,1)]'
          : 'bg-ghost-white dark:bg-bg-card border-border-main shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]'
      }`}
      style={{ animationDelay: !reduceMotion ? `${animationDelay}ms` : '0ms' }}
    >
      {/* Loading text overlay - centered within this card */}
      {loadingText && (
        <div
          className={`absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300 ${
            isTextVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p
            className={`text-base font-bold text-center px-4 ${
              highContrast ? 'text-hc-text' : 'text-gray-800 dark:text-gray-200'
            }`}
          >
            {loadingText}
          </p>
        </div>
      )}

      <div className={`flex items-center gap-4 ${loadingText ? 'opacity-30' : ''}`}>
        {/* Icon skeleton */}
        <div
          className={`w-[52px] h-[52px] flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-700 ${
            !reduceMotion ? 'skeleton-shimmer' : ''
          }`}
        />

        {/* Content skeleton - matches actual GameCard structure */}
        <div className="flex-1 min-w-0">
          {/* Title: text-xl font-bold mb-1 */}
          <div
            className={`h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-1 ${
              !reduceMotion ? 'skeleton-shimmer' : ''
            }`}
          />
          {/* Description: text-sm leading-snug mb-2 */}
          <div
            className={`h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1 ${
              !reduceMotion ? 'skeleton-shimmer' : ''
            }`}
          />
          <div
            className={`h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2 ${
              !reduceMotion ? 'skeleton-shimmer' : ''
            }`}
          />
          {/* Puzzle number: text-sm font-medium */}
          <div
            className={`h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded ${
              !reduceMotion ? 'skeleton-shimmer' : ''
            }`}
          />
        </div>

        {/* Chevron */}
        <div className="w-5 h-5 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export default function WelcomeScreenSkeleton() {
  const { reduceMotion, highContrast, isDark } = useTheme();
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);
  const [isVisible, setIsVisible] = useState(true);

  const logoSrc = isDark
    ? `/branding/tandem-dark.png?v=${ASSET_VERSION}`
    : `/branding/tandem-light.png?v=${ASSET_VERSION}`;

  useEffect(() => {
    let timeoutId = null;

    // Rotate through loading messages
    const interval = setInterval(() => {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setLoadingText(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
        setIsVisible(true);
      }, 300);
    }, 2000);

    return () => {
      clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <>
      {/* Fixed Header Skeleton */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 pt-safe border-b-[3px] ${
          highContrast
            ? 'bg-hc-surface border-hc-border'
            : 'bg-ghost-white dark:bg-bg-card border-border-main'
        }`}
      >
        <div className="max-w-2xl w-full mx-auto px-4">
          <div className="flex items-center justify-between h-[70px]">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3">
              <div className="w-[60px] h-[60px] relative flex-shrink-0">
                <Image
                  src={logoSrc}
                  alt="Tandem"
                  width={60}
                  height={60}
                  className="rounded-lg"
                  priority
                />
              </div>
              <h1
                className={`text-lg font-bold ${
                  highContrast ? 'text-hc-text' : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                Tandem Daily Games
              </h1>
            </div>

            {/* Right: Hamburger placeholder */}
            <div className="w-12 h-12 flex items-center justify-center">
              <div className="w-6 h-6 flex flex-col items-center justify-center gap-1.5">
                <div className="w-6 h-0.5 bg-text-primary rounded-full" />
                <div className="w-6 h-0.5 bg-text-primary rounded-full" />
                <div className="w-6 h-0.5 bg-text-primary rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content with padding for fixed header */}
      <main
        className={`min-h-screen flex flex-col pt-[calc(70px+env(safe-area-inset-top))] pb-safe ${
          highContrast ? 'bg-hc-background' : 'bg-bg-primary dark:bg-bg-primary'
        }`}
      >
        <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 animate-fade-in">
          {/* Greeting Skeleton - matches text-2xl (h-8), text-base (h-6) */}
          <div className="text-center mb-6">
            <div
              className={`h-8 w-48 mx-auto mb-1 bg-gray-200 dark:bg-gray-700 rounded-lg ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            <div
              className={`h-6 w-64 mx-auto mb-1 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            <div
              className={`h-6 w-56 mx-auto bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
          </div>

          {/* Game Cards Skeleton */}
          <div className="space-y-4">
            <GameCardSkeleton
              reduceMotion={reduceMotion}
              highContrast={highContrast}
              animationDelay={0}
              loadingText={loadingText}
              isTextVisible={isVisible}
            />
            <GameCardSkeleton
              reduceMotion={reduceMotion}
              highContrast={highContrast}
              animationDelay={100}
            />
            <GameCardSkeleton
              reduceMotion={reduceMotion}
              highContrast={highContrast}
              animationDelay={150}
            />
            <GameCardSkeleton
              reduceMotion={reduceMotion}
              highContrast={highContrast}
              animationDelay={250}
            />
          </div>

          {/* About Section Skeleton - matches actual AboutSection structure */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Title: text-sm font-bold mb-2 */}
            <div
              className={`h-5 w-48 mb-2 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            {/* Description: text-sm leading-relaxed (multi-line paragraph) */}
            <div
              className={`h-4 w-full mb-1 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            <div
              className={`h-4 w-full mb-1 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            <div
              className={`h-4 w-3/4 mb-3 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />
            {/* Subscribe CTA: text-sm font-medium */}
            <div
              className={`h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded ${
                !reduceMotion ? 'skeleton-shimmer' : ''
              }`}
            />

            {/* App Store section (web only - hidden on native iOS) */}
            {!Capacitor.isNativePlatform() && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                {/* Title: text-sm font-bold mb-3 */}
                <div
                  className={`h-5 w-64 mb-3 bg-gray-200 dark:bg-gray-700 rounded ${
                    !reduceMotion ? 'skeleton-shimmer' : ''
                  }`}
                />
                {/* App Store badge: 120x40 */}
                <div
                  className={`h-10 w-[120px] bg-gray-200 dark:bg-gray-700 rounded ${
                    !reduceMotion ? 'skeleton-shimmer' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Skeleton - matches actual Footer structure */}
        <div className="max-w-2xl w-full mx-auto px-4">
          <footer className="pt-8 pb-4">
            <div className="text-center">
              {/* Copyright: text-xs mb-3 */}
              <div
                className={`h-4 w-32 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded ${
                  !reduceMotion ? 'skeleton-shimmer' : ''
                }`}
              />
              {/* Description: text-xs mb-3 */}
              <div
                className={`h-4 w-72 mx-auto mb-3 bg-gray-200 dark:bg-gray-700 rounded ${
                  !reduceMotion ? 'skeleton-shimmer' : ''
                }`}
              />
              {/* Social icons: 3 buttons with w-10 h-10 and gap-4 */}
              <div className="flex items-center justify-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 ${
                    !reduceMotion ? 'skeleton-shimmer' : ''
                  }`}
                />
                <div
                  className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 ${
                    !reduceMotion ? 'skeleton-shimmer' : ''
                  }`}
                />
                <div
                  className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 ${
                    !reduceMotion ? 'skeleton-shimmer' : ''
                  }`}
                />
              </div>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
