'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import authService from '@/services/auth.service';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toggleTheme, isDark, mounted } = useTheme();

  // Special pages that don't need authentication
  const isPublicPage =
    pathname === '/admin/login' || pathname === '/admin/debug' || pathname === '/admin/test';

  useEffect(() => {
    // Skip auth check for public pages
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    checkAuth();
  }, [pathname, isPublicPage]);

  // Set admin-specific favicon
  useEffect(() => {
    // Find and update all favicon links
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    const originalFavicons = new Map();

    faviconLinks.forEach((link) => {
      // Save original href
      originalFavicons.set(link, link.href);

      // Update to admin favicon
      if (link.rel === 'icon' || link.rel === 'shortcut icon') {
        if (link.sizes === '16x16' || link.getAttribute('sizes') === '16x16') {
          link.href = '/icons/admin-favicon-16x16.png';
        } else if (link.sizes === '32x32' || link.getAttribute('sizes') === '32x32') {
          link.href = '/icons/admin-favicon-32x32.png';
        } else {
          // Default icon (no size specified)
          link.href = '/icons/admin-favicon-32x32.png';
        }
      }
    });

    // Cleanup: restore original favicons when leaving admin
    return () => {
      faviconLinks.forEach((link) => {
        const originalHref = originalFavicons.get(link);
        if (originalHref) {
          link.href = originalHref;
        }
      });
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        setLoading(false);
        return;
      }

      // Verify token and ensure CSRF token is fetched
      const isValid = await authService.verifyToken(token);
      if (isValid) {
        // Verify that CSRF token was set
        const csrfToken = authService.getCSRFToken();
        if (!csrfToken) {
          console.warn('CSRF token not set after verification');
        }
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  // For public pages, render directly without auth wrapper
  if (isPublicPage) {
    return children;
  }

  // Show loading spinner while checking auth
  if (loading || !mounted) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-bg-surface">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirecting to login)
  if (!isAuthenticated) {
    return null;
  }

  // Render authenticated admin layout
  return (
    <div className="admin-theme min-h-screen bg-accent-yellow">
      <nav className="bg-bg-surface border-b-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1"></div>
            <div className="flex items-center justify-center">
              <Image src="/icons/admin-logo.png" alt="Tandem Admin" width={120} height={40} />
            </div>
            <div className="flex-1 flex items-center justify-end space-x-3 sm:space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border-[3px] border-black dark:border-white bg-bg-card hover:translate-y-[-2px] transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Image
                  src={isDark ? '/icons/ui/light-mode.png' : '/icons/ui/dark-mode.png'}
                  alt={isDark ? 'Light mode' : 'Dark mode'}
                  width={24}
                  height={24}
                />
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block px-4 py-2 border-[3px] border-black dark:border-white bg-accent-blue text-white rounded-xl font-bold hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
              >
                View Game
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 border-[3px] border-black dark:border-white bg-accent-red text-white rounded-xl font-bold hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="bg-bg-card rounded-[32px] border-[3px] border-black dark:border-white p-4 sm:p-6 min-h-[600px] w-full max-w-7xl mx-auto shadow-[6px_6px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_rgba(255,255,255,0.3)]">
          {children}
        </div>
      </main>
    </div>
  );
}
