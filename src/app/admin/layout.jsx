'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import authService from '@/services/auth.service';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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
  if (loading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-white">
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
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-lg border-b border-gray-200">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-teal-400 bg-clip-text text-transparent">
                Tandem Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                View Game
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 min-h-[600px] w-full max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
