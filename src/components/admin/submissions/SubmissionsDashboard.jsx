'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import adminService from '@/services/admin.service';
import { SUBMISSION_STATUS, SUBMISSION_STATUS_OPTIONS } from '@/lib/constants';
import logger from '@/lib/logger';

const DIFFICULTY_COLORS = {
  easiest: 'bg-yellow-300 text-gray-900',
  easy: 'bg-blue-400 text-gray-900',
  medium: 'bg-purple-400 text-gray-900',
  hardest: 'bg-red-500 text-white',
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
    return value;
  }
}

export default function SubmissionsDashboard({ onCountsChange, onImportToEditor }) {
  const [submissions, setSubmissions] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(SUBMISSION_STATUS.PENDING);
  const [sortOrder, setSortOrder] = useState('newest');
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [notesDrafts, setNotesDrafts] = useState({});
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    loadSubmissions(statusFilter);
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

  const filteredSubmissions = useMemo(() => {
    const sorted = [...submissions].sort((a, b) => {
      const dateA = new Date(a.submittedAt);
      const dateB = new Date(b.submittedAt);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return sorted;
  }, [submissions, sortOrder]);

  const hasSubmissions = filteredSubmissions.length > 0;

  const summary = useMemo(() => {
    if (!counts) return null;
    return SUBMISSION_STATUS_OPTIONS.map((option) => ({
      ...option,
      count: counts?.[option.value] || 0,
    }));
  }, [counts]);

  const activeFilterCount = statusFilter !== SUBMISSION_STATUS.PENDING ? 1 : 0;

  const loadSubmissions = async (status) => {
    setLoading(true);
    setError('');
    try {
      const data = await adminService.getSubmissions({ status });
      setSubmissions(data.submissions || []);
      setCounts(data.counts || null);
      if (onCountsChange) {
        onCountsChange(data.counts || null);
      }
    } catch (fetchError) {
      logger.error('[SubmissionsDashboard] Error loading submissions:', fetchError);
      setError(fetchError.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (submissionId, newStatus) => {
    if (!newStatus) return;
    setUpdatingId(submissionId);

    if (newStatus !== statusFilter) {
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    }

    try {
      const data = await adminService.updateSubmission(submissionId, { status: newStatus });
      setCounts(data.counts || counts);
      if (onCountsChange) {
        onCountsChange(data.counts || counts);
      }
    } catch (updateError) {
      setError(updateError.message || 'Failed to update status');
      loadSubmissions(statusFilter);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleNotesSubmit = async (submissionId) => {
    const notes = notesDrafts[submissionId]?.trim();
    if (notes === undefined) return;
    setUpdatingId(`${submissionId}-notes`);

    try {
      const data = await adminService.updateSubmission(submissionId, { adminNotes: notes });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === data.submission.id ? data.submission : s))
      );
      setNotesDrafts((prev) => ({ ...prev, [submissionId]: undefined }));
      setCounts(data.counts || counts);
    } catch (notesError) {
      setError(notesError.message || 'Failed to save notes');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleImport = (submission) => {
    if (onImportToEditor) {
      onImportToEditor(submission);
    }
  };

  if (loading && submissions.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-end justify-between">
          <div>
            <div className="h-3 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        {/* Sort & Filter Row Skeleton */}
        <div className="flex items-center justify-between gap-3 py-2 border-b-[2px] border-black/10 dark:border-white/10">
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
        {/* Card Skeletons */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-bg-surface rounded-xl border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.2)] animate-pulse"
            >
              <div className="p-4 border-b-[2px] border-black/10 dark:border-white/10">
                <div className="flex justify-between">
                  <div>
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                  <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase mb-1">
            User Submissions
          </p>
          <h2 className="text-2xl font-black text-text-primary">Puzzle Submissions</h2>
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
              <div className="p-3">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUBMISSION_STATUS_OPTIONS.map((option) => {
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
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-xl">
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Submissions List */}
      {!hasSubmissions && !loading ? (
        <div className="text-center py-12 bg-bg-surface rounded-xl border-[3px] border-black dark:border-white">
          <p className="text-lg font-bold text-text-secondary">No submissions in this category</p>
          <p className="text-sm text-text-secondary mt-2">
            User-submitted puzzles will appear here when they are submitted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isExpanded={expandedId === submission.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === submission.id ? null : submission.id)
              }
              onStatusChange={handleStatusChange}
              onNotesChange={(notes) =>
                setNotesDrafts((prev) => ({ ...prev, [submission.id]: notes }))
              }
              onNotesSubmit={() => handleNotesSubmit(submission.id)}
              notesDraft={notesDrafts[submission.id]}
              onImport={() => handleImport(submission)}
              isUpdating={updatingId === submission.id || updatingId === `${submission.id}-notes`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * SubmissionCard - Individual submission display card
 */
function SubmissionCard({
  submission,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onNotesChange,
  onNotesSubmit,
  notesDraft,
  onImport,
  isUpdating,
}) {
  const { id, displayName, isAnonymous, status, adminNotes, submittedAt, groups } = submission;

  return (
    <div className="bg-bg-surface rounded-xl border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
      {/* Header */}
      <div className="p-4 border-b-[2px] border-black/10 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-text-primary">{displayName}</span>
              {isAnonymous && (
                <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-xs font-bold rounded">
                  Anonymous
                </span>
              )}
            </div>
            <p className="text-sm text-text-secondary">{formatTimestamp(submittedAt)}</p>
          </div>
          <button
            onClick={onToggleExpand}
            className="px-3 py-1 bg-bg-card border-[2px] border-black dark:border-white rounded-lg text-sm font-bold hover:bg-accent-yellow/20 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'View Details'}
          </button>
        </div>
      </div>

      {/* Groups Preview */}
      <div className="p-4 space-y-3">
        {groups.map((group, index) => (
          <div key={group.id || index} className="flex items-start gap-3">
            <span
              className={`w-16 text-center px-2 py-1 rounded text-xs font-bold flex-shrink-0 ${DIFFICULTY_COLORS[group.difficulty]}`}
            >
              {group.difficulty}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-text-primary text-sm">{group.connection}</p>
              {isExpanded && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {group.movies.map((movie, movieIndex) => (
                    <div
                      key={movie.id || movieIndex}
                      className="flex items-center gap-2 p-2 bg-bg-card rounded-lg border-[2px] border-black/10 dark:border-white/10"
                    >
                      {movie.poster && (
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-8 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-text-primary truncate">
                          {movie.title}
                        </p>
                        <p className="text-[10px] text-text-secondary">{movie.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="p-4 border-t-[2px] border-black/10 dark:border-white/10 space-y-4">
          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-bold text-text-primary mb-2">Admin Notes</label>
            <textarea
              value={notesDraft ?? adminNotes ?? ''}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add internal notes about this submission..."
              rows={3}
              className="w-full px-3 py-2 border-[2px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
            {notesDraft !== undefined && notesDraft !== (adminNotes ?? '') && (
              <button
                onClick={onNotesSubmit}
                disabled={isUpdating}
                className="mt-2 px-4 py-2 bg-accent-blue text-white border-[2px] border-black font-bold rounded-lg text-sm hover:translate-y-[-1px] transition-transform disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Notes'}
              </button>
            )}
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-secondary">Status:</span>
              <select
                value={status}
                onChange={(e) => onStatusChange(id, e.target.value)}
                disabled={isUpdating}
                className="px-3 py-2 border-[2px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-bold text-sm disabled:opacity-50"
              >
                {SUBMISSION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Import Button */}
            <button
              onClick={onImport}
              className="px-4 py-2 bg-accent-green text-white border-[2px] border-black font-bold rounded-lg text-sm hover:translate-y-[-1px] transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)]"
            >
              Copy to Editor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
