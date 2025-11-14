'use client';

/**
 * First Time Setup Manager
 *
 * Manages the display of the first-time account success modal.
 * Listens to AuthContext and shows the modal when a user completes
 * their first sign-in after account creation.
 *
 * @component
 */

import { useAuth } from '@/contexts/AuthContext';
import FirstTimeAccountSuccessModal from '@/components/FirstTimeAccountSuccessModal';

export default function FirstTimeSetupManager() {
  const { user, showFirstTimeSetup, dismissFirstTimeSetup } = useAuth();

  const handleClose = () => {
    dismissFirstTimeSetup();
  };

  return (
    <FirstTimeAccountSuccessModal
      isOpen={showFirstTimeSetup}
      onClose={handleClose}
      userId={user?.id}
    />
  );
}
