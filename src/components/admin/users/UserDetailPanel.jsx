'use client';

import { useState } from 'react';
import adminService from '@/services/admin.service';
import logger from '@/lib/logger';

function formatTime(seconds) {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function StatBlock({ label, value, sub }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-text-primary">{value ?? '--'}</div>
      <div className="text-xs font-semibold text-text-secondary">{label}</div>
      {sub && <div className="text-[10px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function GameStatsCard({ title, color, stats }) {
  if (!stats) {
    return (
      <div className={`rounded-lg border-[2px] border-border-main p-3 bg-${color}/5`}>
        <h5 className={`text-xs font-bold text-${color} mb-2`}>{title}</h5>
        <p className="text-xs text-text-muted">No data</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border-[2px] border-border-main p-3`}
      style={{ backgroundColor: `var(--${color}-bg, transparent)` }}
    >
      <h5 className="text-xs font-bold mb-2" style={{ color: `var(--${color})` }}>
        {title}
      </h5>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, sub }) => (
          <StatBlock key={label} label={label} value={value} sub={sub} />
        ))}
      </div>
    </div>
  );
}

export default function UserDetailPanel({ user, onClose }) {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handlePasswordReset = async () => {
    if (!confirm(`Send password reset email to ${user.email}?`)) return;

    setResetting(true);
    setResetMessage('');
    try {
      const result = await adminService.sendPasswordReset(user.id);
      setResetMessage(result.message || 'Password reset email sent');
    } catch (error) {
      logger.error('Password reset error', error);
      setResetMessage(`Error: ${error.message}`);
    } finally {
      setResetting(false);
    }
  };

  const stats = user.stats || {};
  const sub = user.subscription;

  return (
    <tr>
      <td colSpan="8" className="p-0">
        <div className="border-t-[3px] border-black dark:border-white bg-bg-card">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y-[3px] lg:divide-y-0 lg:divide-x-[3px] divide-black dark:divide-white">
            {/* Profile Section */}
            <div className="p-4 sm:p-5">
              <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                Profile
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Username</span>
                  <span className="text-text-primary font-bold">{user.username || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Email</span>
                  <span className="text-text-primary font-mono text-xs break-all">
                    {user.email || '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">User ID</span>
                  <span className="text-text-primary font-mono text-[10px] break-all">
                    {user.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Country</span>
                  <span className="text-text-primary">
                    {user.countryFlag || ''} {user.countryCode || '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Account Type</span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border-[2px] ${
                      user.isAnonymous
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-text-secondary'
                        : 'bg-accent-green/20 border-accent-green text-accent-green'
                    }`}
                  >
                    {user.isAnonymous ? 'Anonymous' : 'Registered'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Provider</span>
                  <span className="text-text-primary capitalize">{user.provider || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Created</span>
                  <span className="text-text-primary text-xs">
                    {formatDateTime(user.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-medium">Last Sign In</span>
                  <span className="text-text-primary text-xs">
                    {formatDateTime(user.lastSignInAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Game Stats Section */}
            <div className="p-4 sm:p-5">
              <h4 className="text-sm font-bold text-text-primary mb-3">Game Stats</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <GameStatsCard
                  title="Daily Tandem"
                  color="accent-yellow"
                  stats={
                    stats.tandem
                      ? [
                          { label: 'Played', value: stats.tandem.played },
                          { label: 'Wins', value: stats.tandem.wins },
                          { label: 'Current', value: stats.tandem.currentStreak, sub: 'streak' },
                          { label: 'Best', value: stats.tandem.bestStreak, sub: 'streak' },
                        ]
                      : null
                  }
                />
                <GameStatsCard
                  title="Daily Mini"
                  color="accent-blue"
                  stats={
                    stats.mini
                      ? [
                          { label: 'Completed', value: stats.mini.totalCompleted },
                          { label: 'Perfect', value: stats.mini.perfectSolves },
                          { label: 'Best Time', value: formatTime(stats.mini.bestTime) },
                          { label: 'Avg Time', value: formatTime(stats.mini.averageTime) },
                        ]
                      : null
                  }
                />
                <GameStatsCard
                  title="Reel Connections"
                  color="accent-red"
                  stats={
                    stats.reel
                      ? [
                          { label: 'Played', value: stats.reel.gamesPlayed },
                          { label: 'Won', value: stats.reel.gamesWon },
                          { label: 'Current', value: stats.reel.currentStreak, sub: 'streak' },
                          { label: 'Best', value: stats.reel.bestStreak, sub: 'streak' },
                        ]
                      : null
                  }
                />
                <GameStatsCard
                  title="Daily Alchemy"
                  color="accent-green"
                  stats={
                    stats.alchemy
                      ? [
                          { label: 'Played', value: stats.alchemy.totalPlayed },
                          { label: 'Solved', value: stats.alchemy.totalSolved },
                          { label: 'Current', value: stats.alchemy.currentStreak, sub: 'streak' },
                          { label: 'Best', value: stats.alchemy.bestStreak, sub: 'streak' },
                        ]
                      : null
                  }
                />
              </div>

              {/* Achievements */}
              <div className="mt-3 rounded-lg border-[2px] border-border-main p-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-text-secondary">Achievements</span>
                  <span className="text-lg font-bold text-accent-purple">
                    {user.achievements?.count || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="p-4 sm:p-5">
              <h4 className="text-sm font-bold text-text-primary mb-3">Subscription</h4>

              {sub ? (
                <div className="rounded-lg border-[2px] border-border-main p-3 space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-text-secondary font-medium">Status</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border-[2px] ${
                        sub.status === 'active'
                          ? 'bg-accent-green/20 border-accent-green text-accent-green'
                          : 'bg-accent-red/20 border-accent-red text-accent-red'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  {sub.tier && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-medium">Tier</span>
                      <span className="text-text-primary font-bold capitalize">{sub.tier}</span>
                    </div>
                  )}
                  {sub.currentPeriodEnd && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary font-medium">Renews</span>
                      <span className="text-text-primary text-xs">
                        {formatDate(sub.currentPeriodEnd)}
                      </span>
                    </div>
                  )}
                  {sub.cancelAtPeriodEnd && (
                    <div className="text-xs text-accent-red font-bold mt-1">
                      Cancels at period end
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border-[2px] border-border-main p-3 mb-4">
                  <p className="text-xs text-text-muted">No active subscription</p>
                </div>
              )}

              <h4 className="text-sm font-bold text-text-primary mb-3">Actions</h4>

              <div className="space-y-2">
                {user.email && !user.isAnonymous && (
                  <button
                    onClick={handlePasswordReset}
                    disabled={resetting}
                    className="w-full px-3 py-2 bg-accent-blue text-white border-[3px] border-black dark:border-white font-bold text-sm rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {resetting ? 'Sending...' : 'Send Password Reset'}
                  </button>
                )}

                {resetMessage && (
                  <div
                    className={`text-xs font-bold p-2 rounded-lg border-[2px] ${
                      resetMessage.startsWith('Error')
                        ? 'bg-accent-red/20 border-accent-red text-accent-red'
                        : 'bg-accent-green/20 border-accent-green text-accent-green'
                    }`}
                  >
                    {resetMessage}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full px-3 py-2 bg-bg-surface text-text-secondary border-[2px] border-border-main font-bold text-sm rounded-xl hover:bg-bg-card transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
