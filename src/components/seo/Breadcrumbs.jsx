'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Don't show breadcrumbs on home page
  if (pathname === '/') return null;

  // Build breadcrumb trail from pathname
  const pathSegments = pathname.split('/').filter((segment) => segment);

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    ...pathSegments.map((segment, index) => {
      const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
      // Convert slug to readable name
      const name = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { name, path };
    }),
  ];

  return (
    <nav aria-label="Breadcrumb" className="container mx-auto px-4 py-4 max-w-4xl">
      <ol className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={crumb.path} className="flex items-center gap-2">
              {!isLast ? (
                <>
                  <Link
                    href={crumb.path}
                    className="hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
                  >
                    {crumb.name}
                  </Link>
                  <span className="text-gray-400 dark:text-gray-600">/</span>
                </>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-gray-100">{crumb.name}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
