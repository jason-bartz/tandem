'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';

export default function BotLeaderboardManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    enabled: false,
    tandem_entries_per_day: 20,
    mini_entries_per_day: 20,
    reel_entries_per_day: 20,
    soup_entries_per_day: 20,
    carryover_bot_count: 5,
    tandem_min_score: 30,
    tandem_max_score: 150,
    cryptic_min_score: 45,
    cryptic_max_score: 400,
    mini_min_score: 25,
    mini_max_score: 180,
    reel_min_score: 25,
    reel_max_score: 300,
    soup_min_score: 65,
    soup_max_score: 400,
    releases_per_day: 6,
    first_release_hour: 6,
  });

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/bot-leaderboard/config', {
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          enabled: data.config.enabled,
          tandem_entries_per_day: data.config.tandem_entries_per_day,
          mini_entries_per_day: data.config.mini_entries_per_day,
          reel_entries_per_day: data.config.reel_entries_per_day,
          soup_entries_per_day: data.config.soup_entries_per_day || 20,
          carryover_bot_count: data.config.carryover_bot_count,
          tandem_min_score: data.config.tandem_min_score,
          tandem_max_score: data.config.tandem_max_score,
          cryptic_min_score: data.config.cryptic_min_score,
          cryptic_max_score: data.config.cryptic_max_score,
          mini_min_score: data.config.mini_min_score,
          mini_max_score: data.config.mini_max_score,
          reel_min_score: data.config.reel_min_score,
          reel_max_score: data.config.reel_max_score,
          soup_min_score: data.config.soup_min_score || 65,
          soup_max_score: data.config.soup_max_score || 400,
          releases_per_day: data.config.releases_per_day ?? 6,
          first_release_hour: data.config.first_release_hour ?? 6,
        });
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again at /admin/login', 'error');
      } else {
        showMessage('Failed to load configuration', 'error');
      }
    } catch (error) {
      logger.error('Error fetching bot config:', error);
      showMessage('Error loading configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/bot-leaderboard/config', {
        method: 'PUT',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showMessage('Configuration saved successfully', 'success');
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again at /admin/login', 'error');
      } else {
        const error = await response.json();
        showMessage(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      logger.error('Error saving bot config:', error);
      showMessage('Error saving configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/bot-leaderboard/generate', {
        method: 'POST',
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const summary = Object.entries(data.results || {})
            .map(([game, result]) => `${game}: ${result.generated} new`)
            .join(', ');
          showMessage(`Bot entries generated: ${summary}`, 'success');
        } else {
          showMessage(data.message || 'No entries generated', 'info');
        }
      } else if (response.status === 401) {
        showMessage('Authentication expired - please log in again at /admin/login', 'error');
      } else {
        const error = await response.json();
        showMessage(`Error: ${error.error}`, 'error');
      }
    } catch (error) {
      logger.error('Error generating bot entries:', error);
      showMessage('Error generating bot entries', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-surface rounded-lg">
        <div className="px-4 py-3 border-b border-border-light">
          <div className="flex items-center gap-3">
            <Image src="/ui/shared/leaderboard-admin.png" alt="" width={24} height={24} />
            <h3 className="text-lg font-bold text-text-primary">Leaderboards Manager</h3>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`px-4 py-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-accent-green/20 text-accent-green'
                  : message.type === 'error'
                    ? 'bg-accent-red/20 text-accent-red'
                    : 'bg-accent-blue/20 text-accent-blue'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="bg-bg-card rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-text-primary">Automatic Generation</h4>
              <button
                onClick={() => handleInputChange('enabled', !formData.enabled)}
                className={`relative w-14 h-7 rounded-full transition-colors flex-shrink-0 ${
                  formData.enabled ? 'bg-accent-green' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-bg-card rounded-full transition-transform ${
                    formData.enabled ? 'left-[calc(100%-22px)]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-bg-card rounded-lg p-4 space-y-4">
            <h4 className="font-bold text-text-primary">General Settings</h4>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Carryover Scores
              </label>
              <input
                type="number"
                value={formData.carryover_bot_count}
                onChange={(e) => handleInputChange('carryover_bot_count', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                min="0"
                max="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Releases Per Day
              </label>
              <input
                type="number"
                value={formData.releases_per_day}
                onChange={(e) =>
                  handleInputChange(
                    'releases_per_day',
                    Math.max(1, Math.min(12, parseInt(e.target.value) || 1))
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                min="1"
                max="12"
              />
              <p className="text-xs text-text-secondary mt-1">
                Number of waves bots are released in (1-12)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                First Release Hour (ET)
              </label>
              <input
                type="number"
                value={formData.first_release_hour}
                onChange={(e) =>
                  handleInputChange(
                    'first_release_hour',
                    Math.max(0, Math.min(23, parseInt(e.target.value) || 0))
                  )
                }
                className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                min="0"
                max="23"
              />
              <p className="text-xs text-text-secondary mt-1">
                Hour in Eastern Time when first wave releases (0-23)
              </p>
            </div>

            {/* Wave schedule preview */}
            <div className="bg-bg-surface rounded-lg p-3">
              <p className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">
                Release Schedule Preview (ET)
              </p>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const releases = Math.max(1, Math.min(12, formData.releases_per_day || 6));
                  const first = Math.max(0, Math.min(23, formData.first_release_hour ?? 6));
                  const hoursLeft = 24 - first;
                  const interval = hoursLeft / releases;
                  return Array.from({ length: releases }, (_, i) => {
                    const hour = first + i * interval;
                    const h = Math.floor(hour);
                    const m = Math.round((hour - h) * 60);
                    const period = h >= 12 ? 'PM' : 'AM';
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    return (
                      <span
                        key={i}
                        className="px-2 py-1 bg-accent-blue/10 text-accent-blue text-xs font-bold rounded-md"
                      >
                        {h12}:{m.toString().padStart(2, '0')} {period}
                      </span>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Score Ranges */}
          <div className="space-y-4">
            <h4 className="font-bold text-text-primary">Per-Game Settings</h4>

            {[
              { name: 'Daily Tandem', key: 'tandem', icon: '/ui/games/tandem.png' },
              { name: 'Daily Mini', key: 'mini', icon: '/ui/games/mini.png' },
              { name: 'Reel Connections', key: 'reel', icon: '/ui/games/movie.png' },
              {
                name: 'Daily Alchemy',
                key: 'soup',
                icon: `/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`,
              },
            ].map((game) => (
              <div key={game.key} className="bg-bg-card rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Image src={game.icon} alt="" width={20} height={20} />
                  <h5 className="font-bold text-text-primary">{game.name}</h5>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Entries Per Day
                    </label>
                    <input
                      type="number"
                      value={formData[`${game.key}_entries_per_day`]}
                      onChange={(e) =>
                        handleInputChange(`${game.key}_entries_per_day`, parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                      min="0"
                      max="100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Min Score (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData[`${game.key}_min_score`]}
                        onChange={(e) =>
                          handleInputChange(`${game.key}_min_score`, parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Max Score (seconds)
                      </label>
                      <input
                        type="number"
                        value={formData[`${game.key}_max_score`]}
                        onChange={(e) =>
                          handleInputChange(`${game.key}_max_score`, parseInt(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border-light">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 text-sm bg-accent-blue text-white font-bold rounded-md hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !formData.enabled}
              className="px-4 py-2.5 text-sm bg-accent-green text-white font-bold rounded-md hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating ? 'Running...' : 'Run Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
