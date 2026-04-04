'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/announcements', {
        headers: await authService.getAuthHeaders(false),
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again', 'error');
      } else {
        showMessage('Failed to load announcements', 'error');
      }
    } catch (error) {
      logger.error('Error fetching announcements:', error);
      showMessage('Error loading announcements', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newText.trim()) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ text: newText.trim() }),
      });

      if (response.ok) {
        setNewText('');
        showMessage('Announcement created', 'success');
        fetchAnnouncements();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to create announcement', 'error');
      }
    } catch (error) {
      logger.error('Error creating announcement:', error);
      showMessage('Error creating announcement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (announcement) => {
    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ id: announcement.id, active: !announcement.active }),
      });

      if (response.ok) {
        showMessage(`Announcement ${announcement.active ? 'deactivated' : 'activated'}`, 'success');
        fetchAnnouncements();
      } else {
        showMessage('Failed to update announcement', 'error');
      }
    } catch (error) {
      logger.error('Error toggling announcement:', error);
      showMessage('Error updating announcement', 'error');
    }
  };

  const handleStartEdit = (announcement) => {
    setEditingId(announcement.id);
    setEditText(announcement.text);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;

    try {
      const response = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ id: editingId, text: editText.trim() }),
      });

      if (response.ok) {
        setEditingId(null);
        setEditText('');
        showMessage('Announcement updated', 'success');
        fetchAnnouncements();
      } else {
        showMessage('Failed to update announcement', 'error');
      }
    } catch (error) {
      logger.error('Error editing announcement:', error);
      showMessage('Error updating announcement', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        showMessage('Announcement deleted', 'success');
        fetchAnnouncements();
      } else {
        showMessage('Failed to delete announcement', 'error');
      }
    } catch (error) {
      logger.error('Error deleting announcement:', error);
      showMessage('Error deleting announcement', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Status message */}
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

      {/* Create new announcement */}
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 py-3 border-b border-border-light">
          <h2 className="text-lg font-bold text-text-primary">Announcements</h2>
        </div>
        <div className="p-4">
          <div className="flex gap-3">
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Write your announcement..."
              maxLength={500}
              rows={2}
              className="flex-1 p-3 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
            <button
              onClick={handleCreate}
              disabled={saving || !newText.trim()}
              className={`
                self-end px-4 py-3 rounded-md font-bold text-sm
                transition-all
                ${
                  saving || !newText.trim()
                    ? 'bg-gray-200 dark:bg-gray-700 text-text-muted cursor-not-allowed'
                    : 'bg-accent-blue text-white hover:'
                }
              `}
            >
              <Plus size={18} />
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2">{newText.length}/500 characters</p>
        </div>
      </div>

      {/* Existing announcements */}
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 py-3 border-b border-border-light">
          <h3 className="text-base font-bold text-text-primary">All Announcements</h3>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-text-secondary text-sm">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              No announcements yet. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-lg transition-colors ${
                    a.active ? 'bg-accent-green/5' : 'bg-bg-surface opacity-60'
                  }`}
                >
                  {editingId === a.id ? (
                    <div className="flex gap-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={500}
                        rows={2}
                        className="flex-1 p-2 rounded-lg border border-border-main bg-bg-surface dark:bg-gray-800 text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={handleSaveEdit}
                          className="p-2 rounded-lg text-accent-green hover:bg-accent-green/10"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 rounded-lg text-text-secondary hover:bg-black/5 dark:hover:bg-white/10"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-text-primary mb-3">{a.text}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">
                          {new Date(a.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                          {a.active && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-green/15 text-accent-green border border-accent-green/30">
                              Active
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(a)}
                            className="p-2 rounded-lg text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(a)}
                            className={`p-2 rounded-lg transition-colors ${
                              a.active
                                ? 'text-accent-green hover:bg-accent-green/10'
                                : 'text-text-muted hover:bg-black/5 dark:hover:bg-white/10'
                            }`}
                            title={a.active ? 'Deactivate' : 'Activate'}
                          >
                            {a.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-2 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
