'use client';

import { useEffect, useCallback } from 'react';
import { SHORTCUT_GROUPS } from '@/hooks/useAdminKeyboardShortcuts';

export default function KeyboardShortcutHelp({ onClose }) {
  const handleBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-bg-card rounded-lg w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Keyboard Shortcuts
          </h2>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-bg-surface text-text-muted rounded border border-border-light">
              ?
            </kbd>
            <span className="text-xs text-text-muted">to toggle</span>
          </div>
        </div>

        {/* Shortcut groups */}
        <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] mb-2">
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-bg-surface transition-colors"
                  >
                    <span className="text-sm text-text-primary">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, ki) => (
                        <span key={ki}>
                          {key === '–' ? (
                            <span className="text-xs text-text-muted mx-0.5">–</span>
                          ) : (
                            <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-semibold bg-bg-surface text-text-secondary rounded border border-border-light">
                              {key}
                            </kbd>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-light bg-bg-surface">
          <p className="text-[11px] text-text-muted text-center">
            Shortcuts are disabled when typing in input fields
          </p>
        </div>
      </div>
    </div>
  );
}
