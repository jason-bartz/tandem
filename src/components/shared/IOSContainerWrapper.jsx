'use client';

import { Fragment, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import IOSContainer to avoid SSR issues
const IOSContainer = dynamic(
  () => import('./IOSContainer'),
  {
    ssr: false,
    loading: () => <>{/* Loading... */}</>
  }
);

export default function IOSContainerWrapper({ children }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if running on iOS/Capacitor
    const checkPlatform = async () => {
      if (typeof window !== 'undefined') {
        try {
          const { Capacitor } = await import('@capacitor/core');
          setIsIOS(Capacitor.isNativePlatform());
        } catch (error) {
          // Capacitor not available, we're on web
          setIsIOS(false);
        }
        setIsLoaded(true);
      }
    };
    checkPlatform();
  }, []);

  // Don't render until we've checked the platform
  if (!isLoaded) {
    return <>{children}</>;
  }

  // Choose container based on platform
  const Container = isIOS ? IOSContainer : Fragment;

  return (
    <Container>
      {children}
    </Container>
  );
}