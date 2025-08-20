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
  const isPublicPage = pathname === '/admin/login' || 
                       pathname === '/admin/debug' || 
                       pathname === '/admin/test';

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
      <div 
        className="fixed inset-0 w-full h-full flex items-center justify-center"
        style={{ 
          backgroundImage: "url('/images/light-mode-bg.webp')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Tandem Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                View Game
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  router.push('/admin/login');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}