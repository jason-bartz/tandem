'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { UserPlus, Shield, ShieldCheck, Crown, X } from 'lucide-react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-accent-purple text-white', level: 3 },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'bg-accent-blue text-white', level: 2 },
  editor: { label: 'Editor', icon: Shield, color: 'bg-accent-green text-white', level: 1 },
};

export default function TeamManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentUser = authService.getCurrentUser();
  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin' || isOwner;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/team', {
        headers: await authService.getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      logger.error('Failed to fetch team members', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${user.full_name}?`)) return;

    try {
      const response = await fetch('/api/admin/team', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ id: user.id, isActive: !user.is_active }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`${user.full_name} has been ${action}d`);
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      const response = await fetch('/api/admin/team', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ id: user.id, role: newRole }),
      });
      const data = await response.json();
      if (data.success) {
        showSuccess(`${user.full_name} is now ${newRole}`);
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to change role');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Team</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-bg-surface rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Team</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {users.filter((u) => u.is_active).length} active member
            {users.filter((u) => u.is_active).length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white font-bold rounded-md text-sm transition-all duration-200 hover:scale-105 whitespace-nowrap flex-shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-accent-red/10 rounded-lg">
          <p className="text-accent-red text-sm font-semibold">{error}</p>
          <button
            onClick={() => setError('')}
            className="text-xs text-accent-red/70 underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-accent-green/10 rounded-lg">
          <p className="text-accent-green text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface rounded-lg"
            >
              <Icon className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-xs font-semibold text-text-secondary">{cfg.label}</span>
              <span className="text-[10px] text-text-muted hidden sm:inline">
                {key === 'owner' && '- Full access'}
                {key === 'admin' && '- Manage content & editors'}
                {key === 'editor' && '- Create & edit puzzles'}
              </span>
            </div>
          );
        })}
      </div>

      {/* User list */}
      <div className="space-y-3">
        {users.map((user) => {
          const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG.editor;
          const RoleIcon = roleConfig.icon;
          const isSelf = user.id === currentUser?.id;
          const canEdit =
            isOwner ||
            (isAdmin && ROLE_CONFIG[user.role]?.level < ROLE_CONFIG[currentUser?.role]?.level);

          return (
            <div
              key={user.id}
              className={`flex items-center gap-4 p-4 bg-bg-surface rounded-lg ${
                !user.is_active ? 'opacity-50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                {user.avatars?.image_path ? (
                  <Image
                    src={user.avatars.image_path}
                    alt={user.avatars.display_name || user.full_name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-accent-blue">
                    {user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {user.full_name}
                    {isSelf && (
                      <span className="ml-1.5 text-[10px] font-semibold text-text-muted">
                        (you)
                      </span>
                    )}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider flex-shrink-0 ${roleConfig.color}`}
                  >
                    <RoleIcon className="w-2.5 h-2.5" />
                    {roleConfig.label}
                  </span>
                  {!user.is_active && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-bg-card text-text-muted uppercase flex-shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted truncate mt-0.5">{user.email}</p>
                <p className="text-[10px] text-text-muted mt-0.5 hidden sm:block">
                  Last login: {formatDate(user.last_login_at)}
                </p>
              </div>

              {/* Actions */}
              {canEdit && !isSelf && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Role change dropdown for owners */}
                  {isOwner && user.role !== 'owner' && (
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      className="px-2 py-1 text-xs bg-bg-card border border-border-main rounded-lg font-semibold text-text-primary"
                    >
                      <option value="editor">Editor</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`px-3 py-2 text-xs font-bold rounded-md transition-all duration-200 hover:scale-105 whitespace-nowrap ${
                      user.is_active
                        ? 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20'
                        : 'bg-accent-green/10 text-accent-green hover:bg-accent-green/20'
                    }`}
                  >
                    {user.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            fetchUsers();
            showSuccess('Team member invited successfully');
          }}
          canInviteAdmin={isOwner}
        />
      )}
    </div>
  );
}

function InviteModal({ onClose, onSuccess, canInviteAdmin }) {
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'editor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/team', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-lg w-full max-w-md">
        <div className="px-4 sm:px-6 py-4 border-b border-border-light flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">Invite Team Member</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-accent-red/10 rounded-lg">
            <p className="text-accent-red text-sm font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              placeholder="jane@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              placeholder="jsmith"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              Letters, numbers, underscores, hyphens only
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">
              Temporary Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
              placeholder="Set initial password"
            />
            <p className="mt-1 text-[10px] text-text-muted">
              Uppercase, lowercase, number, and special character required
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="editor">Editor - Create & edit puzzles</option>
              {canInviteAdmin && <option value="admin">Admin - Manage content & team</option>}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-text-primary bg-bg-surface rounded-md transition-all duration-200 hover:scale-105 hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-bold bg-accent-blue text-white rounded-md disabled:opacity-50 transition-all duration-200 hover:scale-105"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
