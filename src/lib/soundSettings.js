// Granular sound settings management
// Provides per-category sound controls and volume

const SOUND_SETTINGS_KEY = 'tandemSoundSettings';

const DEFAULT_SETTINGS = {
  masterEnabled: true,
  sfxEnabled: true,
  keypressEnabled: true,
  volume: 0.7, // 0-1 scale, maps to gain multiplier
};

let cachedSettings = null;

export function getSoundSettings() {
  if (cachedSettings) return cachedSettings;

  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };

  try {
    const saved = localStorage.getItem(SOUND_SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      // Migrate from old boolean toggle
      const oldSound = localStorage.getItem('tandemSound');
      cachedSettings = {
        ...DEFAULT_SETTINGS,
        masterEnabled: oldSound !== 'false',
      };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }

  return cachedSettings;
}

export function updateSoundSettings(updates) {
  const current = getSoundSettings();
  const next = { ...current, ...updates };
  cachedSettings = next;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(next));
      // Keep old key in sync for backward compat with isSoundEnabled() checks
      localStorage.setItem('tandemSound', next.masterEnabled.toString());
    } catch {
      // QuotaExceededError - localStorage is full; settings still apply in-memory
    }
  }

  return next;
}

// Returns the effective gain multiplier (0-1) for a given category
export function getVolumeFor(category) {
  const s = getSoundSettings();
  if (!s.masterEnabled) return 0;

  switch (category) {
    case 'sfx':
      return s.sfxEnabled ? s.volume : 0;
    case 'keypress':
      return s.keypressEnabled ? s.volume * 0.6 : 0;
    default:
      return s.volume;
  }
}

export function resetSoundSettings() {
  cachedSettings = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SOUND_SETTINGS_KEY);
  }
}
