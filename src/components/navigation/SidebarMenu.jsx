'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useHaptics } from '@/hooks/useHaptics';
import avatarService from '@/services/avatar.service';

/**
 * SidebarMenu - Sliding sidebar navigation menu
 *
 * Features:
 * - Slides in from the right with smooth animation
 * - Neo-brutalist styling with brand colors
 * - Three sections: Player, Navigation, Games, Footer links
 * - Click outside to close
 * - Dark mode support
 * - Profile picture and username display
 * - Guest mode with sign-in CTA
 */
export default function SidebarMenu({
  isOpen,
  onClose,
  onOpenStats,
  onOpenArchive,
  onOpenHowToPlay,
  onOpenSettings,
}) {
  const { highContrast, reduceMotion, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const getIconPath = useUIIcon();
  const { lightTap } = useHaptics();
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null);

  // Load user profile with avatar
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setUserProfile(null);
        return;
      }

      try {
        const profile = await avatarService.getUserProfileWithAvatar(user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error('[SidebarMenu] Failed to load user profile:', error);
      }
    };

    if (isOpen) {
      loadProfile();
    }
  }, [user, isOpen]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleNavigation = (path) => {
    lightTap();
    onClose();
    router.push(path);
  };

  const handleModalOpen = (openFn) => {
    lightTap();
    onClose();
    // Small delay to allow sidebar to close before modal opens
    setTimeout(openFn, 200);
  };

  // Get username from profile
  const getUsername = () => {
    if (!user) return null;
    return userProfile?.username || null;
  };

  // Get user's avatar URL
  const getUserAvatar = () => {
    if (!user) return null;
    // Check for avatar_image_path first (from getUserProfileWithAvatar)
    // Then fall back to avatar_url for backward compatibility
    return userProfile?.avatar_image_path || userProfile?.avatar_url || null;
  };

  const username = getUsername();
  const userAvatar = getUserAvatar();
  const isGuest = !user;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{
              type: reduceMotion ? 'tween' : 'spring',
              damping: 25,
              stiffness: 200,
              duration: reduceMotion ? 0.2 : undefined,
            }}
            className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] z-50 overflow-y-auto ${
              highContrast
                ? 'bg-hc-surface border-l-[4px] border-hc-border'
                : 'bg-bg-surface dark:bg-bg-card border-l-[4px] border-border-main'
            }`}
            role="dialog"
            aria-label="Navigation menu"
          >
            {/* Header with Close button and Theme toggle */}
            <div className="sticky top-0 z-10 flex justify-between items-center p-4 bg-inherit">
              {/* Theme toggle button */}
              <motion.button
                onClick={() => {
                  toggleTheme();
                  lightTap();
                }}
                className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                whileHover={{ scale: reduceMotion ? 1 : 1.1 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={isDark ? '/icons/ui/light-mode.png' : '/icons/ui/dark-mode.png'}
                  alt=""
                  className="w-6 h-6"
                />
              </motion.button>

              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
                aria-label="Close menu"
                whileHover={{ rotate: reduceMotion ? 0 : 90 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className="w-6 h-6 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </motion.button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6">
              {/* Player Section */}
              <section>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-1">
                  Player
                </h3>
                {isGuest ? (
                  /* Guest Message with Sign-In CTA */
                  <div
                    className={`w-full p-4 rounded-2xl border-[3px] ${
                      highContrast
                        ? 'bg-hc-surface border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                        : 'bg-white dark:bg-bg-surface border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)]'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {/* Guest Avatar */}
                      <div
                        className={`w-12 h-12 rounded-xl border-[3px] flex items-center justify-center flex-shrink-0 overflow-hidden ${
                          highContrast
                            ? 'bg-hc-primary border-hc-border'
                            : 'bg-gray-300 dark:bg-gray-600 border-border-main'
                        }`}
                      >
                        <img
                          src="/images/avatars/default-profile.png"
                          alt="Guest"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Greeting */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary">Hey Guest!</p>
                        <p className="text-xs text-text-secondary mt-1">
                          Sign in or create a free account to access all games and join the
                          leaderboard.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigation('/account')}
                      className={`w-full p-3 text-white rounded-xl text-sm font-bold transition-all ${
                        highContrast
                          ? 'bg-hc-primary border-[3px] border-hc-border shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                          : 'bg-accent-blue border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      Sign In / Create Account
                    </button>
                  </div>
                ) : (
                  /* Logged-In User Profile */
                  <>
                    <button
                      onClick={() => handleNavigation('/account')}
                      className={`w-full p-4 rounded-2xl border-[3px] flex items-center gap-3 transition-all text-left ${
                        highContrast
                          ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                          : 'bg-white dark:bg-bg-surface border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                      }`}
                    >
                      {/* Profile Picture */}
                      <div
                        className={`w-12 h-12 rounded-xl border-[3px] flex items-center justify-center flex-shrink-0 overflow-hidden ${
                          highContrast
                            ? 'bg-hc-primary border-hc-border'
                            : 'bg-accent-blue dark:bg-accent-pink border-border-main'
                        }`}
                      >
                        {userAvatar ? (
                          <img
                            src={userAvatar}
                            alt={username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl font-bold text-white">
                            {username ? username.charAt(0).toUpperCase() : 'U'}
                          </span>
                        )}
                      </div>

                      {/* Greeting */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary">Hey</p>
                        <p className="text-base font-bold text-text-primary truncate">
                          {username || 'Player'}!
                        </p>
                      </div>

                      {/* Arrow */}
                      <svg
                        className="w-5 h-5 text-text-secondary flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </>
                )}

                {/* Stats/Leaderboard Link - Always visible */}
                <div className="mt-2">
                  <MenuButton
                    icon={getIconPath('medal')}
                    label="Stats & Leaderboard"
                    onClick={() => handleModalOpen(onOpenStats)}
                    highContrast={highContrast}
                  />
                </div>
              </section>

              {/* Navigation Section */}
              <section className="-mt-4">
                <div className="space-y-2">
                  <MenuButton
                    icon={getIconPath('archive')}
                    label="Puzzle Archive"
                    onClick={() => handleModalOpen(onOpenArchive)}
                    highContrast={highContrast}
                  />
                  <MenuButton
                    icon={getIconPath('how-to-play')}
                    label="How to Play"
                    onClick={() => handleModalOpen(onOpenHowToPlay)}
                    highContrast={highContrast}
                  />
                  <MenuButton
                    icon={getIconPath('settings')}
                    label="Settings"
                    onClick={() => handleModalOpen(onOpenSettings)}
                    highContrast={highContrast}
                  />
                </div>
              </section>

              {/* Games Section */}
              <section>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-1">
                  Games
                </h3>
                <div className="space-y-2">
                  <GameButton
                    icon="/icons/ui/emoji-inter.png"
                    darkIcon="/icons/ui/emoji-inter-dark.png"
                    label="Daily Tandem"
                    onClick={() => handleNavigation('/')}
                    isActive={pathname === '/'}
                    gameColor="blue"
                    highContrast={highContrast}
                    isDark={isDark}
                  />
                  <GameButton
                    icon="/icons/ui/cryptic.png"
                    darkIcon="/icons/ui/cryptic-dark.png"
                    label="Daily Cryptic"
                    onClick={() => handleNavigation('/dailycryptic')}
                    isActive={pathname === '/dailycryptic'}
                    gameColor="purple"
                    highContrast={highContrast}
                    isDark={isDark}
                  />
                </div>
              </section>

              {/* Footer Links */}
              <section className="pt-4 border-t-[3px] border-border-main space-y-1">
                <FooterLink label="Support" onClick={() => handleNavigation('/support')} />
                <FooterLink label="About" onClick={() => handleNavigation('/about')} />
                <FooterLink
                  label="Privacy Policy"
                  onClick={() => handleNavigation('/privacypolicy')}
                />
                <FooterLink
                  label="Terms of Service"
                  onClick={() => handleNavigation('/terms')}
                />
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * MenuButton - Standard menu item button
 */
function MenuButton({ icon, label, onClick, highContrast }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3 rounded-2xl border-[3px] flex items-center gap-3 transition-all ${
        highContrast
          ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,1)]'
          : 'bg-white dark:bg-bg-surface border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
      }`}
    >
      <img src={icon} alt="" className="w-6 h-6" />
      <span className="text-base font-medium text-text-primary">{label}</span>
    </button>
  );
}

/**
 * GameButton - Game selection button with active state and custom colors
 */
function GameButton({ icon, darkIcon, label, onClick, isActive, gameColor, highContrast, isDark }) {
  const iconSrc = isDark ? darkIcon : icon;

  // Define colors for each game
  const getGameColors = () => {
    if (gameColor === 'blue') {
      return {
        bg: '#38b6ff', // Tandem blue
        text: 'text-white',
      };
    } else if (gameColor === 'purple') {
      return {
        bg: '#8b5cf6', // Purple-500 (Cryptic color)
        text: 'text-white',
      };
    }
    return {
      bg: '#ffce00', // Default yellow
      text: 'text-gray-900',
    };
  };

  const colors = getGameColors();

  return (
    <button
      onClick={onClick}
      style={!highContrast ? { backgroundColor: colors.bg } : undefined}
      className={`w-full p-3 rounded-2xl border-[3px] flex items-center gap-3 transition-all ${
        isActive
          ? highContrast
            ? 'bg-hc-primary border-hc-border shadow-[3px_3px_0px_rgba(0,0,0,1)]'
            : `border-border-main shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(0,0,0,0.6)]`
          : highContrast
          ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,1)]'
          : 'border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] opacity-80 hover:opacity-100'
      }`}
    >
      <img src={iconSrc} alt="" className="w-8 h-8" />
      <span className={`text-base font-bold ${!highContrast ? colors.text : 'text-text-primary'}`}>
        {label}
      </span>
    </button>
  );
}

/**
 * FooterLink - Text-only footer link
 */
function FooterLink({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full p-2 text-left text-sm text-text-secondary hover:text-text-primary transition-colors"
    >
      {label}
    </button>
  );
}
