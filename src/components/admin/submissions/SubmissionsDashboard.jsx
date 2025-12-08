'use client';

import { useEffect, useMemo, useState } from 'react';
import adminService from '@/services/admin.service';
import { SUBMISSION_STATUS, SUBMISSION_STATUS_OPTIONS } from '@/lib/constants';

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

  useEffect(() => {
    loadSubmissions(statusFilter);
  }, [statusFilter]);

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
      console.error('[SubmissionsDashboard] Error loading submissions:', fetchError);
      setError(fetchError.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (submissionId, newStatus) => {
    if (!newStatus) return;
    setUpdatingId(submissionId);

    // Immediately remove from current view if status changed
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
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
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

        {/* Status Tabs */}
        {summary && (
          <div className="flex gap-1.5 sm:gap-2 border-b-[3px] border-black dark:border-white overflow-x-auto">
            {summary.map((item) => {
              const isActive = statusFilter === item.value;
              const colorClasses = {
                [SUBMISSION_STATUS.PENDING]: 'bg-accent-yellow',
                [SUBMISSION_STATUS.APPROVED]: 'bg-accent-green',
                [SUBMISSION_STATUS.NEEDS_EDIT]: 'bg-accent-blue',
                [SUBMISSION_STATUS.ARCHIVED]: 'bg-gray-500',
              };

              const color = colorClasses[item.value];

              return (
                <button
                  key={item.value}
                  onClick={() => setStatusFilter(item.value)}
                  className={`relative px-3 sm:px-4 py-2 sm:py-3 border-[3px] border-black dark:border-white font-bold text-xs sm:text-sm transition-all rounded-t-lg whitespace-nowrap ${
                    isActive
                      ? `${color} ${item.value === SUBMISSION_STATUS.PENDING ? 'text-gray-900' : 'text-white'} border-b-[0px] mb-[-3px] z-10 shadow-none`
                      : 'bg-ghost-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span>{item.label}</span>
                    <span
                      className={`min-w-[20px] sm:min-w-[24px] px-1 sm:px-1.5 py-0.5 rounded text-xs font-black ${
                        isActive
                          ? 'bg-white/20 text-inherit'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {item.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-3">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border-[2px] border-black dark:border-white rounded-lg bg-bg-card text-text-primary font-medium text-sm"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
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
