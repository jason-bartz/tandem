'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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

      const isValid = await authService.verifyToken(token);
      if (isValid) {
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
    <div className="admin-theme min-h-screen bg-bg-primary">
      <nav
        className="bg-bg-surface border-b-[3px] border-border-main"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1"></div>
            <div className="flex items-center justify-center">
              <img src="/icons/tandem-admin-logo.png" alt="Tandem Admin" className="h-10" />
            </div>
            <div className="flex-1 flex items-center justify-end space-x-3 sm:space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg border-[2px] border-border-main bg-bg-card hover:bg-accent-yellow/20 transition-colors"
                style={{ boxShadow: 'var(--shadow-small)' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block px-4 py-2 border-[2px] border-border-main bg-accent-blue/90 text-white rounded-lg font-bold hover:bg-accent-blue hover:translate-y-[-1px] transition-all"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                View Game
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 border-[2px] border-border-main bg-gradient-to-r from-accent-red/90 to-accent-pink/90 text-white rounded-lg font-bold hover:from-accent-red hover:to-accent-pink hover:translate-y-[-1px] transition-all"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div
          className="bg-bg-card rounded-2xl border-[2px] border-border-main p-4 sm:p-6 min-h-[600px] w-full max-w-7xl mx-auto"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
