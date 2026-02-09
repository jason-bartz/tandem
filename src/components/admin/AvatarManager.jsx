'use client';
import { useState, useEffect, useRef } from 'react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

export default function AvatarManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatars, setAvatars] = useState([]);
  const [message, setMessage] = useState(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    id: '',
    display_name: '',
    bio: '',
    alchemy_bio: '',
    is_active: false,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/avatars', {
        headers: await authService.getAuthHeaders(false),
      });

      if (response.ok) {
        const data = await response.json();
        setAvatars(data.avatars || []);
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again', 'error');
      } else {
        showMessage('Failed to load avatars', 'error');
      }
    } catch (error) {
      logger.error('Error fetching avatars:', error);
      showMessage('Error loading avatars', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        showMessage('Please select a PNG, JPEG, or WebP image', 'error');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showMessage('Image must be smaller than 2MB', 'error');
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadFormChange = (field, value) => {
    setUploadForm((prev) => ({ ...prev, [field]: value }));

    // Auto-generate ID from display name if ID is empty
    if (field === 'display_name' && !uploadForm.id) {
      const autoId = value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setUploadForm((prev) => ({ ...prev, id: autoId }));
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      id: '',
      display_name: '',
      bio: '',
      alchemy_bio: '',
      is_active: false,
    });
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      showMessage('Please select an image', 'error');
      return;
    }

    if (!uploadForm.id || !uploadForm.display_name || !uploadForm.bio) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('id', uploadForm.id);
      formData.append('display_name', uploadForm.display_name);
      formData.append('bio', uploadForm.bio);
      if (uploadForm.alchemy_bio) {
        formData.append('alchemy_bio', uploadForm.alchemy_bio);
      }
      formData.append('is_active', uploadForm.is_active.toString());

      const token = await authService.getToken();
      const response = await fetch('/api/admin/avatars', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Avatar created successfully!', 'success');
        resetUploadForm();
        setShowUploadForm(false);
        fetchAvatars();
      } else {
        showMessage(data.error || 'Failed to create avatar', 'error');
      }
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      showMessage('Error creating avatar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (avatar) => {
    try {
      const response = await fetch('/api/admin/avatars', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          id: avatar.id,
          is_active: !avatar.is_active,
        }),
      });

      if (response.ok) {
        showMessage(`Avatar ${!avatar.is_active ? 'activated' : 'deactivated'}`, 'success');
        fetchAvatars();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to update avatar', 'error');
      }
    } catch (error) {
      logger.error('Error toggling avatar:', error);
      showMessage('Error updating avatar', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAvatar) return;

    try {
      setSaving(true);
      const response = await fetch('/api/admin/avatars', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({
          id: editingAvatar.id,
          display_name: editingAvatar.display_name,
          bio: editingAvatar.bio,
          alchemy_bio: editingAvatar.alchemy_bio || null,
        }),
      });

      if (response.ok) {
        showMessage('Avatar updated successfully', 'success');
        setEditingAvatar(null);
        fetchAvatars();
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to update avatar', 'error');
      }
    } catch (error) {
      logger.error('Error updating avatar:', error);
      showMessage('Error updating avatar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (avatar) => {
    if (
      !confirm(`Are you sure you want to delete "${avatar.display_name}"? This cannot be undone.`)
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/avatars?id=${avatar.id}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage('Avatar deleted successfully', 'success');
        fetchAvatars();
      } else {
        showMessage(data.error || 'Failed to delete avatar', 'error');
      }
    } catch (error) {
      logger.error('Error deleting avatar:', error);
      showMessage('Error deleting avatar', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading avatars...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
        <div className="px-6 py-4 border-b-[3px] border-black dark:border-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐾</span>
              <h3 className="text-lg font-bold text-text-primary">Avatar Manager</h3>
            </div>
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-2.5 py-1 text-xs bg-accent-green text-white border-[2px] border-black dark:border-white font-bold rounded-md hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.3)] whitespace-nowrap"
            >
              Add
            </button>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Manage character avatars. New avatars default to inactive - toggle to make them
            available to users.
          </p>
        </div>

        <div className="p-6">
          {/* Message */}
          {message && (
            <div
              className={`px-4 py-3 rounded-lg border-[3px] mb-4 ${
                message.type === 'success'
                  ? 'bg-accent-green/20 border-accent-green text-accent-green'
                  : message.type === 'error'
                    ? 'bg-accent-red/20 border-accent-red text-accent-red'
                    : 'bg-accent-blue/20 border-accent-blue text-accent-blue'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Upload Form Modal */}
          {showUploadForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b-[3px] border-black dark:border-white">
                  <h4 className="font-bold text-text-primary">Add New Avatar</h4>
                </div>
                <div className="p-6 space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Avatar Image *
                    </label>
                    <div className="flex items-center gap-4">
                      {imagePreview ? (
                        <div className="w-24 h-24 rounded-full border-[3px] border-black dark:border-white overflow-hidden">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-full border-[3px] border-dashed border-text-muted flex items-center justify-center text-text-muted">
                          No image
                        </div>
                      )}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                          id="avatar-image"
                        />
                        <label
                          htmlFor="avatar-image"
                          className="inline-block px-4 py-2 bg-accent-blue text-white border-[3px] border-black dark:border-white font-bold rounded-lg cursor-pointer hover:translate-y-[-2px] active:translate-y-0 transition-transform"
                        >
                          Choose Image
                        </label>
                        <p className="text-xs text-text-secondary mt-1">
                          PNG, JPEG, or WebP (max 2MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ID */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      ID *{' '}
                      <span className="text-text-secondary font-normal">
                        (lowercase, no spaces)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={uploadForm.id}
                      onChange={(e) =>
                        handleUploadFormChange(
                          'id',
                          e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                        )
                      }
                      placeholder="e.g., berry"
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={uploadForm.display_name}
                      onChange={(e) => handleUploadFormChange('display_name', e.target.value)}
                      placeholder="e.g., Berry"
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Bio *
                    </label>
                    <textarea
                      value={uploadForm.bio}
                      onChange={(e) => handleUploadFormChange('bio', e.target.value)}
                      placeholder="Describe this character's personality..."
                      rows={4}
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                    />
                  </div>

                  {/* Alchemy Bio (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Alchemy Bio{' '}
                      <span className="text-text-secondary font-normal">
                        (optional, for dailyalchemy.fun)
                      </span>
                    </label>
                    <textarea
                      value={uploadForm.alchemy_bio}
                      onChange={(e) => handleUploadFormChange('alchemy_bio', e.target.value)}
                      placeholder="Alchemy-themed character personality for standalone site..."
                      rows={4}
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                    />
                  </div>

                  {/* Is Active */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={uploadForm.is_active}
                      onChange={(e) => handleUploadFormChange('is_active', e.target.checked)}
                      className="w-5 h-5 border-[3px] border-black dark:border-white rounded"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-text-primary">
                      Make active immediately (visible to users)
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t-[3px] border-black dark:border-white">
                    <button
                      onClick={handleUpload}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-accent-green text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] disabled:opacity-50"
                    >
                      {saving ? 'Creating...' : 'Create Avatar'}
                    </button>
                    <button
                      onClick={() => {
                        resetUploadForm();
                        setShowUploadForm(false);
                      }}
                      className="px-4 py-2 bg-bg-card text-text-primary border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit Modal */}
          {editingAvatar && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] max-w-lg w-full">
                <div className="px-6 py-4 border-b-[3px] border-black dark:border-white">
                  <h4 className="font-bold text-text-primary">Edit Avatar</h4>
                </div>
                <div className="p-6 space-y-4">
                  {/* Preview */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-[3px] border-black dark:border-white overflow-hidden">
                      <img
                        src={editingAvatar.image_path}
                        alt={editingAvatar.display_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm text-text-secondary">
                      ID: <code className="bg-bg-card px-2 py-1 rounded">{editingAvatar.id}</code>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={editingAvatar.display_name}
                      onChange={(e) =>
                        setEditingAvatar({ ...editingAvatar, display_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Bio</label>
                    <textarea
                      value={editingAvatar.bio}
                      onChange={(e) => setEditingAvatar({ ...editingAvatar, bio: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                    />
                  </div>

                  {/* Alchemy Bio */}
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Alchemy Bio{' '}
                      <span className="text-text-secondary font-normal">(dailyalchemy.fun)</span>
                    </label>
                    <textarea
                      value={editingAvatar.alchemy_bio || ''}
                      onChange={(e) =>
                        setEditingAvatar({ ...editingAvatar, alchemy_bio: e.target.value })
                      }
                      placeholder="Alchemy-themed bio (leave empty to use default bio)"
                      rows={4}
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t-[3px] border-black dark:border-white">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-accent-blue text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingAvatar(null)}
                      className="px-4 py-2 bg-bg-card text-text-primary border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Avatar Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`bg-bg-card rounded-lg border-[2px] ${
                  avatar.is_active ? 'border-accent-green' : 'border-text-muted'
                } p-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-full border-[3px] border-black dark:border-white overflow-hidden flex-shrink-0">
                    <img
                      src={avatar.image_path}
                      alt={avatar.display_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-text-primary truncate">
                        {avatar.display_name}
                      </h5>
                      {avatar.is_active ? (
                        <span className="px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs font-bold rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-text-muted/20 text-text-muted text-xs font-bold rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary mt-1">ID: {avatar.id}</p>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{avatar.bio}</p>
                    {avatar.alchemy_bio && (
                      <p className="text-xs text-accent-blue mt-1 line-clamp-1">
                        Alchemy: {avatar.alchemy_bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-text-muted/20">
                  <button
                    onClick={() => setEditingAvatar({ ...avatar })}
                    className="px-2 py-1 text-xs font-bold rounded-md border-[2px] border-accent-blue text-accent-blue hover:bg-accent-blue/20"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(avatar)}
                    className={`flex-1 min-w-0 px-2 py-1 text-xs font-bold rounded-md border-[2px] transition-all truncate ${
                      avatar.is_active
                        ? 'bg-text-muted/20 border-text-muted text-text-secondary hover:bg-text-muted/30'
                        : 'bg-accent-green/20 border-accent-green text-accent-green hover:bg-accent-green/30'
                    }`}
                  >
                    {avatar.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(avatar)}
                    className="px-2 py-1 text-xs font-bold rounded-md border-[2px] border-accent-red text-accent-red hover:bg-accent-red/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {avatars.length === 0 && (
            <div className="text-center py-12 text-text-secondary">
              No avatars found. Click &quot;Add&quot; to create one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
