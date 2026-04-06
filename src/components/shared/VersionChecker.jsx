'use client';

import { useEffect, useState } from 'react';
import platformService from '@/services/platform';
import apiService from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';

const APP_VERSION = '1.0.0'; // Current app version

export default function VersionChecker() {
  const { highContrast } = useTheme();
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    if (!platformService.isPlatformNative()) {
      return;
    }

    const checkVersion = async () => {
      try {
        const info = await apiService.checkVersion();
        if (info) {
          setVersionInfo(info);

          // Compare versions
          const minVersion = info.minSupportedClient || '1.0.0';
          if (isVersionOlder(APP_VERSION, minVersion)) {
            setUpdateRequired(true);
          }
        }
      } catch (error) {
        // Version check failed - non-critical
      }
    };

    // Check version on mount
    checkVersion();

    // Check version every hour
    const interval = setInterval(checkVersion, 3600000);

    return () => clearInterval(interval);
  }, []);

  // Compare semantic versions (returns true if current < required)
  const isVersionOlder = (current, required) => {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const c = currentParts[i] || 0;
      const r = requiredParts[i] || 0;
      if (c < r) {
        return true;
      }
      if (c > r) {
        return false;
      }
    }
    return false;
  };

  if (!updateRequired) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className={`rounded-lg p-6 max-w-md w-full ${
          highContrast
            ? 'bg-hc-surface border-2 border-hc-border text-hc-text'
            : 'bg-bg-surface dark:bg-bg-card'
        }`}
      >
        <div className="text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              highContrast ? 'bg-hc-primary' : 'bg-primary'
            }`}
          >
            <svg
              className={`w-8 h-8 ${highContrast ? 'text-hc-primary-text' : 'text-white'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <h2
            className={`text-2xl font-bold mb-2 ${highContrast ? 'text-hc-text' : 'text-text-primary'}`}
          >
            Update Required
          </h2>

          <p className={`mb-6 ${highContrast ? 'text-hc-text opacity-80' : 'text-text-secondary'}`}>
            A new version of Tandem is available. Please update the app to continue playing.
          </p>

          <div
            className={`space-y-2 text-sm mb-6 ${highContrast ? 'text-hc-text opacity-80' : 'text-text-secondary'}`}
          >
            <p>Current version: {APP_VERSION}</p>
            <p>Required version: {versionInfo?.minSupportedClient || '1.0.0'}</p>
          </div>

          <a
            href="https://apps.apple.com/app/tandem-daily"
            className={`inline-block w-full py-3 px-4 rounded-xl font-semibold transition-all ${
              highContrast
                ? 'bg-hc-primary text-hc-primary-text border-2 border-hc-border'
                : 'bg-primary hover:bg-primary-hover text-white'
            }`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Update Now
          </a>
        </div>
      </div>
    </div>
  );
}
