'use client';
import { useState, useEffect } from 'react';
import { X, User, Lock } from 'lucide-react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

export default function ProfileModal({ onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'password'

  // Profile form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/admin/profile', {
        headers: await authService.getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.profile);
        setFullName(data.profile.fullName || '');
        setEmail(data.profile.email || '');
      }
    } catch (err) {
      logger.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ fullName, email }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Profile updated successfully');
        // Update cached user data
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          authService.setCurrentUser({
            ...currentUser,
            fullName,
            email,
          });
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-accent-purple text-white';
      case 'admin':
        return 'bg-accent-blue text-white';
      case 'editor':
        return 'bg-accent-green text-white';
      default:
        return 'bg-bg-surface text-text-secondary';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
          <h3 className="text-base font-bold text-text-primary">Profile & Settings</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-16 bg-bg-surface rounded-lg" />
              <div className="h-32 bg-bg-surface rounded-lg" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* User card */}
              <div className="flex items-center gap-4 p-4 bg-bg-surface rounded-xl">
                <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-accent-blue">
                    {(profile?.fullName || profile?.username || '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{profile?.fullName}</p>
                  <p className="text-xs text-text-muted">@{profile?.username}</p>
                  {profile?.role && (
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getRoleBadgeColor(profile.role)}`}
                    >
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Section tabs */}
              <div className="flex gap-1 bg-bg-surface rounded-lg p-1">
                <button
                  onClick={() => {
                    setActiveSection('profile');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                    activeSection === 'profile'
                      ? 'bg-bg-card text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveSection('password');
                    setError('');
                    setSuccess('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-colors ${
                    activeSection === 'password'
                      ? 'bg-bg-card text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Password
                </button>
              </div>

              {/* Messages */}
              {error && (
                <div className="p-3 bg-accent-red/10 rounded-lg">
                  <p className="text-accent-red text-sm font-semibold">{error}</p>
                </div>
              )}
              {success && (
                <div className="p-3 bg-accent-green/10 rounded-lg">
                  <p className="text-accent-green text-sm font-semibold">{success}</p>
                </div>
              )}

              {/* Profile form */}
              {activeSection === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      disabled
                      value={profile?.username || ''}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-muted font-medium cursor-not-allowed"
                    />
                    <p className="mt-1 text-[10px] text-text-muted">Username cannot be changed</p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-4 py-2.5 text-sm font-bold bg-accent-blue text-white rounded-xl disabled:opacity-50 transition-transform active:translate-y-0"
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              )}

              {/* Password form */}
              {activeSection === 'password' && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      autoComplete="current-password"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-[10px] text-text-muted">
                      Uppercase, lowercase, number, and special character required
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border-main rounded-lg bg-bg-surface text-sm text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full px-4 py-2.5 text-sm font-bold bg-accent-blue text-white rounded-xl disabled:opacity-50 transition-transform active:translate-y-0"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
