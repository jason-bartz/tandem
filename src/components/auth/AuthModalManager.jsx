'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';
import { Capacitor } from '@capacitor/core';

/**
 * AuthModalManager - Global authentication modal controller
 *
 * Handles opening the auth modal based on:
 * - URL parameters (?auth=required, ?auth=signup, ?auth=login)
 * - Custom events (authModalOpen)
 *
 * This component should be included once at the root level.
 * Only active on web - iOS uses native Apple Sign In.
 */
export default function AuthModalManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWeb = Capacitor.getPlatform() === 'web';

  // Handle URL parameters
  useEffect(() => {
    if (!isWeb) return;
    const authParam = searchParams?.get('auth');
    if (authParam) {
      // Open modal based on URL parameter
      if (authParam === 'required' || authParam === 'login') {
        setMode('login');
        setIsOpen(true);
      } else if (authParam === 'signup') {
        setMode('signup');
        setIsOpen(true);
      }
    }
  }, [searchParams, isWeb]);

  // Handle custom events from other components
  useEffect(() => {
    if (!isWeb) return;

    const handleAuthModalOpen = (event) => {
      const { mode: requestedMode = 'login' } = event.detail || {};
      setMode(requestedMode);
      setIsOpen(true);
    };

    window.addEventListener('authModalOpen', handleAuthModalOpen);
    return () => {
      window.removeEventListener('authModalOpen', handleAuthModalOpen);
    };
  }, [isWeb]);

  // Only render on web platform
  if (!isWeb) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    // Clean up URL parameter without triggering navigation
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleSuccess = () => {
    setIsOpen(false);
    // Clean up URL parameter
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    // Refresh the page to update authentication state
    router.refresh();
  };

  return (
    <AuthModal isOpen={isOpen} onClose={handleClose} initialMode={mode} onSuccess={handleSuccess} />
  );
}
