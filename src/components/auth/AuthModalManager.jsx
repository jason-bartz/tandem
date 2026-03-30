'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthModal from './AuthModal';
import WelcomeBackModal from './WelcomeBackModal';

/**
 * AuthModalManager - Global authentication modal controller
 *
 * Handles opening the auth modal based on:
 * - URL parameters (?auth=required, ?auth=signup, ?auth=login)
 * - Custom events (authModalOpen)
 *
 * This component should be included once at the root level.
 * Active on both web and iOS — AuthModal handles platform differences internally.
 */
export default function AuthModalManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [confirmationMessage, setConfirmationMessage] = useState(null);
  const [messageType, setMessageType] = useState('success'); // 'success' or 'error'
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const authParam = searchParams?.get('auth');
    const emailConfirmed = searchParams?.get('email_confirmed');
    const authError = searchParams?.get('auth_error');
    const error = searchParams?.get('error');
    const errorCode = searchParams?.get('error_code');
    const errorDescription = searchParams?.get('error_description');

    // Also check hash parameters (Supabase sometimes puts errors in hash)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hashError = hashParams.get('error');
    const hashErrorCode = hashParams.get('error_code');
    const hashErrorDescription = hashParams.get('error_description');

    // Determine which error source to use
    const actualError = error || hashError;
    const actualErrorCode = errorCode || hashErrorCode;
    const actualErrorDescription = errorDescription || hashErrorDescription;

    if (emailConfirmed === 'true') {
      // Email confirmed successfully - clean up URL parameter
      // The auth session is already established via /auth/callback code exchange.
      // FirstTimeSetupManager will detect the new user (via SIGNED_IN event)
      // and show the username/avatar selection modal automatically.
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (actualError || authError === 'true') {
      let errorMessage =
        'Email confirmation failed. Your account was created — please sign in with your email and password below.';

      if (actualErrorCode === 'otp_expired' || actualError === 'access_denied') {
        errorMessage =
          'Your confirmation or reset link has expired. Please sign in with your email and password, or request a new link below.';
        setMode('reset');
      } else {
        if (actualErrorDescription) {
          const decoded = decodeURIComponent(actualErrorDescription.replace(/\+/g, ' '));
          // Provide helpful context alongside the technical error
          errorMessage = `${decoded}. Your account may still have been created — try signing in below.`;
        }
        setMode('login');
      }

      setConfirmationMessage(errorMessage);
      setMessageType('error'); // This is an error message
      setIsOpen(true);

      // Clean up URL parameters (both query and hash)
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
  }, [searchParams]);

  useEffect(() => {
    const handleAuthModalOpen = (event) => {
      const { mode: requestedMode = 'login' } = event.detail || {};
      setMode(requestedMode);
      setIsOpen(true);
    };

    window.addEventListener('authModalOpen', handleAuthModalOpen);
    return () => {
      window.removeEventListener('authModalOpen', handleAuthModalOpen);
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setConfirmationMessage(null);
    setMessageType('success'); // Reset to default
    // Clean up URL parameter without triggering navigation
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  };

  const handleSuccess = () => {
    setIsOpen(false);
    setConfirmationMessage(null);
    setMessageType('success'); // Reset to default
    // Clean up URL parameter
    if (searchParams?.get('auth')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    // Refresh the page to update authentication state
    router.refresh();
  };

  const handleWelcomeBackClose = () => {
    setShowWelcomeBack(false);
  };

  return (
    <>
      <AuthModal
        isOpen={isOpen}
        onClose={handleClose}
        initialMode={mode}
        onSuccess={handleSuccess}
        initialMessage={confirmationMessage}
        initialMessageType={messageType}
      />
      <WelcomeBackModal isOpen={showWelcomeBack} onClose={handleWelcomeBackClose} />
    </>
  );
}
