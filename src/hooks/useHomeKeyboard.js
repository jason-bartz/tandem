'use client';

import { useEffect, useCallback, useState } from 'react';

/**
 * Keyboard shortcut definitions for the home screen help modal.
 */
export const HOME_KEYBOARD_SHORTCUTS = [
  {
    category: 'Games',
    shortcuts: [
      { keys: ['1'], description: 'Open Daily Tandem' },
      { keys: ['2'], description: 'Open Daily Mini' },
      { keys: ['3'], description: 'Open Daily Alchemy' },
      { keys: ['4'], description: 'Open Reel Connections' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['M'], description: 'Open menu' },
      { keys: ['Esc'], description: 'Close menu / modal' },
    ],
  },
  {
    category: 'Menu (when open)',
    shortcuts: [
      { keys: ['P'], description: 'How to Play' },
      { keys: ['S'], description: 'Stats' },
      { keys: ['L'], description: 'Leaderboard' },
      { keys: ['A'], description: 'Archive' },
      { keys: ['K'], description: 'Settings' },
      { keys: ['F'], description: 'Feedback' },
    ],
  },
];

/**
 * useHomeKeyboard — Keyboard navigation for the home / welcome screen.
 *
 * Number keys 1-4 jump straight to each game.
 * M opens the sidebar menu, and single-letter shortcuts navigate within it.
 */
export function useHomeKeyboard({
  onTandemClick,
  onMiniClick,
  onAlchemyClick,
  onReelClick,
  isSidebarOpen,
  setIsSidebarOpen,
  onOpenStats,
  onOpenArchive,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenFeedback,
  hasOpenModal,
}) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      const key = e.key;
      const tag = e.target.tagName;

      // Never intercept when typing in form elements
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.target.isContentEditable) return;

      // Never intercept Ctrl/Cmd/Alt combos
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // ─── Help modal toggle ───
      if (key === '?' || (key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      // ─── Help modal open — only Esc and ? close it ───
      if (showShortcuts) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowShortcuts(false);
        }
        return;
      }

      // ─── Escape: close sidebar or modals ───
      if (key === 'Escape') {
        if (isSidebarOpen) {
          e.preventDefault();
          setIsSidebarOpen(false);
        }
        // Other modals handle their own Escape via their own listeners
        return;
      }

      // ─── Don't intercept if a dialog is open (stats, archive, etc.) ───
      if (hasOpenModal) return;

      // ─── Sidebar open: single-letter menu navigation ───
      if (isSidebarOpen) {
        e.preventDefault();

        switch (key) {
          case 'p':
          case 'P':
            setIsSidebarOpen(false);
            onOpenHowToPlay?.();
            break;
          case 's':
          case 'S':
            setIsSidebarOpen(false);
            onOpenStats?.();
            break;
          case 'l':
          case 'L':
            setIsSidebarOpen(false);
            onOpenLeaderboard?.();
            break;
          case 'a':
          case 'A':
            setIsSidebarOpen(false);
            onOpenArchive?.();
            break;
          case 'k':
          case 'K':
            setIsSidebarOpen(false);
            onOpenSettings?.();
            break;
          case 'f':
          case 'F':
            setIsSidebarOpen(false);
            onOpenFeedback?.();
            break;
        }
        return;
      }

      // ─── Home screen: number keys to jump to games ───
      switch (key) {
        case '1':
          e.preventDefault();
          onTandemClick?.();
          break;
        case '2':
          e.preventDefault();
          onMiniClick?.();
          break;
        case '3':
          e.preventDefault();
          onAlchemyClick?.();
          break;
        case '4':
          e.preventDefault();
          onReelClick?.();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsSidebarOpen(true);
          break;
      }
    },
    [
      showShortcuts,
      isSidebarOpen,
      hasOpenModal,
      setIsSidebarOpen,
      onTandemClick,
      onMiniClick,
      onAlchemyClick,
      onReelClick,
      onOpenStats,
      onOpenArchive,
      onOpenHowToPlay,
      onOpenSettings,
      onOpenLeaderboard,
      onOpenFeedback,
    ]
  );

  // Attach global keydown listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    showShortcuts,
    setShowShortcuts,
  };
}
