'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import authService from '@/services/auth.service';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage =
    pathname === '/admin/login' ||
    pathname === '/admin/debug' ||
    pathname === '/admin/test' ||
    pathname === '/admin/forgot-password' ||
    pathname === '/admin/reset-password';

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isPublicPage]);

  useEffect(() => {
    const originalValues = new Map();

    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    faviconLinks.forEach((link) => {
      originalValues.set(link, link.href);

      if (link.rel === 'apple-touch-icon') {
        link.href = '/favicons/admin/apple-touch-icon.png';
      } else if (link.rel === 'icon' || link.rel === 'shortcut icon') {
        if (link.sizes === '16x16' || link.getAttribute('sizes') === '16x16') {
          link.href = '/favicons/admin/favicon-16x16.png';
        } else if (link.sizes === '32x32' || link.getAttribute('sizes') === '32x32') {
          link.href = '/favicons/admin/favicon-32x32.png';
        } else {
          link.href = '/favicons/admin/favicon-32x32.png';
        }
      }
    });

    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      originalValues.set(manifestLink, manifestLink.href);
      manifestLink.href = '/admin.webmanifest';
    }

    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta) {
      originalValues.set(appTitleMeta, appTitleMeta.content);
      appTitleMeta.content = 'Tandem Admin';
    }

    return () => {
      faviconLinks.forEach((link) => {
        const original = originalValues.get(link);
        if (original) link.href = original;
      });
      if (manifestLink && originalValues.has(manifestLink)) {
        manifestLink.href = originalValues.get(manifestLink);
      }
      if (appTitleMeta && originalValues.has(appTitleMeta)) {
        appTitleMeta.content = originalValues.get(appTitleMeta);
      }
    };
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = () => setShowUserMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showUserMenu]);

  const checkAuth = async () => {
    try {
      const token = await storageService.get('adminToken');
      if (!token) {
        router.push('/admin/login');
        setLoading(false);
        return;
      }

      const isValid = await authService.verifyToken(token);
      if (isValid) {
        const csrfToken = authService.getCSRFToken();
        if (!csrfToken) {
          logger.warn('CSRF token not set after verification', null);
        }
        setIsAuthenticated(true);
      } else {
        await storageService.remove('adminToken');
        router.push('/admin/login');
      }
    } catch (error) {
      logger.error('Auth check failed', error);
      await storageService.remove('adminToken');
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(async () => {
    await authService.logout();
    router.push('/admin/login');
  }, [router]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    if (!currentUser) return '';
    if (currentUser.fullName && currentUser.fullName !== currentUser.username) {
      return currentUser.fullName.split(' ')[0];
    }
    return currentUser.username;
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-accent-purple text-white';
      case 'admin':
        return 'bg-accent-blue text-white';
      case 'editor':
        return 'bg-accent-green text-white';
      default:
        return 'bg-bg-surface text-text-secondary';
    }
  };

  if (isPublicPage) {
    return children;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-surface">
        <LoadingSpinner size="large" text="Loading admin..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="admin-theme min-h-screen bg-ghost-white">
      <nav className="bg-bg-surface border-b border-border-light">
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left: Greeting */}
            <div className="flex-1 min-w-0">
              {currentUser && (
                <p className="text-xs sm:text-sm font-semibold text-text-secondary truncate">
                  {getGreeting()}, <span className="text-text-primary">{getDisplayName()}</span>
                </p>
              )}
            </div>

            {/* Center: Logo */}
            <div className="flex items-center justify-center px-2 sm:px-4">
              <Image src="/branding/admin-logo.png" alt="Tandem Admin" width={120} height={40} className="w-[90px] sm:w-[120px] h-auto" />
            </div>

            {/* Right: Actions + User Menu */}
            <div className="flex-1 flex items-center justify-end space-x-3 sm:space-x-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block px-3 py-1.5 text-sm bg-primary text-white rounded-md font-semibold hover:bg-primary-hover hover:scale-105 transition-all duration-200"
              >
                View Game
              </a>

              {/* User menu button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold bg-bg-card hover:bg-bg-surface transition-all duration-200"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-accent-blue/20 flex items-center justify-center">
                    {currentUser?.avatar?.image_path ? (
                      <Image
                        src={currentUser.avatar.image_path}
                        alt="Avatar"
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-accent-blue">
                        {getDisplayName().charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-text-primary">{getDisplayName()}</span>
                  <svg
                    className="w-3.5 h-3.5 text-text-muted"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-bg-card rounded-lg overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-border-light">
                      <p className="text-sm font-bold text-text-primary truncate">
                        {currentUser?.fullName || currentUser?.username}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {currentUser?.email || 'No email set'}
                      </p>
                      {currentUser?.role && (
                        <span
                          className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getRoleBadgeColor(currentUser.role)}`}
                        >
                          {currentUser.role}
                        </span>
                      )}
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          // Dispatch event to open profile modal from dashboard
                          window.dispatchEvent(new CustomEvent('open-admin-profile'));
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-bg-surface transition-colors"
                      >
                        Profile & Settings
                      </button>
                    </div>
                    <div className="py-1 border-t border-border-light">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-accent-red font-semibold hover:bg-accent-red/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-2 px-2 sm:py-6 sm:px-6 lg:px-8">
        <div className="p-1 sm:p-6 min-h-[600px] w-full max-w-7xl mx-auto overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
}
