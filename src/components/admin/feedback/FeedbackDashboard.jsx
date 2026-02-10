'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import adminService from '@/services/admin.service';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS, FEEDBACK_STATUS_OPTIONS } from '@/lib/constants';
import FeedbackDashboardSkeleton from '@/components/shared/FeedbackDashboardSkeleton';
import logger from '@/lib/logger';

const categoryLookup = FEEDBACK_CATEGORIES.reduce((acc, category) => {
  acc[category.value] = category;
  return acc;
}, {});

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
    return value;
  }
}

export default function FeedbackDashboard({ onCountsChange }) {
  const [feedback, setFeedback] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(FEEDBACK_STATUS.NEW);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [updatingId, setUpdatingId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    loadFeedback(statusFilter);
  }, [statusFilter]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFeedback = useMemo(() => {
    const filtered =
      categoryFilter === 'all'
        ? feedback
        : feedback.filter((entry) => entry.category === categoryFilter);

    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return sorted;
  }, [feedback, categoryFilter, sortOrder]);

  const hasFeedback = filteredFeedback.length > 0;

  const summary = useMemo(() => {
    if (!counts) {
      return null;
    }
    return FEEDBACK_STATUS_OPTIONS.map((option) => ({
      ...option,
      count: counts?.[option.value] || 0,
    }));
  }, [counts]);

  const activeFilterCount =
    (categoryFilter !== 'all' ? 1 : 0) + (statusFilter !== FEEDBACK_STATUS.NEW ? 1 : 0);

  const loadFeedback = async (status) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getFeedback({ status });

      setFeedback(data.feedback || []);
      setCounts(data.counts || null);
      if (onCountsChange) {
        onCountsChange(data.counts || null);
      }
    } catch (fetchError) {
      logger.error('[FeedbackDashboard] Error loading feedback:', fetchError);
      setError(fetchError.message || 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (entryId, newStatus) => {
    if (!newStatus) return;
    setUpdatingId(entryId);

    setFeedback((prev) => prev.filter((entry) => entry.id !== entryId));

    try {
      const data = await adminService.updateFeedback(entryId, { status: newStatus });
      setCounts(data.counts || counts);
      if (onCountsChange) {
        onCountsChange(data.counts || counts);
      }
    } catch (updateError) {
      setError(updateError.message || 'Failed to update status');
      loadFeedback(statusFilter);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCommentSubmit = async (entryId) => {
    const text = commentDrafts[entryId]?.trim();
    if (!text) return;
    setUpdatingId(`${entryId}-comment`);

    try {
      const data = await adminService.updateFeedback(entryId, { comment: text });
      updateEntryLocally(data.feedback);
      setCommentDrafts((prev) => ({ ...prev, [entryId]: '' }));
      setCounts(data.counts || counts);
    } catch (commentError) {
      setError(commentError.message || 'Failed to save comment');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateEntryLocally = (updatedEntry) => {
    if (!updatedEntry) return;
    setFeedback((prev) =>
      prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">
            Feedback Management
          </p>
          <h2 className="text-2xl font-black text-text-primary">Player Feedback</h2>
        </div>
        {summary && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Total:</span>
            <span className="text-2xl font-black text-text-primary">
              {summary.reduce((acc, item) => acc + item.count, 0)}
            </span>
          </div>
        )}
      </div>

      {/* Sort & Filter Row */}
      <div className="flex items-center justify-between gap-3 py-2 border-b-[2px] border-black/10 dark:border-white/10">
        {/* Sort Toggle */}
        <button
          onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
          className="flex items-center gap-1.5 text-sm font-bold text-text-primary hover:text-accent-blue transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
          <span>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</span>
        </button>

        {/* Filter Button */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-lg border-[2px] transition-all ${
              showFilterDropdown || activeFilterCount > 0
                ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                : 'bg-ghost-white dark:bg-gray-800 text-text-primary border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-accent-red text-white text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-white rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] z-50 overflow-hidden">
              {/* Status Section */}
              <div className="p-3 border-b-[2px] border-black/10 dark:border-white/10">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FEEDBACK_STATUS_OPTIONS.map((option) => {
                    const isActive = statusFilter === option.value;
                    const count = counts?.[option.value] || 0;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-black dark:bg-white text-white dark:text-black'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {option.label}
                        <span
                          className={`ml-1 ${isActive ? 'text-white/60 dark:text-black/60' : 'text-gray-400 dark:text-gray-500'}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type Section */}
              <div className="p-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Type
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {FEEDBACK_CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => setCategoryFilter(category.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        categoryFilter === category.value
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && <FeedbackDashboardSkeleton />}

      {error && (
        <div className="rounded-xl border-[3px] border-accent-red bg-accent-red/10 dark:bg-accent-red/20 shadow-[4px_4px_0px_rgba(239,68,68,0.4)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-accent-red mb-1">Error Loading Feedback</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !hasFeedback && (
        <div className="rounded-xl border-[3px] border-black dark:border-white bg-ghost-white dark:bg-bg-surface shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] p-12 text-center">
          <div className="max-w-md mx-auto">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
              No Feedback Found
            </p>
            <p className="text-xs text-gray-500">No items match the current filters.</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredFeedback.map((entry) => {
          const category = categoryLookup[entry.category] || { label: entry.category };
          const commentDraft = commentDrafts[entry.id] || '';
          const isStatusUpdating = updatingId === entry.id;
          const isCommentUpdating = updatingId === `${entry.id}-comment`;

          return (
            <div
              key={entry.id}
              className={`rounded-xl border-[3px] border-black dark:border-white bg-ghost-white dark:bg-bg-surface shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)] overflow-hidden`}
            >
              {/* Compact Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 bg-gray-100 dark:bg-gray-800 border-b-[3px] border-black dark:border-white">
                <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4">
                  <span className="px-2 py-1 rounded bg-ghost-white dark:bg-gray-700 border-[2px] border-black dark:border-white text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    {category.icon && (
                      <img src={category.icon} alt="" className="w-4 h-4 flex-shrink-0" />
                    )}
                    {category.label}
                  </span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {formatTimestamp(entry.createdAt)}
                  </span>
                </div>
                <select
                  value={entry.status}
                  onChange={(event) => handleStatusChange(entry.id, event.target.value)}
                  disabled={isStatusUpdating}
                  className={`w-full sm:w-auto px-3 py-1.5 rounded-lg border-[2px] border-black dark:border-white text-xs font-bold bg-ghost-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all ${
                    isStatusUpdating
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {FEEDBACK_STATUS_OPTIONS.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] divide-y-[3px] lg:divide-y-0 lg:divide-x-[3px] divide-black dark:divide-white">
                {/* User Section */}
                <div className="p-4 sm:p-5 space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                      User Details
                    </h3>
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Username
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {entry.username || 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Email
                        </span>
                        <span className="text-sm text-gray-800 dark:text-gray-200 break-all font-mono">
                          {entry.email || <span className="italic font-sans">Not provided</span>}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          User ID
                        </span>
                        <span className="text-xs text-gray-800 dark:text-gray-200 break-all font-mono">
                          {entry.userId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Contact OK:
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold border-[2px] ${
                            entry.allowContact
                              ? 'bg-accent-green/10 border-accent-green text-accent-green'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-400 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {entry.allowContact ? 'YES' : 'NO'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t-[2px] border-gray-200 dark:border-gray-700">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Message
                    </h3>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-[2px] border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {entry.message}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Admin Section */}
                <div className="p-4 sm:p-5 space-y-4 bg-gray-50/50 dark:bg-gray-900/20">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                      Internal Notes
                    </h3>

                    {/* Existing Notes */}
                    {Array.isArray(entry.comments) && entry.comments.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {entry.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-3 bg-ghost-white dark:bg-gray-800 border-[2px] border-purple-400 dark:border-purple-600 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                {comment.author}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {formatTimestamp(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {comment.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic mb-4">No notes yet</p>
                    )}

                    {/* Add Note */}
                    <div className="space-y-2">
                      <textarea
                        value={commentDraft}
                        onChange={(event) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [entry.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Add internal note..."
                        className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm bg-ghost-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => handleCommentSubmit(entry.id)}
                        disabled={!commentDraft.trim() || isCommentUpdating}
                        className={`w-full px-4 py-2 rounded-lg border-[2px] border-black dark:border-white text-sm font-bold transition-all ${
                          !commentDraft.trim() || isCommentUpdating
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700 active:translate-y-[1px]'
                        }`}
                      >
                        {isCommentUpdating ? 'Saving...' : 'Add Note'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
