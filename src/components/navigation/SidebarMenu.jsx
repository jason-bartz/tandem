'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUIIcon } from '@/hooks/useUIIcon';
import { useHaptics } from '@/hooks/useHaptics';
import { useHoroscope } from '@/hooks/useHoroscope';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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
  onOpenFeedback,
}) {
  const { highContrast, reduceMotion, isDark, toggleTheme } = useTheme();
  const { user, userProfile, profileLoading } = useAuth();
  const getIconPath = useUIIcon();
  const { lightTap } = useHaptics();
  const router = useRouter();
  const pathname = usePathname();

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

  // Get username with optimistic fallbacks
  const getUsername = () => {
    if (!user) return null;

    // Try database profile first
    if (userProfile?.username) {
      return userProfile.username;
    }

    // Fallback to auth metadata
    if (user.user_metadata?.username) {
      return user.user_metadata.username;
    }

    // Fallback to email username (before @ sign)
    if (user.email) {
      return user.email.split('@')[0];
    }

    return null;
  };

  // Get user's avatar URL with optimistic fallbacks
  const getUserAvatar = () => {
    if (!user) return null;

    // Try database profile first (preferred)
    if (userProfile?.avatar_image_path) {
      return userProfile.avatar_image_path;
    }

    // Fallback to legacy avatar_url
    if (userProfile?.avatar_url) {
      return userProfile.avatar_url;
    }

    // Fallback to auth metadata
    if (user.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }

    return null;
  };

  const username = getUsername();
  const userAvatar = getUserAvatar();
  const isGuest = !user;

  // Get zodiac sign and horoscope for logged-in users
  const getZodiacSign = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;

    const zodiacSigns = [
      { sign: 'Capricorn ♑', name: 'Capricorn', emoji: '♑', start: [12, 22], end: [1, 19] },
      { sign: 'Aquarius ♒', name: 'Aquarius', emoji: '♒', start: [1, 20], end: [2, 18] },
      { sign: 'Pisces ♓', name: 'Pisces', emoji: '♓', start: [2, 19], end: [3, 20] },
      { sign: 'Aries ♈', name: 'Aries', emoji: '♈', start: [3, 21], end: [4, 19] },
      { sign: 'Taurus ♉', name: 'Taurus', emoji: '♉', start: [4, 20], end: [5, 20] },
      { sign: 'Gemini ♊', name: 'Gemini', emoji: '♊', start: [5, 21], end: [6, 20] },
      { sign: 'Cancer ♋', name: 'Cancer', emoji: '♋', start: [6, 21], end: [7, 22] },
      { sign: 'Leo ♌', name: 'Leo', emoji: '♌', start: [7, 23], end: [8, 22] },
      { sign: 'Virgo ♍', name: 'Virgo', emoji: '♍', start: [8, 23], end: [9, 22] },
      { sign: 'Libra ♎', name: 'Libra', emoji: '♎', start: [9, 23], end: [10, 22] },
      { sign: 'Scorpio ♏', name: 'Scorpio', emoji: '♏', start: [10, 23], end: [11, 21] },
      { sign: 'Sagittarius ♐', name: 'Sagittarius', emoji: '♐', start: [11, 22], end: [12, 21] },
    ];

    for (const zodiac of zodiacSigns) {
      const [startMonth, startDay] = zodiac.start;
      const [endMonth, endDay] = zodiac.end;

      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return { display: zodiac.sign, name: zodiac.name };
      }
    }

    return null;
  };

  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  };

  const zodiacData = user?.created_at ? getZodiacSign(user.created_at) : null;
  const userTimezone = getUserTimezone();
  const { horoscope, loading: horoscopeLoading } = useHoroscope(zodiacData?.name, userTimezone);

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
            className={`fixed top-0 right-0 bottom-0 w-[22rem] max-w-[85vw] z-50 overflow-y-auto ${
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
                <h3 className="text-xs font-bold text-text-secondary tracking-wider mb-3 px-1">
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
                  <button
                    onClick={() => handleNavigation('/account')}
                    className={`w-full p-4 rounded-2xl border-[3px] transition-all text-left ${
                      highContrast
                        ? 'bg-hc-surface border-hc-border hover:bg-hc-primary shadow-[3px_3px_0px_rgba(0,0,0,1)]'
                        : 'bg-white dark:bg-bg-surface border-border-main shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(0,0,0,0.5)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    {/* Profile Header */}
                    <div className="flex items-center gap-3">
                      {/* Profile Picture */}
                      <div
                        className={`w-12 h-12 rounded-xl border-[3px] flex items-center justify-center flex-shrink-0 overflow-hidden ${
                          highContrast
                            ? 'bg-hc-primary border-hc-border'
                            : 'bg-accent-blue dark:bg-accent-pink border-border-main'
                        }`}
                      >
                        {profileLoading && !userAvatar && !username ? (
                          /* Loading skeleton */
                          <div className="w-full h-full bg-white/20 animate-pulse" />
                        ) : userAvatar ? (
                          /* User's selected avatar */
                          <img
                            src={userAvatar}
                            alt={username || 'User'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to default profile image on error
                              e.target.onerror = null;
                              e.target.src = '/images/avatars/default-profile.png';
                            }}
                          />
                        ) : username ? (
                          /* Username initial as fallback */
                          <span className="text-xl font-bold text-white">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        ) : (
                          /* Default profile image as final fallback */
                          <img
                            src="/images/avatars/default-profile.png"
                            alt="Default profile"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Greeting */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary">Hey</p>
                        <p className="text-base font-bold text-text-primary truncate">
                          {profileLoading && !username ? (
                            /* Loading skeleton for username */
                            <span className="inline-block h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded animate-pulse" />
                          ) : (
                            <>{username || 'Player'}!</>
                          )}
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
                    </div>

                    {/* Daily Horoscope - Integrated in same box */}
                    {zodiacData && horoscope && !horoscopeLoading && (
                      <div
                        className={`mt-3 pt-3 border-t-2 ${
                          highContrast
                            ? 'border-hc-border'
                            : 'border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold mb-2 ${
                            highContrast ? 'text-hc-text' : 'text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          Today's Tandem Horoscope:
                        </p>
                        <p
                          className={`text-xs leading-relaxed ${
                            highContrast ? 'text-hc-text' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {horoscope.text}
                        </p>
                      </div>
                    )}
                  </button>
                )}
              </section>

              {/* Navigation Section */}
              <section>
                <div className="space-y-2">
                  {/* Stats/Leaderboard Link - Always visible */}
                  <MenuButton
                    icon={getIconPath('leaderboard')}
                    label="Stats & Leaderboard"
                    onClick={() => handleModalOpen(onOpenStats)}
                    highContrast={highContrast}
                  />
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
                  <MenuButton
                    icon={getIconPath('feedback')}
                    label="Feedback"
                    onClick={() => handleModalOpen(onOpenFeedback)}
                    highContrast={highContrast}
                  />
                </div>
              </section>

              {/* Word Puzzles Section */}
              <section>
                <h3 className="text-xs font-bold text-text-secondary tracking-wider mb-3 px-1">
                  Word Puzzles
                </h3>
                <div className="space-y-2">
                  <GameButton
                    icon="/icons/ui/tandem.png"
                    label="Daily Tandem"
                    onClick={() => handleNavigation('/')}
                    isActive={pathname === '/'}
                    gameColor="blue"
                    highContrast={highContrast}
                  />
                  <GameButton
                    icon="/icons/ui/mini.png"
                    label="Daily Mini"
                    onClick={() => handleNavigation('/dailymini')}
                    isActive={pathname === '/dailymini'}
                    gameColor="yellow"
                    highContrast={highContrast}
                  />
                </div>
              </section>

              {/* Other Games Section */}
              <section>
                <h3 className="text-xs font-bold text-text-secondary tracking-wider mb-3 px-1">
                  Other Games
                </h3>
                <div className="space-y-2">
                  <GameButton
                    icon="/icons/ui/movie.png"
                    label="Reel Connections"
                    onClick={() => handleNavigation('/reel-connections')}
                    isActive={pathname === '/reel-connections'}
                    gameColor="red"
                    highContrast={highContrast}
                    badge="BETA"
                    subtitle="Create four groups of four movies"
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
                <FooterLink label="Terms of Service" onClick={() => handleNavigation('/terms')} />
              </section>

              {/* Copyright and Social Section */}
              <section className="pt-4">
                <div className="text-center">
                  <p className="text-xs text-text-secondary mb-2">© 2025 Good Vibes Games</p>

                  {/* Social Media Section */}
                  <div>
                    <p className="text-xs text-text-secondary text-center mb-2">
                      Connect with us and watch daily puzzle breakdown videos
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={async () => {
                          lightTap();
                          if (Capacitor.isNativePlatform()) {
                            await Browser.open({ url: 'https://www.tiktok.com/@tandem.daily' });
                          } else {
                            window.open('https://www.tiktok.com/@tandem.daily', '_blank');
                          }
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-border-main bg-bg-surface text-text-secondary hover:text-text-primary transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                        aria-label="Follow us on TikTok"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          lightTap();
                          if (Capacitor.isNativePlatform()) {
                            await Browser.open({ url: 'https://instagram.com/tandem.daily' });
                          } else {
                            window.open('https://instagram.com/tandem.daily', '_blank');
                          }
                        }}
                        className="w-10 h-10 rounded-full flex items-center justify-center border-[3px] border-border-main bg-bg-surface text-text-secondary hover:text-pink-500 dark:hover:text-pink-400 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
                        aria-label="Follow us on Instagram"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
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

/**
 * GameButton - Game selection button with active state and custom colors
 */
function GameButton({ icon, label, onClick, isActive, gameColor, highContrast, badge, subtitle }) {
  const iconSrc = icon;

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
    } else if (gameColor === 'yellow') {
      return {
        bg: '#ffce00', // Yellow (Mini color)
        text: 'text-gray-900',
      };
    } else if (gameColor === 'red') {
      return {
        bg: '#ef4444', // Red-500 (Reel Connections color)
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
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2">
          <span
            className={`text-base font-bold whitespace-nowrap ${!highContrast ? colors.text : 'text-text-primary'}`}
          >
            {label}
          </span>
          {badge && (
            <span className="px-1.5 py-0.5 bg-[#ffce00] text-[#0f0f1e] text-[10px] font-black uppercase tracking-wider rounded shadow-sm transform -rotate-2">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <span
            className={`text-[10px] ${!highContrast ? colors.text : 'text-text-secondary'} opacity-90`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
}
