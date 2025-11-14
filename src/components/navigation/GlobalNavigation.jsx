'use client';

import { useState } from 'react';
import HamburgerMenu from './HamburgerMenu';
import SidebarMenu from './SidebarMenu';
import FeedbackPane from '@/components/FeedbackPane';

/**
 * GlobalNavigation - Hamburger menu and sidebar navigation wrapper
 *
 * This component provides consistent navigation across all screens with:
 * - Hamburger menu button (top-right corner)
 * - Sliding sidebar menu
 * - Modal integration (stats, archive, how-to-play, settings, feedback)
 *
 * Usage:
 * ```jsx
 * <GlobalNavigation
 *   onOpenStats={() => setShowStats(true)}
 *   onOpenArchive={() => setShowArchive(true)}
 *   onOpenHowToPlay={() => setShowHowToPlay(true)}
 *   onOpenSettings={() => setShowSettings(true)}
 * >
 *   {children}
 * </GlobalNavigation>
 * ```
 *
 * Features:
 * - Sticky positioning with safe-area support for iOS
 * - Neo-brutalist design with brand colors
 * - Dark mode and high contrast support
 * - Respects reduced motion preferences (Apple HIG)
 * - 44pt minimum touch target (Apple HIG)
 */
export default function GlobalNavigation({
  children,
  onOpenStats,
  onOpenArchive,
  onOpenHowToPlay,
  onOpenSettings,
  className = '',
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <>
      {/* Hamburger Menu Button - Positioned to overlap content */}
      <div className="relative z-30 pt-safe">
        <div className={`max-w-2xl w-full mx-auto px-6 ${className}`}>
          <div className="flex justify-end pt-2 pr-2">
            <HamburgerMenu
              isOpen={isSidebarOpen}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {children}

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
