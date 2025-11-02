'use client';

import { useEffect, useState } from 'react';
import PaywallModal from '@/components/PaywallModal';
import { Capacitor } from '@capacitor/core';

/**
 * PaywallModalManager - Global paywall modal controller
 *
 * Listens for custom events to open the paywall modal from anywhere in the app.
 * Only active on web platform.
 */
export default function PaywallModalManager() {
  const [isOpen, setIsOpen] = useState(false);
  const isWeb = Capacitor.getPlatform() === 'web';

  // Handle custom events from other components
  useEffect(() => {
    if (!isWeb) return;

    const handleOpenPaywall = () => {
      setIsOpen(true);
    };

    window.addEventListener('openPaywall', handleOpenPaywall);
    return () => {
      window.removeEventListener('openPaywall', handleOpenPaywall);
    };
  }, [isWeb]);

  // Only render on web platform
  if (!isWeb) {
    return null;
  }

  return (
    <PaywallModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onPurchaseComplete={() => {
        setIsOpen(false);
      }}
    />
  );
}
