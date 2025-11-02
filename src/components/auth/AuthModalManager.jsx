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
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWeb = Capacitor.getPlatform() === 'web';

  // Handle URL parameters
  useEffect(() => {
    if (!isWeb) return;
    const authParam = searchParams?.get('auth');
    const emailConfirmed = searchParams?.get('email_confirmed');
    const authError = searchParams?.get('auth_error');

    if (emailConfirmed === 'true') {
      // Email confirmed successfully - show success message and open login modal
      setConfirmationMessage('Email confirmed! You can now sign in.');
      setMode('login');
      setIsOpen(true);
      // Clean up URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (authError === 'true') {
      // Authentication error
      setConfirmationMessage('Authentication failed. Please try again.');
      setMode('login');
      setIsOpen(true);
      // Clean up URL parameter
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (authParam) {
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
    setConfirmationMessage(null);
    // Clean up URL parameter without triggering navigation
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleSuccess = () => {
    setIsOpen(false);
    setConfirmationMessage(null);
    // Clean up URL parameter
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    // Refresh the page to update authentication state
    router.refresh();
  };

  return (
    <AuthModal
      isOpen={isOpen}
      onClose={handleClose}
      initialMode={mode}
      onSuccess={handleSuccess}
      initialMessage={confirmationMessage}
    />
  );
}
