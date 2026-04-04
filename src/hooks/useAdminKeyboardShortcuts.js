'use client';

import { useCallback, useEffect } from 'react';

/**
 * Superhuman-style keyboard shortcuts for the admin panel.
 * Single-key shortcuts that fire instantly — no modifier keys needed.
 *
 * Shortcuts are suppressed when focus is inside an input, textarea, select,
 * or any element with contentEditable.
 */
export default function useAdminKeyboardShortcuts({
  tabs,
  activeTab,
  onTabChange,
  calendarRef,
  activeEditor,
  onCreateToday,
  onCloseEditor,
  showHelp,
  onToggleHelp,
}) {
  const isTyping = useCallback((e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (e.target.isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Never intercept when typing in form fields
      if (isTyping(e)) return;

      // Never intercept modified keys (Cmd, Ctrl, Alt) — those belong to the browser
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key;

      // ── ? — Toggle shortcut help ──
      if (key === '?') {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // ── Escape — Dismiss help, or close editor ──
      if (key === 'Escape') {
        if (showHelp) {
          e.preventDefault();
          onToggleHelp();
          return;
        }
        if (activeEditor) {
          e.preventDefault();
          onCloseEditor();
          return;
        }
        return;
      }

      // Don't handle shortcuts while help overlay is open (except ? and Escape above)
      if (showHelp) return;

      // ── Tab switching: 1-9, 0 ──
      if (/^[1-9]$/.test(key)) {
        const idx = parseInt(key, 10) - 1;
        if (idx < tabs.length) {
          e.preventDefault();
          onTabChange(tabs[idx].id);
        }
        return;
      }
      if (key === '0' && tabs.length >= 10) {
        e.preventDefault();
        onTabChange(tabs[9].id);
        return;
      }

      // ── Calendar-specific shortcuts (only when on calendar tab, no editor open) ──
      if (activeTab === 'calendar' && !activeEditor) {
        switch (key) {
          case 't':
            e.preventDefault();
            calendarRef.current?.goToToday();
            return;
          case 'w':
            e.preventDefault();
            calendarRef.current?.setViewMode('week');
            return;
          case 'm':
            e.preventDefault();
            calendarRef.current?.setViewMode('month');
            return;
          case 'c':
            e.preventDefault();
            onCreateToday();
            return;
        }
      }

      // ── Feedback shortcuts ──
      if (activeTab === 'feedback') {
        if (key === 'r') {
          e.preventDefault();
          // Dispatch custom event for feedback refresh
          window.dispatchEvent(new CustomEvent('admin-feedback-refresh'));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTyping,
    tabs,
    activeTab,
    activeEditor,
    showHelp,
    calendarRef,
    onTabChange,
    onCreateToday,
    onCloseEditor,
    onToggleHelp,
  ]);
}

/**
 * Shortcut definitions for display in the help overlay.
 * Grouped by context.
 */
export const SHORTCUT_GROUPS = [
  {
    label: 'Navigation',
    shortcuts: [
      { keys: ['1'], description: 'Calendar' },
      { keys: ['2'], description: 'Elements' },
      { keys: ['3'], description: 'Feedback' },
      { keys: ['4', '–', '0'], description: 'Other tabs' },
    ],
  },
  {
    label: 'Calendar',
    shortcuts: [
      { keys: ['T'], description: 'Jump to today' },
      { keys: ['W'], description: 'Week view' },
      { keys: ['M'], description: 'Month view' },
      { keys: ['C'], description: 'Create puzzle for today' },
      { keys: ['\u2190'], description: 'Previous week/month' },
      { keys: ['\u2192'], description: 'Next week/month' },
    ],
  },
  {
    label: 'Game Selector',
    shortcuts: [
      { keys: ['1'], description: 'Tandem' },
      { keys: ['2'], description: 'Mini' },
      { keys: ['3'], description: 'Alchemy' },
      { keys: ['4'], description: 'Reel Connections' },
    ],
  },
  {
    label: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close / go back' },
    ],
  },
];
