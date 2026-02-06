'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { isAdSupported } from '@/lib/standalone';

const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
const ADSENSE_SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

/**
 * AdBanner - Google AdSense top banner ad
 *
 * Only renders when NEXT_PUBLIC_AD_SUPPORTED=true and AdSense env vars are configured.
 * Renders a responsive display ad at the top of the page.
 */
export default function AdBanner() {
  const adRef = useRef(null);
  const adInitialized = useRef(false);

  useEffect(() => {
    if (!isAdSupported || !ADSENSE_CLIENT_ID || !ADSENSE_SLOT_ID) return;
    if (adInitialized.current) return;

    try {
      if (window.adsbygoogle && adRef.current) {
        window.adsbygoogle.push({});
        adInitialized.current = true;
      }
    } catch {
      // AdSense not ready yet - will be pushed when script loads
    }
  }, []);

  if (!isAdSupported || !ADSENSE_CLIENT_ID || !ADSENSE_SLOT_ID) {
    return null;
  }

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
        onLoad={() => {
          if (!adInitialized.current && adRef.current) {
            try {
              window.adsbygoogle = window.adsbygoogle || [];
              window.adsbygoogle.push({});
              adInitialized.current = true;
            } catch {
              // Ad initialization failed silently
            }
          }
        }}
      />
      <div className="w-full flex justify-center">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', maxWidth: '728px' }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={ADSENSE_SLOT_ID}
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </>
  );
}
