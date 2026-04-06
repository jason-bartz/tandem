'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import adminService from '@/services/admin.service';
import UserDetailPanel from './UserDetailPanel';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';

function AuthProviderIcon({ provider }) {
  const size = 14;
  switch (provider) {
    case 'google':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" title="Google">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      );
    case 'apple':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" title="Apple">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
      );
    case 'discord':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2" title="Discord">
          <path d="M20.32 4.37a19.8 19.8 0 00-4.93-1.51.07.07 0 00-.08.04c-.21.38-.45.87-.61 1.25a18.27 18.27 0 00-5.4 0 12.6 12.6 0 00-.62-1.25.08.08 0 00-.08-.04 19.74 19.74 0 00-4.93 1.51.07.07 0 00-.03.03C1.11 8.39.34 12.27.82 16.09a.08.08 0 00.03.06 19.9 19.9 0 005.99 3.03.08.08 0 00.08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 00-.04-.11 13.1 13.1 0 01-1.87-.9.08.08 0 01-.01-.13c.13-.09.25-.19.37-.29a.08.08 0 01.08-.01c3.93 1.79 8.18 1.79 12.07 0a.08.08 0 01.08.01c.12.1.25.2.37.29a.08.08 0 01-.01.13c-.6.35-1.22.65-1.87.9a.08.08 0 00-.04.11c.36.7.77 1.37 1.22 2a.08.08 0 00.08.03 19.83 19.83 0 006-3.03.08.08 0 00.03-.05c.56-4.42-.82-8.26-3.56-11.66a.06.06 0 00-.03-.03zM8.02 13.83c-1.01 0-1.84-.93-1.84-2.07s.81-2.07 1.84-2.07c1.04 0 1.86.94 1.84 2.07 0 1.14-.81 2.07-1.84 2.07zm6.97 0c-1.01 0-1.84-.93-1.84-2.07s.81-2.07 1.84-2.07c1.04 0 1.86.94 1.84 2.07 0 1.14-.8 2.07-1.84 2.07z" />
        </svg>
      );
    case 'anonymous':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-muted"
          title="Anonymous"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    default:
      // Email/password
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-secondary"
          title="Email"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 7L2 7" />
        </svg>
      );
  }
}

const GAME_ICONS = {
  tandem: { src: '/ui/games/tandem.png', alt: 'Tandem' },
  mini: { src: '/ui/games/mini.png', alt: 'Mini' },
  reel: { src: '/ui/games/movie.png', alt: 'Reel' },
  soup: { src: `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`, alt: 'Alchemy' },
};

function formatTimestamp(value) {
  try {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return value || '--';
  }
}

function PlatformBadge({ platform }) {
  if (!platform) return <span className="text-text-muted text-xs">--</span>;
  if (platform === 'ios') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary bg-bg-surface rounded-full px-2 py-0.5">
        <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        iOS
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary bg-bg-surface rounded-full px-2 py-0.5">
      <svg
        width={12}
        height={12}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
      Web
    </span>
  );
}

function MetricCard({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-bg-surface rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>
        {value !== null && value !== undefined ? value.toLocaleString() : '--'}
      </div>
      <div className="text-xs font-semibold text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 skeleton-shimmer">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 h-16" />
        ))}
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-12" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-14" />
        ))}
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Newest First' },
  { value: 'created_asc', label: 'Oldest First' },
  { value: 'last_sign_in_desc', label: 'Recently Active' },
  { value: 'last_sign_in_asc', label: 'Least Active' },
  { value: 'username_asc', label: 'Username A-Z' },
  { value: 'username_desc', label: 'Username Z-A' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'registered', label: 'Registered' },
  { value: 'anonymous', label: 'Anonymous' },
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, perPage: 25, total: 0, totalPages: 0 });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('created_desc');

  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedUserData, setExpandedUserData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const searchTimerRef = useRef(null);

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // Load users when filters change
  const loadUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const data = await adminService.getUsers({
          search: debouncedSearch,
          type: typeFilter,
          sort: sortOrder,
          page,
          perPage: 25,
        });

        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, perPage: 25, total: 0, totalPages: 0 });
        setMetrics(data.metrics || null);
      } catch (err) {
        logger.error('Failed to load users', err);
        setError(err.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, typeFilter, sortOrder]
  );

  useEffect(() => {
    loadUsers(1);
    setExpandedUserId(null);
    setExpandedUserData(null);
  }, [loadUsers]);

  // Load user detail when expanding
  const handleExpandUser = useCallback(
    async (userId) => {
      if (expandedUserId === userId) {
        setExpandedUserId(null);
        setExpandedUserData(null);
        return;
      }

      setExpandedUserId(userId);
      setExpandedUserData(null);
      setDetailLoading(true);

      try {
        const data = await adminService.getUserDetail(userId);
        setExpandedUserData(data.user);
      } catch (err) {
        logger.error('Failed to load user detail', err);
        setExpandedUserData(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [expandedUserId]
  );

  const handlePageChange = useCallback(
    (newPage) => {
      setExpandedUserId(null);
      setExpandedUserData(null);
      loadUsers(newPage);
    },
    [loadUsers]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await adminService.exportUsersCsv();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch ? filenameMatch[1] : 'tandem-users.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('Export failed', err);
      setError(err.message || 'Failed to export users');
    } finally {
      setExporting(false);
    }
  }, []);

  const pageNumbers = useMemo(() => {
    const pages = [];
    const { page, totalPages } = pagination;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [pagination]);

  if (loading && users.length === 0) {
    return (
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 sm:px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">Users</h2>
        </div>
        <div className="p-4 sm:p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-lg">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Users</h2>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 bg-bg-surface rounded-md font-semibold text-xs text-text-secondary hover:bg-muted transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {exporting ? (
              <>
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Metrics Bar */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard label="Total Users" value={metrics.totalUsers} />
            <MetricCard label="New Today" value={metrics.newToday} color="text-accent-green" />
            <MetricCard
              label="New This Week"
              value={metrics.newThisWeek}
              color="text-accent-blue"
            />
            <MetricCard
              label="Countries"
              value={metrics.uniqueCountries}
              color="text-accent-yellow"
            />
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username, email, or user ID..."
              className="w-full px-4 py-2.5 bg-bg-surface rounded-md text-text-primary font-medium text-sm placeholder:text-text-muted focus:outline-none focus:bg-bg-card focus:border-2 focus:border-primary transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 bg-bg-surface rounded-md text-text-primary font-semibold text-sm cursor-pointer focus:outline-none focus:border-2 focus:border-primary"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2.5 bg-bg-surface rounded-md text-text-primary font-semibold text-sm cursor-pointer focus:outline-none focus:border-2 focus:border-primary"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-accent-red/20 rounded-md p-3">
            <p className="text-accent-red font-bold text-sm">{error}</p>
          </div>
        )}

        {/* User Table */}
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card">
                <th className="text-left px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden sm:table-cell">
                  Email
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden sm:table-cell w-10">
                  Auth
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden md:table-cell">
                  Games
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden md:table-cell">
                  Platform
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden lg:table-cell">
                  Country
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider hidden lg:table-cell">
                  Created
                </th>
                <th className="text-center px-3 py-2.5 font-semibold text-text-secondary text-xs uppercase tracking-wider w-10">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-text-muted font-medium">
                    {debouncedSearch
                      ? `No users found matching "${debouncedSearch}"`
                      : 'No users found'}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <Fragment key={user.id}>
                    <tr
                      onClick={() => handleExpandUser(user.id)}
                      className={`cursor-pointer transition-all duration-200 hover:bg-bg-card ${
                        expandedUserId === user.id ? 'bg-bg-card' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div>
                          <div className="font-bold text-text-primary">
                            {user.username || (
                              <span className="text-text-muted italic">No username</span>
                            )}
                          </div>
                          <div className="text-xs text-text-muted sm:hidden">
                            {user.email || '--'}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="text-text-primary font-mono text-xs">
                          {user.email || '--'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden sm:table-cell">
                        <div className="flex items-center justify-center">
                          <AuthProviderIcon provider={user.provider} />
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {user.activeGames && user.activeGames.length > 0 ? (
                            user.activeGames.map((game) => {
                              const icon = GAME_ICONS[game];
                              return icon ? (
                                <Image
                                  key={game}
                                  src={icon.src}
                                  alt={icon.alt}
                                  width={16}
                                  height={16}
                                  title={icon.alt}
                                />
                              ) : null;
                            })
                          ) : (
                            <span className="text-text-muted text-xs">--</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <PlatformBadge platform={user.platform} />
                      </td>
                      <td className="px-3 py-3 text-center hidden lg:table-cell">
                        {user.countryFlag ? (
                          <span title={user.countryCode || ''} className="text-base">
                            {user.countryFlag}
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">--</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-text-secondary text-xs hidden lg:table-cell">
                        {formatTimestamp(user.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <svg
                          className={`w-4 h-4 text-text-muted transition-transform duration-200 inline-block ${
                            expandedUserId === user.id ? 'rotate-180' : ''
                          }`}
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
                      </td>
                    </tr>
                    {expandedUserId === user.id &&
                      (detailLoading ? (
                        <tr key={`${user.id}-detail`}>
                          <td colSpan="8" className="p-0">
                            <div className="bg-bg-card p-8 text-center">
                              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              <p className="text-sm text-text-secondary mt-2 font-medium">
                                Loading user details...
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : expandedUserData ? (
                        <UserDetailPanel
                          key={`${user.id}-detail`}
                          user={expandedUserData}
                          onClose={() => {
                            setExpandedUserId(null);
                            setExpandedUserData(null);
                          }}
                        />
                      ) : (
                        <tr key={`${user.id}-detail`}>
                          <td colSpan="8" className="p-0">
                            <div className="bg-bg-card p-6 text-center">
                              <p className="text-sm text-accent-red font-bold">
                                Failed to load user details
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Loading overlay for page changes */}
        {loading && users.length > 0 && (
          <div className="text-center py-2">
            <div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-secondary font-medium">
              Showing {(pagination.page - 1) * pagination.perPage + 1}–
              {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
              {pagination.total.toLocaleString()} users
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-2.5 py-1.5 rounded-md font-semibold text-xs text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Prev
              </button>

              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`px-2.5 py-1.5 rounded-md font-semibold text-xs transition-all duration-200 ${
                    num === pagination.page
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:bg-bg-card'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1.5 rounded-md font-semibold text-xs text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
