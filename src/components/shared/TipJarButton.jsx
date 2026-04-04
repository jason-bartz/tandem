'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import Image from 'next/image';
import subscriptionService from '@/services/subscriptionService';
import { useHaptics } from '@/hooks/useHaptics';
import logger from '@/lib/logger';

/**
 * TipJarButton - One-time tip via Apple IAP (iOS) or Buy Me A Coffee link (web)
 *
 * On iOS: Triggers a consumable in-app purchase
 * On web: Links to Buy Me A Coffee
 */
export default function TipJarButton({ className = '' }) {
  const [purchasing, setPurchasing] = useState(false);
  const [tipPrice, setTipPrice] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [error, setError] = useState(null);
  const { correctAnswer: successHaptic, lightTap } = useHaptics();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    const loadTipProduct = async () => {
      try {
        await subscriptionService.initialize();
        const tipProduct = await subscriptionService.getTipProduct();
        if (tipProduct?.pricing?.price) {
          setTipPrice(tipProduct.pricing.price);
        }
      } catch (error) {
        logger.error('[TipJarButton] Failed to load tip product', error);
      }
    };

    loadTipProduct();
  }, [isNative]);

  const handleTip = async () => {
    lightTap();

    if (!isNative) {
      window.open('https://buymeacoffee.com/jasonbartz', '_blank');
      return;
    }

    try {
      setPurchasing(true);
      setError(null);
      await subscriptionService.purchaseTip();
      successHaptic();
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (err) {
      if (err.message?.includes('cancelled')) {
        // User cancelled — no action needed
      } else {
        logger.error('[TipJarButton] Tip purchase failed', err);
        setError('Something went wrong. Please try again.');
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (showThankYou) {
    return (
      <div
        className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent-green text-white font-semibold rounded-xl transition-all ${className}`}
      >
        Thank you!
      </div>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={handleTip}
        disabled={purchasing}
        className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-flat-accent hover:bg-flat-accent-hover text-gray-900 font-semibold rounded-xl transition-all disabled:opacity-50 ${className}`}
      >
        {purchasing ? (
          'Processing...'
        ) : (
          <>
            <Image
              src="/ui/shared/coffee.png"
              alt="Coffee cup"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span>Buy me a coffee</span>
            {tipPrice && <span className="opacity-80">({tipPrice})</span>}
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-red-400 text-center mt-1">{error}</p>}
    </div>
  );
}
