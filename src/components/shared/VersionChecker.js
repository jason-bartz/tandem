'use client';

import { useEffect, useState } from 'react';
import platformService from '@/services/platform';
import apiService from '@/services/api';

const APP_VERSION = '1.0.0'; // Current app version

export default function VersionChecker() {
  const [updateRequired, setUpdateRequired] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);

  useEffect(() => {
    // Only check version on native platforms
    if (!platformService.isPlatformNative()) return;

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
      if (c < r) return true;
      if (c > r) return false;
    }
    return false;
  };

  if (!updateRequired) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white"
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

          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
            Update Required
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            A new version of Tandem is available. Please update the app to continue playing.
          </p>

          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            <p>Current version: {APP_VERSION}</p>
            <p>Required version: {versionInfo?.minSupportedClient || '1.0.0'}</p>
          </div>

          <a
            href="https://apps.apple.com/app/tandem-daily"
            className="inline-block w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
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