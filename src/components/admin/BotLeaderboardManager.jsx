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
    spread_throughout_day: true,
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
          spread_throughout_day: data.config.spread_throughout_day,
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
      <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
        <div className="px-6 py-4 border-b-[3px] border-black dark:border-white">
          <div className="flex items-center gap-3">
            <Image src="/icons/ui/leaderboard.png" alt="" width={24} height={24} />
            <h3 className="text-lg font-bold text-text-primary">Bot Leaderboard Manager</h3>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Generate synthetic leaderboard entries to simulate more active players. Bot scores
            appear at random times throughout the day with realistic usernames and performance.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Message */}
          {message && (
            <div
              className={`px-4 py-3 rounded-lg border-[3px] ${
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

          {/* Enable/Disable Toggle */}
          <div className="bg-bg-card rounded-lg border-[2px] border-black dark:border-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-text-primary">Bot Generation</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Enable or disable automatic bot leaderboard entry generation
                </p>
              </div>
              <button
                onClick={() => handleInputChange('enabled', !formData.enabled)}
                className={`relative w-16 h-8 rounded-full border-[3px] border-black dark:border-white transition-colors ${
                  formData.enabled ? 'bg-accent-green' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full border-[2px] border-black dark:border-white transition-transform ${
                    formData.enabled ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div className="bg-bg-card rounded-lg border-[2px] border-black dark:border-white p-4 space-y-4">
            <h4 className="font-bold text-text-primary">General Settings</h4>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Carryover Bots (for streaks)
              </label>
              <input
                type="number"
                value={formData.carryover_bot_count}
                onChange={(e) => handleInputChange('carryover_bot_count', parseInt(e.target.value))}
                className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                min="0"
                max="50"
              />
              <p className="text-xs text-text-secondary mt-1">
                Number of bot usernames to reuse from the previous day to create realistic streaks
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="spread"
                checked={formData.spread_throughout_day}
                onChange={(e) => handleInputChange('spread_throughout_day', e.target.checked)}
                className="w-5 h-5 border-[3px] border-black dark:border-white rounded"
              />
              <label htmlFor="spread" className="text-sm font-medium text-text-primary">
                Spread scores throughout the day (vs. clustered at puzzle release)
              </label>
            </div>
          </div>

          {/* Score Ranges */}
          <div className="space-y-4">
            <h4 className="font-bold text-text-primary">Per-Game Settings</h4>

            {[
              { name: 'Daily Tandem', key: 'tandem', icon: '/icons/ui/tandem.png' },
              { name: 'Daily Mini', key: 'mini', icon: '/icons/ui/mini.png' },
              { name: 'Reel Connections', key: 'reel', icon: '/icons/ui/movie.png' },
              {
                name: 'Daily Alchemy',
                key: 'soup',
                icon: `/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`,
              },
            ].map((game) => (
              <div
                key={game.key}
                className="bg-bg-card rounded-lg border-[2px] border-black dark:border-white p-4"
              >
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
                      className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
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
                        className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
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
                        className="w-full px-3 py-2 border-[3px] border-black dark:border-white rounded-lg bg-bg-surface text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t-[3px] border-black dark:border-white">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-accent-blue text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !formData.enabled}
              className="px-6 py-3 bg-accent-green text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : 'Generate Now'}
            </button>
          </div>

          {/* Info */}
          <div className="bg-accent-yellow/20 border-[2px] border-accent-yellow rounded-lg p-4">
            <p className="text-sm text-text-primary">
              <strong>Note:</strong> Bot entries are automatically generated once daily at 2 AM UTC
              when enabled. Use &quot;Generate Now&quot; to manually trigger generation for
              today&apos;s puzzles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
