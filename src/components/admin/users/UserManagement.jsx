'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import adminService from '@/services/admin.service';
import UserDetailPanel from './UserDetailPanel';
import logger from '@/lib/logger';

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

function MetricCard({ label, value, color = 'text-text-primary' }) {
  return (
    <div className="bg-bg-surface rounded-lg border-[2px] border-border-main p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>
        {value !== null && value !== undefined ? value.toLocaleString() : '--'}
      </div>
      <div className="text-xs font-semibold text-text-secondary mt-0.5">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-card rounded-lg border-[2px] border-border-main p-3 h-16" />
        ))}
      </div>
      <div className="bg-bg-card rounded-lg border-[2px] border-border-main h-12" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-bg-card rounded-lg border-[2px] border-border-main h-14" />
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
      <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black dark:border-white">
          <h3 className="text-base sm:text-lg font-bold text-text-primary">User Management</h3>
        </div>
        <div className="p-3 sm:p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black dark:border-white">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-bold text-text-primary">User Management</h3>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-1.5 bg-bg-card border-[2px] border-border-main rounded-lg font-bold text-xs text-text-secondary hover:bg-bg-surface hover:border-black dark:hover:border-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {exporting ? (
              <>
                <div className="w-3 h-3 border-[2px] border-orange-500 border-t-transparent rounded-full animate-spin" />
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

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Metrics Bar */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard label="Total Users" value={metrics.totalUsers} />
            <MetricCard label="New Today" value={metrics.newToday} color="text-accent-green" />
            <MetricCard
              label="New This Week"
              value={metrics.newThisWeek}
              color="text-accent-blue"
            />
            <MetricCard
              label="Subscribers"
              value={metrics.activeSubscriptions}
              color="text-accent-purple"
            />
            <MetricCard
              label="In Users Table"
              value={pagination.total}
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
              className="w-full px-4 py-2.5 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium text-sm placeholder:text-text-muted focus:outline-none focus:border-orange-500 transition-colors"
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
            className="px-3 py-2.5 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-bold text-sm cursor-pointer focus:outline-none focus:border-orange-500"
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
            className="px-3 py-2.5 border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-bold text-sm cursor-pointer focus:outline-none focus:border-orange-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-accent-red/20 border-[3px] border-accent-red rounded-lg p-3">
            <p className="text-accent-red font-bold text-sm">{error}</p>
          </div>
        )}

        {/* User Table */}
        <div className="overflow-x-auto rounded-lg border-[3px] border-black dark:border-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card border-b-[3px] border-black dark:border-white">
                <th className="text-left px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide">
                  User
                </th>
                <th className="text-left px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide hidden sm:table-cell">
                  Email
                </th>
                <th className="text-center px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide hidden md:table-cell">
                  Type
                </th>
                <th className="text-center px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide hidden md:table-cell">
                  Sub
                </th>
                <th className="text-left px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide hidden lg:table-cell">
                  Created
                </th>
                <th className="text-left px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide hidden lg:table-cell">
                  Last Active
                </th>
                <th className="text-center px-3 py-2.5 font-bold text-text-secondary text-xs uppercase tracking-wide w-10">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-text-muted font-medium">
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
                      className={`cursor-pointer transition-colors hover:bg-bg-card/80 ${
                        expandedUserId === user.id ? 'bg-bg-card' : ''
                      }`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {user.countryFlag && (
                            <span className="text-base">{user.countryFlag}</span>
                          )}
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
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className="text-text-primary font-mono text-xs">
                          {user.email || '--'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border-[2px] ${
                            user.isAnonymous
                              ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-text-secondary'
                              : 'bg-accent-green/20 border-accent-green text-accent-green'
                          }`}
                        >
                          {user.isAnonymous ? 'Anon' : 'Reg'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center hidden md:table-cell">
                        {user.hasSubscription && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border-[2px] bg-accent-purple/20 border-accent-purple text-accent-purple">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-text-secondary text-xs hidden lg:table-cell">
                        {formatTimestamp(user.createdAt)}
                      </td>
                      <td className="px-3 py-3 text-text-secondary text-xs hidden lg:table-cell">
                        {user.lastSignInAt ? formatTimestamp(user.lastSignInAt) : '--'}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <svg
                          className={`w-4 h-4 text-text-muted transition-transform inline-block ${
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
                          <td colSpan="7" className="p-0">
                            <div className="border-t-[3px] border-black dark:border-white bg-bg-card p-8 text-center">
                              <div className="inline-block w-6 h-6 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
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
                          <td colSpan="7" className="p-0">
                            <div className="border-t-[3px] border-black dark:border-white bg-bg-card p-6 text-center">
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
            <div className="inline-block w-5 h-5 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
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
                className="px-2.5 py-1.5 border-[2px] border-border-main rounded-lg font-bold text-xs text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>

              {pageNumbers.map((num) => (
                <button
                  key={num}
                  onClick={() => handlePageChange(num)}
                  className={`px-2.5 py-1.5 border-[2px] rounded-lg font-bold text-xs transition-colors ${
                    num === pagination.page
                      ? 'border-orange-500 bg-orange-500/20 text-text-primary'
                      : 'border-border-main text-text-secondary hover:bg-bg-card'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-2.5 py-1.5 border-[2px] border-border-main rounded-lg font-bold text-xs text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
