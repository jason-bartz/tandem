'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import authService from '@/services/auth.service';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import storageService from '@/core/storage/storageService';
import logger from '@/lib/logger';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Special pages that don't need authentication
  const isPublicPage =
    pathname === '/admin/login' || pathname === '/admin/debug' || pathname === '/admin/test';

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    checkAuth();
  }, [pathname, isPublicPage]);

  useEffect(() => {
    const originalValues = new Map();

    // Swap favicons to admin variants
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

    // Swap manifest to admin-specific manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      originalValues.set(manifestLink, manifestLink.href);
      manifestLink.href = '/admin.webmanifest';
    }

    // Swap apple-mobile-web-app-title
    const appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appTitleMeta) {
      originalValues.set(appTitleMeta, appTitleMeta.content);
      appTitleMeta.content = 'Tandem Admin';
    }

    // Cleanup: restore originals when leaving admin
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

  const checkAuth = async () => {
    try {
      // Use storageService to support fallback storage (IndexedDB, memory)
      const token = await storageService.get('adminToken');
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

  // For public pages, render directly without auth wrapper
  if (isPublicPage) {
    return children;
  }

  if (loading) {
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
    <div className="admin-theme min-h-screen bg-white">
      <nav className="bg-bg-surface border-b-[1.5px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1"></div>
            <div className="flex items-center justify-center">
              <Image src="/branding/admin-logo.png" alt="Tandem Admin" width={120} height={40} />
            </div>
            <div className="flex-1 flex items-center justify-end space-x-3 sm:space-x-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-block px-3 py-1 text-sm border-[2px] border-black dark:border-white bg-accent-blue text-white rounded-lg font-bold hover:translate-y-[-1px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.3)]"
              >
                View Game
              </a>
              <button
                onClick={async () => {
                  await storageService.remove('adminToken');
                  router.push('/admin/login');
                }}
                className="px-3 py-1 text-sm border-[2px] border-black dark:border-white bg-accent-red text-white rounded-lg font-bold hover:translate-y-[-1px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.3)]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-6 min-h-[600px] w-full max-w-7xl mx-auto overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
}
