'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import HamburgerMenu from './HamburgerMenu';
import SidebarMenu from './SidebarMenu';
import FeedbackPane from '@/components/FeedbackPane';
import { ASSET_VERSION } from '@/lib/constants';

/**
 * Header - Fixed header component for the main page
 *
 * Features:
 * - Fixed position at top of screen
 * - Logo (light/dark mode variants)
 * - Title "Tandem Daily Games"
 * - Hamburger menu on the right
 * - Safe area support for iOS
 * - High contrast and dark mode support
 */
export default function Header({
  onOpenStats,
  onOpenArchive,
  onOpenHowToPlay,
  onOpenSettings,
}) {
  const { isDark, highContrast } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const logoSrc = isDark
    ? `/images/tandem-dark.png?v=${ASSET_VERSION}`
    : `/images/tandem-light.png?v=${ASSET_VERSION}`;

  return (
    <>
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
                  highContrast
                    ? 'text-hc-text'
                    : 'text-gray-900 dark:text-gray-100'
                }`}
              >
                Tandem Daily Games
              </h1>
            </div>

            {/* Right: Hamburger Menu */}
            <HamburgerMenu
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
        </div>
      </header>

      {/* Sidebar Menu */}
      <SidebarMenu
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenStats={onOpenStats}
        onOpenArchive={onOpenArchive}
        onOpenHowToPlay={onOpenHowToPlay}
        onOpenSettings={onOpenSettings}
        onOpenFeedback={() => {
          setIsSidebarOpen(false);
          setTimeout(() => setShowFeedback(true), 200);
        }}
      />

      {/* Feedback Pane */}
      <FeedbackPane isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
    </>
  );
}
