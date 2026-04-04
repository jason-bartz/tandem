'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bell, BellOff, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

const GAME_OPTIONS = [
  { id: 'tandem', label: 'Daily Tandem', icon: '/ui/games/tandem.png' },
  { id: 'mini', label: 'Daily Mini', icon: '/ui/games/mini.png' },
  { id: 'reel', label: 'Reel Connections', icon: '/ui/games/movie.png' },
  { id: 'soup', label: 'Daily Alchemy', icon: '/ui/games/daily-alchemy.png' },
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'Once (no reminders)' },
  { value: 2, label: 'Every 2 hours' },
  { value: 4, label: 'Every 4 hours' },
  { value: 6, label: 'Every 6 hours' },
];

// Generate hour options in 12h format
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const period = i < 12 ? 'AM' : 'PM';
  const h = i === 0 ? 12 : i > 12 ? i - 12 : i;
  return { value: i, label: `${h}:00 ${period}` };
});

export default function PuzzleAlertSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/puzzle-alerts', {
        headers: await authService.getAuthHeaders(false),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again', 'error');
      } else {
        showMessage('Failed to load alert settings', 'error');
      }
    } catch (error) {
      logger.error('Error fetching puzzle alert settings:', error);
      showMessage('Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/puzzle-alerts', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        showMessage('Alert settings saved', 'success');
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to save settings', 'error');
      }
    } catch (error) {
      logger.error('Error saving puzzle alert settings:', error);
      showMessage('Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      // Save first to ensure latest settings are used
      await fetch('/api/admin/puzzle-alerts', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(settings),
      });

      const response = await fetch('/api/admin/puzzle-alerts', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.alertSent) {
          showMessage(
            `Alert sent! ${data.totalMissing} missing puzzle${data.totalMissing === 1 ? '' : 's'} found.`,
            'success'
          );
        } else if (data.skipped) {
          showMessage(`Check skipped: ${data.reason}`, 'info');
        } else {
          showMessage('All puzzles are present for tomorrow - no alert needed!', 'success');
        }
      } else {
        showMessage('Failed to run test alert', 'error');
      }
    } catch (error) {
      logger.error('Error testing puzzle alert:', error);
      showMessage('Error running test', 'error');
    } finally {
      setTesting(false);
    }
  };

  const toggleGame = (gameId) => {
    setSettings((prev) => {
      const games = prev.games_to_monitor || [];
      const updated = games.includes(gameId)
        ? games.filter((g) => g !== gameId)
        : [...games, gameId];
      return { ...prev, games_to_monitor: updated };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        <span className="ml-2 text-sm text-text-muted">Loading alert settings...</span>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-text-muted text-sm">
        Failed to load settings. Please refresh.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-text-primary">Puzzle Deadline Alerts</h3>
        <p className="text-sm text-text-muted mt-0.5">
          Get notified on Discord when tomorrow&apos;s puzzles haven&apos;t been created yet.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
            message.type === 'success'
              ? 'bg-accent-green/10 text-accent-green'
              : message.type === 'error'
                ? 'bg-accent-red/10 text-accent-red'
                : 'bg-accent-blue/10 text-accent-blue'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : message.type === 'error' ? (
            <AlertCircle size={16} />
          ) : null}
          {message.text}
        </div>
      )}

      {/* Enable/Disable toggle */}
      <div className="bg-bg-surface border border-border-light rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell size={20} className="text-accent-green" />
            ) : (
              <BellOff size={20} className="text-text-muted" />
            )}
            <div>
              <p className="text-sm font-bold text-text-primary">
                {settings.enabled ? 'Alerts Active' : 'Alerts Disabled'}
              </p>
              <p className="text-xs text-text-muted">
                {settings.enabled
                  ? 'Discord notifications are being sent for missing puzzles'
                  : 'Enable to start receiving notifications'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-accent-green' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-ghost-white rounded-full shadow transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Discord Webhook URL */}
      <div className="bg-bg-surface border border-border-light rounded-2xl p-4 space-y-2">
        <label className="block text-sm font-bold text-text-primary">Discord Webhook URL</label>
        <input
          type="url"
          value={settings.webhook_url || ''}
          onChange={(e) => setSettings((prev) => ({ ...prev, webhook_url: e.target.value }))}
          placeholder="https://discord.com/api/webhooks/..."
          className="w-full px-3 py-2 text-sm bg-ghost-white border border-border-light rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
        />
        <p className="text-xs text-text-muted">
          Create a webhook in your Discord channel settings and paste the URL here.
        </p>
      </div>

      {/* Alert Start Time */}
      <div className="bg-bg-surface border border-border-light rounded-2xl p-4 space-y-2">
        <label className="block text-sm font-bold text-text-primary">Start Alerting At</label>
        <p className="text-xs text-text-muted">
          Alerts won&apos;t fire before this time (Eastern Time). The first check after this hour
          will send an alert if tomorrow&apos;s puzzles are missing.
        </p>
        <select
          value={settings.alert_start_hour ?? 9}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              alert_start_hour: parseInt(e.target.value),
            }))
          }
          className="w-full px-3 py-2 text-sm bg-ghost-white border border-border-light rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} ET
            </option>
          ))}
        </select>
      </div>

      {/* Reminder Frequency */}
      <div className="bg-bg-surface border border-border-light rounded-2xl p-4 space-y-2">
        <label className="block text-sm font-bold text-text-primary">Reminders</label>
        <p className="text-xs text-text-muted">
          If puzzles are still missing after the first alert, how often should reminders be sent?
        </p>
        <select
          value={settings.check_interval_hours || 4}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              check_interval_hours: parseInt(e.target.value),
            }))
          }
          className="w-full px-3 py-2 text-sm bg-ghost-white border border-border-light rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
        >
          {REMINDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Games to Monitor */}
      <div className="bg-bg-surface border border-border-light rounded-2xl p-4 space-y-3">
        <label className="block text-sm font-bold text-text-primary">Games to Monitor</label>
        <div className="grid grid-cols-2 gap-2">
          {GAME_OPTIONS.map((game) => {
            const isActive = (settings.games_to_monitor || []).includes(game.id);
            return (
              <button
                key={game.id}
                onClick={() => toggleGame(game.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border-light bg-ghost-white text-text-muted hover:border-border-main'
                }`}
              >
                <Image src={game.icon} alt="" width={20} height={20} />
                {game.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Last alert info */}
      {settings.last_alert_sent_at && (
        <p className="text-xs text-text-muted">
          Last alert sent:{' '}
          {new Date(settings.last_alert_sent_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm font-bold bg-text-primary text-ghost-white rounded-xl active:translate-y-0 transition-transform disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Settings'
          )}
        </button>
        <button
          onClick={handleTest}
          disabled={testing || !settings.webhook_url || !settings.enabled}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-accent-blue bg-accent-blue/10 rounded-xl hover:bg-accent-blue/20 transition-colors disabled:opacity-40"
        >
          {testing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Send size={14} />
              Test Alert
            </>
          )}
        </button>
      </div>
    </div>
  );
}
