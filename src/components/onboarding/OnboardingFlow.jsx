'use client';
import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { STORAGE_KEYS } from '@/lib/constants';
import DataConsentScreen from './DataConsentScreen';
import NotificationPermissionScreen from './NotificationPermissionScreen';

const ONBOARDING_STEPS = {
  DATA_CONSENT: 'data_consent',
  NOTIFICATIONS: 'notifications',
  COMPLETE: 'complete',
};

export default function OnboardingFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.DATA_CONSENT);

  const handleDataConsentContinue = () => {
    // Move to notifications screen
    setCurrentStep(ONBOARDING_STEPS.NOTIFICATIONS);
  };

  const handleDataConsentSkip = async () => {
    // User chose "Maybe Later" - continue to notifications screen
    setCurrentStep(ONBOARDING_STEPS.NOTIFICATIONS);
  };

  const handleNotificationsContinue = async () => {
    // Mark onboarding as complete
    await markOnboardingComplete();
    setCurrentStep(ONBOARDING_STEPS.COMPLETE);
    onComplete();
  };

  const handleNotificationsSkip = async () => {
    // Mark onboarding as complete even if notifications skipped
    await markOnboardingComplete();
    setCurrentStep(ONBOARDING_STEPS.COMPLETE);
    onComplete();
  };

  const markOnboardingComplete = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({
          key: STORAGE_KEYS.HAS_SEEN_ONBOARDING,
          value: 'true',
        });
      } else {
        localStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, 'true');
      }
    } catch (error) {
      console.error('Failed to save onboarding completion status:', error);
    }
  };

  // Render appropriate screen based on current step
  switch (currentStep) {
    case ONBOARDING_STEPS.DATA_CONSENT:
      return (
        <DataConsentScreen onContinue={handleDataConsentContinue} onSkip={handleDataConsentSkip} />
      );

    case ONBOARDING_STEPS.NOTIFICATIONS:
      return (
        <NotificationPermissionScreen
          onContinue={handleNotificationsContinue}
          onSkip={handleNotificationsSkip}
        />
      );

    case ONBOARDING_STEPS.COMPLETE:
    default:
      // This shouldn't be visible, but render nothing just in case
      return null;
  }
}
