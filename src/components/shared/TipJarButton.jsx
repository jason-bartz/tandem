'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import subscriptionService from '@/services/subscriptionService';
import { useHaptics } from '@/hooks/useHaptics';
import logger from '@/lib/logger';

/**
 * TipJarButton - One-time tip via Apple IAP (iOS) or Buy Me A Coffee link (web)
 *
 * On iOS: Triggers a consumable in-app purchase
 * On web: Links to Buy Me A Coffee
 */
export default function TipJarButton({ className = '', compact = false }) {
  const [purchasing, setPurchasing] = useState(false);
  const [tipPrice, setTipPrice] = useState(null);
  const [showThankYou, setShowThankYou] = useState(false);
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
      await subscriptionService.purchaseTip();
      successHaptic();
      setShowThankYou(true);
      setTimeout(() => setShowThankYou(false), 3000);
    } catch (error) {
      if (error.message?.includes('cancelled')) {
        // User cancelled — no action needed
      } else {
        logger.error('[TipJarButton] Tip purchase failed', error);
      }
    } finally {
      setPurchasing(false);
    }
  };

  if (showThankYou) {
    return (
      <div
        className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent-green text-white font-semibold rounded-xl border-[3px] border-black transition-all ${className}`}
      >
        Thank you!
      </div>
    );
  }

  return (
    <button
      onClick={handleTip}
      disabled={purchasing}
      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent-yellow hover:opacity-90 text-black font-semibold rounded-xl border-[3px] border-black transition-all disabled:opacity-50 ${className}`}
    >
      {purchasing ? (
        'Processing...'
      ) : (
        <>
          <span>{compact ? 'Tip' : 'Leave a Tip'}</span>
          {tipPrice && <span className="opacity-80">({tipPrice})</span>}
        </>
      )}
    </button>
  );
}
