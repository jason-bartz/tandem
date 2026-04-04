'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail,
  Send,
  Clock,
  Plus,
  Trash2,
  Eye,
  ArrowLeft,
  Upload,
  Users,
  Tag,
  X,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';
import adminService from '@/services/admin.service';
import logger from '@/lib/logger';
import EmailPreview from './EmailPreview';

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-purple-500' },
  { value: 'update', label: 'Update', color: 'bg-blue-400' },
  { value: 'promotion', label: 'Promotion', color: 'bg-green-400' },
  { value: 'announcement', label: 'Announcement', color: 'bg-yellow-400' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-red-400' },
];

const STATUS_STYLES = {
  draft: 'bg-gray-200 dark:bg-gray-700 text-text-secondary',
  scheduled: 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30',
  sending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  sent: 'bg-accent-green/15 text-accent-green border border-accent-green/30',
  failed: 'bg-accent-red/15 text-accent-red border border-accent-red/30',
};

function formatDate(value) {
  if (!value) return '--';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function EmailBlastManager() {
  // View state
  const [view, setView] = useState('list'); // 'list' | 'compose'
  const [editingBlast, setEditingBlast] = useState(null);

  // List state
  const [blasts, setBlasts] = useState([]);
  const [counts, setCounts] = useState({ draft: 0, scheduled: 0, sent: 0, failed: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);

  // Compose state
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [recipientType, setRecipientType] = useState('all');
  const [manualEmails, setManualEmails] = useState('');
  const [importedEmails, setImportedEmails] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [allUserCount, setAllUserCount] = useState(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // 'send' | 'schedule'
  const fileInputRef = useRef(null);

  // Fetch blast history
  const fetchBlasts = useCallback(async () => {
    try {
      setListLoading(true);
      const data = await adminService.getEmailBlasts({
        status: statusFilter,
      });
      setBlasts(data.blasts || []);
      setCounts(data.counts || { draft: 0, scheduled: 0, sent: 0, failed: 0 });
    } catch (error) {
      logger.error('Error fetching email blasts:', error);
      showMessage('Failed to load email history', 'error');
    } finally {
      setListLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBlasts();
  }, [fetchBlasts]);

  // Fetch user count when composing
  useEffect(() => {
    if (view === 'compose' && allUserCount === null) {
      adminService
        .getEmailRecipients()
        .then((data) => setAllUserCount(data.total || 0))
        .catch(() => setAllUserCount(0));
    }
  }, [view, allUserCount]);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 6000);
  };

  // Reset compose form
  const resetForm = () => {
    setSubject('');
    setBody('');
    setCategory('general');
    setTags([]);
    setTagInput('');
    setRecipientType('all');
    setManualEmails('');
    setImportedEmails([]);
    setScheduledAt('');
    setButtonText('');
    setButtonUrl('');
    setEditingBlast(null);
  };

  // Open compose view
  const handleNewBlast = () => {
    resetForm();
    setView('compose');
  };

  // Open existing blast for editing
  const handleEditBlast = (blast) => {
    setEditingBlast(blast);
    setSubject(blast.subject);
    setBody(blast.body);
    setCategory(blast.category);
    setTags(blast.tags || []);
    setRecipientType(blast.recipient_type);
    if (blast.recipient_type !== 'all') {
      setManualEmails((blast.recipient_list || []).join('\n'));
    }
    if (blast.scheduled_at) {
      const d = new Date(blast.scheduled_at);
      setScheduledAt(d.toISOString().slice(0, 16));
    }
    setButtonText(blast.button_text || '');
    setButtonUrl(blast.button_url || '');
    setView('compose');
  };

  // Back to list
  const handleBackToList = () => {
    setView('list');
    resetForm();
    fetchBlasts();
  };

  // Add tag
  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // Import CSV/text file of emails (max 1MB)
  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showMessage('File too large. Maximum size is 1MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      showMessage('Failed to read file', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onload = (event) => {
      const text = event.target.result;
      // Parse emails from CSV or newline-separated text
      const emails = text
        .split(/[\n,;]+/)
        .map((e) => e.trim().replace(/^["']|["']$/g, ''))
        .filter((e) => e && e.includes('@'));

      const unique = [...new Set(emails)];
      setImportedEmails(unique);
      setRecipientType('import');
      showMessage(`Imported ${unique.length} email addresses`, 'success');
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get final recipient list
  const getRecipientList = () => {
    if (recipientType === 'all') return [];
    if (recipientType === 'import') return importedEmails;
    // manual
    return manualEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'));
  };

  const getRecipientCount = () => {
    if (recipientType === 'all') return allUserCount || 0;
    return [...new Set(getRecipientList())].length;
  };

  // Save/send/schedule
  const handleSubmit = async (action) => {
    if (!subject.trim() || !body.trim()) {
      showMessage('Subject and body are required', 'error');
      return;
    }

    if (action !== 'draft' && getRecipientCount() === 0) {
      showMessage('No recipients selected', 'error');
      return;
    }

    if (action === 'schedule' && !scheduledAt) {
      showMessage('Please select a date and time for scheduling', 'error');
      return;
    }

    // For send/schedule, show confirmation
    if (action !== 'draft' && !showConfirmSend) {
      setConfirmAction(action);
      setShowConfirmSend(true);
      return;
    }

    setShowConfirmSend(false);
    setSaving(true);

    try {
      const blastData = {
        subject: subject.trim(),
        body: body.trim(),
        category,
        tags,
        recipientType,
        recipientList: getRecipientList(),
        action,
        scheduledAt: action === 'schedule' ? new Date(scheduledAt).toISOString() : undefined,
        buttonText: buttonText.trim() || undefined,
        buttonUrl: buttonUrl.trim() || undefined,
      };

      let result;
      if (editingBlast) {
        result = await adminService.updateEmailBlast({ id: editingBlast.id, ...blastData });
      } else {
        result = await adminService.createEmailBlast(blastData);
      }

      if (action === 'send' && result.results) {
        showMessage(
          `Email sent to ${result.results.sent} of ${result.results.total} recipients`,
          result.results.failed > 0 ? 'error' : 'success'
        );
      } else if (action === 'schedule') {
        showMessage('Email scheduled successfully', 'success');
      } else {
        showMessage('Draft saved', 'success');
      }

      handleBackToList();
    } catch (error) {
      logger.error('Error saving email blast:', error);
      showMessage(error.message || 'Failed to save email blast', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete blast
  const handleDelete = async (id) => {
    if (!confirm('Delete this email blast?')) return;

    try {
      await adminService.deleteEmailBlast(id);
      showMessage('Email blast deleted', 'success');
      fetchBlasts();
    } catch (error) {
      logger.error('Error deleting email blast:', error);
      showMessage('Failed to delete email blast', 'error');
    }
  };

  // ===========================
  // RENDER: List View
  // ===========================
  if (view === 'list') {
    return (
      <div className="space-y-6">
        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium ${
              message.type === 'error'
                ? 'bg-accent-red/10 text-accent-red'
                : message.type === 'success'
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-accent-blue/10 text-accent-blue'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Email</h2>
          <button
            onClick={handleNewBlast}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg font-bold text-sm hover:bg-accent-blue/90 transition-colors"
          >
            <Plus size={16} />
            New Blast
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !statusFilter
                ? 'bg-text-primary text-bg-surface'
                : 'bg-bg-surface text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All (
            {(counts.draft || 0) +
              (counts.scheduled || 0) +
              (counts.sent || 0) +
              (counts.failed || 0)}
            )
          </button>
          {Object.entries(counts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? null : status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === status
                  ? 'bg-text-primary text-bg-surface'
                  : 'bg-bg-surface text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
            </button>
          ))}
        </div>

        {/* Blast list */}
        <div className="bg-bg-surface rounded-lg">
          {listLoading ? (
            <div className="text-center py-12 text-text-secondary text-sm">Loading...</div>
          ) : blasts.length === 0 ? (
            <div className="text-center py-12 text-text-secondary text-sm">
              <Mail size={32} className="mx-auto mb-3 opacity-40" />
              <p>No email blasts yet.</p>
              <p className="mt-1">Click &quot;New Blast&quot; to create your first one.</p>
            </div>
          ) : (
            <div className="divide-y divide-border-light">
              {blasts.map((blast) => (
                <div key={blast.id} className="p-4 hover:bg-bg-card/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[blast.status]}`}
                        >
                          {blast.status}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            CATEGORIES.find((c) => c.value === blast.category)?.color ||
                            'bg-gray-400'
                          } text-white`}
                        >
                          {blast.category}
                        </span>
                        {(blast.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-card text-text-secondary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <h4 className="text-sm font-bold text-text-primary truncate">
                        {blast.subject}
                      </h4>
                      <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        {blast.body}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted flex-wrap">
                        <span>
                          {blast.recipient_type === 'all'
                            ? 'All users'
                            : `${blast.recipient_count} recipients`}
                        </span>
                        {blast.sent_at && <span>Sent {formatDate(blast.sent_at)}</span>}
                        {blast.scheduled_at && blast.status === 'scheduled' && (
                          <span>Scheduled for {formatDate(blast.scheduled_at)}</span>
                        )}
                        {blast.sent_by && <span>by {blast.sent_by}</span>}
                        <span>Created {formatDate(blast.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {(blast.status === 'draft' || blast.status === 'scheduled') && (
                        <button
                          onClick={() => handleEditBlast(blast)}
                          className="p-2 rounded-lg text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                          title="Edit"
                        >
                          <FileText size={14} />
                        </button>
                      )}
                      {blast.status !== 'sending' && (
                        <button
                          onClick={() => handleDelete(blast.id)}
                          className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================
  // RENDER: Compose View
  // ===========================
  const recipientCount = getRecipientCount();

  return (
    <div className="space-y-4">
      {/* Confirmation modal */}
      {showConfirmSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-accent-red" />
              <h3 className="text-lg font-bold text-text-primary">
                {confirmAction === 'send' ? 'Send Email Now?' : 'Schedule Email?'}
              </h3>
            </div>
            <p className="text-sm text-text-secondary">
              {confirmAction === 'send'
                ? `This will immediately send "${subject}" to ${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? 's' : ''}. This cannot be undone.`
                : `This will schedule "${subject}" to be sent to ${recipientCount.toLocaleString()} recipient${recipientCount !== 1 ? 's' : ''} on ${formatDate(scheduledAt)}.`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmSend(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(confirmAction)}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white ${
                  confirmAction === 'send'
                    ? 'bg-accent-red hover:bg-accent-red/90'
                    : 'bg-accent-blue hover:bg-accent-blue/90'
                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {saving
                  ? 'Processing...'
                  : confirmAction === 'send'
                    ? 'Yes, Send Now'
                    : 'Yes, Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-medium ${
            message.type === 'error'
              ? 'bg-accent-red/10 text-accent-red'
              : message.type === 'success'
                ? 'bg-accent-green/10 text-accent-green'
                : 'bg-accent-blue/10 text-accent-blue'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors whitespace-nowrap"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleSubmit('draft')}
            disabled={saving || !subject.trim() || !body.trim()}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-bg-surface text-text-primary border border-border-main hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            Draft
          </button>
          <button
            onClick={() => handleSubmit('schedule')}
            disabled={saving || !subject.trim() || !body.trim() || !scheduledAt}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Clock size={14} className="hidden sm:block" />
            Schedule
          </button>
          <button
            onClick={() => handleSubmit('send')}
            disabled={saving || !subject.trim() || !body.trim()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-accent-green text-white hover:bg-accent-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Send size={14} className="hidden sm:block" />
            Send
          </button>
        </div>
      </div>

      {/* Side-by-side: Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Editor */}
        <div className="space-y-4">
          {/* Subject */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-3">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              maxLength={200}
              className="w-full p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
            <p className="text-xs text-text-muted text-right">{subject.length}/200</p>
          </div>

          {/* Body */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-3">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Body
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email content here...

Use blank lines for paragraph breaks."
              rows={12}
              maxLength={10000}
              className="w-full p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue font-mono"
            />
            <p className="text-xs text-text-muted text-right">{body.length}/10,000</p>
          </div>

          {/* Button (Optional) */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-3">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Button (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Button text..."
                maxLength={100}
                className="p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
              <input
                type="url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://..."
                className="p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>
            {buttonText && !buttonUrl && (
              <p className="text-xs text-accent-red">Enter a URL for the button</p>
            )}
          </div>

          {/* Category + Tags */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      category === cat.value
                        ? `${cat.color} text-white`
                        : 'bg-bg-card text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                Tags
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add a tag..."
                  className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-xs focus:outline-none focus:ring-2 focus:ring-accent-blue"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim()}
                  className="p-2 rounded-lg bg-bg-card text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  <Plus size={14} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-blue/10 text-accent-blue text-xs font-medium"
                    >
                      <Tag size={10} />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-accent-red"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-3">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Recipients
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setRecipientType('all')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  recipientType === 'all'
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Users size={14} />
                All Users {allUserCount !== null && `(${allUserCount})`}
              </button>
              <button
                onClick={() => setRecipientType('manual')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  recipientType === 'manual'
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Mail size={14} />
                Manual
              </button>
              <label
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  recipientType === 'import'
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Upload size={14} />
                Import
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileImport}
                  className="hidden"
                />
              </label>
            </div>

            {recipientType === 'manual' && (
              <div className="space-y-2">
                <textarea
                  value={manualEmails}
                  onChange={(e) => setManualEmails(e.target.value)}
                  placeholder="Enter email addresses, one per line or comma-separated..."
                  rows={4}
                  className="w-full p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-xs resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue font-mono"
                />
                <p className="text-xs text-text-muted">
                  {getRecipientList().length} valid email
                  {getRecipientList().length !== 1 ? 's' : ''} entered
                </p>
              </div>
            )}

            {recipientType === 'import' && importedEmails.length > 0 && (
              <div className="p-3 rounded-lg bg-accent-green/5 border border-accent-green/20">
                <p className="text-xs font-medium text-accent-green">
                  <Check size={12} className="inline mr-1" />
                  {importedEmails.length} email{importedEmails.length !== 1 ? 's' : ''} imported
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {importedEmails.slice(0, 3).join(', ')}
                  {importedEmails.length > 3 && ` and ${importedEmails.length - 3} more...`}
                </p>
              </div>
            )}

            {recipientType === 'import' && importedEmails.length === 0 && (
              <p className="text-xs text-text-muted">
                Upload a .csv or .txt file with email addresses
              </p>
            )}
          </div>

          {/* Schedule */}
          <div className="bg-bg-surface rounded-lg p-4 space-y-3">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              Schedule (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
            {scheduledAt && (
              <p className="text-xs text-text-muted">Will send on {formatDate(scheduledAt)}</p>
            )}
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-text-secondary" />
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
              Live Preview
            </span>
            <span className="text-xs text-text-muted">
              ({recipientCount.toLocaleString()} recipient{recipientCount !== 1 ? 's' : ''})
            </span>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 sticky top-4">
            <EmailPreview
              subject={subject}
              body={body}
              category={category}
              buttonText={buttonText}
              buttonUrl={buttonUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
