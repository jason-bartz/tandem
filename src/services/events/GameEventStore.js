/**
 * GameEventStore - Event Sourcing System for Tandem
 *
 * This implements an event-driven architecture where all game actions are stored
 * as immutable events. Stats are computed from these events rather than stored directly.
 * This provides a complete audit trail and natural conflict resolution.
 *
 * Following Apple HIG and professional game development standards.
 */

import { v4 as uuidv4 } from 'uuid';

// Event types enumeration
export const EventTypes = {
  // Game events
  GAME_STARTED: 'GAME_STARTED',
  GAME_COMPLETED: 'GAME_COMPLETED',
  GAME_ABANDONED: 'GAME_ABANDONED',

  // Puzzle events
  WORD_GUESSED: 'WORD_GUESSED',
  HINT_USED: 'HINT_USED',
  MISTAKE_MADE: 'MISTAKE_MADE',

  // Streak events
  STREAK_CONTINUED: 'STREAK_CONTINUED',
  STREAK_BROKEN: 'STREAK_BROKEN',
  STREAK_RESTORED: 'STREAK_RESTORED',

  // Achievement events
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  MILESTONE_REACHED: 'MILESTONE_REACHED',

  // Sync events
  SYNC_STARTED: 'SYNC_STARTED',
  SYNC_COMPLETED: 'SYNC_COMPLETED',
  SYNC_FAILED: 'SYNC_FAILED',
  CONFLICT_RESOLVED: 'CONFLICT_RESOLVED',

  // Migration events
  STATS_MIGRATED: 'STATS_MIGRATED',
  LEGACY_DATA_IMPORTED: 'LEGACY_DATA_IMPORTED',
};

// Event schema validation
const EventSchema = {
  id: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: Object.values(EventTypes) },
  timestamp: { type: 'string', required: true, format: 'iso8601' },
  deviceId: { type: 'string', required: true },
  userId: { type: 'string', required: false },
  sessionId: { type: 'string', required: true },
  version: { type: 'number', required: true },
  data: { type: 'object', required: true },
  metadata: { type: 'object', required: false },
};

class GameEventStore {
  constructor() {
    this.events = [];
    this.eventHandlers = new Map();
    this.subscribers = new Set();
    this.version = 1;
    this.isInitialized = false;
  }

  /**
   * Initialize the event store
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load persisted events
      await this.loadEvents();

      // Register default event handlers
      this.registerDefaultHandlers();

      // Start event processing
      this.startEventProcessor();

      this.isInitialized = true;
      console.log('[GameEventStore] Initialized with', this.events.length, 'events');
    } catch (error) {
      console.error('[GameEventStore] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create and store a new event
   */
  async createEvent(type, data, metadata = {}) {
    // Validate event type
    if (!EventTypes[type]) {
      throw new Error(`Invalid event type: ${type}`);
    }

    const event = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      deviceId: await this.getDeviceId(),
      userId: await this.getUserId(),
      sessionId: this.getSessionId(),
      version: this.version,
      data: { ...data },
      metadata: {
        ...metadata,
        appVersion: this.getAppVersion(),
        platform: this.getPlatform(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    };

    // Validate event schema
    this.validateEvent(event);

    // Store event
    this.events.push(event);

    // Process event
    await this.processEvent(event);

    // Notify subscribers
    this.notifySubscribers(event);

    // Persist event
    await this.persistEvent(event);

    return event;
  }

  /**
   * Validate event against schema
   */
  validateEvent(event) {
    for (const [field, rules] of Object.entries(EventSchema)) {
      if (rules.required && !event[field]) {
        throw new Error(`Missing required field: ${field}`);
      }

      if (rules.enum && !rules.enum.includes(event[field])) {
        throw new Error(`Invalid value for ${field}: ${event[field]}`);
      }

      // Skip type checking for null/undefined values on non-required fields
      if (
        rules.type &&
        typeof event[field] !== rules.type &&
        event[field] !== undefined &&
        event[field] !== null
      ) {
        throw new Error(`Invalid type for ${field}: expected ${rules.type}`);
      }
    }

    return true;
  }

  /**
   * Process an event through registered handlers
   */
  async processEvent(event) {
    const handlers = this.eventHandlers.get(event.type) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[GameEventStore] Handler failed for ${event.type}:`, error);
        // Continue processing other handlers
      }
    }
  }

  /**
   * Register an event handler
   */
  registerHandler(eventType, handler) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType).push(handler);
  }

  /**
   * Register default event handlers
   */
  registerDefaultHandlers() {
    // Game completion handler
    this.registerHandler(EventTypes.GAME_COMPLETED, async (event) => {
      // Check for streak continuation
      if (event.data.won && event.data.puzzleDate) {
        await this.checkStreakContinuation(event.data.puzzleDate);
      }

      // Check for achievements
      await this.checkAchievements(event);
    });

    // Sync failure handler
    this.registerHandler(EventTypes.SYNC_FAILED, async (event) => {
      // Queue for retry
      await this.queueForRetry(event);
    });
  }

  /**
   * Compute stats from events
   */
  computeStats(events = this.events, untilTimestamp = null) {
    const relevantEvents = untilTimestamp
      ? events.filter((e) => new Date(e.timestamp) <= new Date(untilTimestamp))
      : events;

    const stats = {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalTime: 0,
      totalMistakes: 0,
      hintsUsed: 0,
      achievements: [],
      lastPlayedDate: null,
      lastStreakDate: null,
      winRate: 0,
      averageTime: 0,
      averageMistakes: 0,
      puzzlesCompleted: new Set(),
      dailyStats: {},
      weeklyStats: {},
      monthlyStats: {},
    };

    // Process events chronologically
    const sortedEvents = [...relevantEvents].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    let currentStreakValue = 0;

    for (const event of sortedEvents) {
      switch (event.type) {
        case EventTypes.GAME_COMPLETED:
          stats.gamesPlayed++;

          if (event.data.won) {
            stats.gamesWon++;
            stats.puzzlesCompleted.add(event.data.puzzleDate);
          }

          if (event.data.time) {
            stats.totalTime += event.data.time;
          }

          if (event.data.mistakes !== undefined) {
            stats.totalMistakes += event.data.mistakes;
          }

          stats.lastPlayedDate = event.data.puzzleDate || event.timestamp;

          // Update daily stats
          this.updateDailyStats(stats, event);
          break;

        case EventTypes.STREAK_CONTINUED:
          currentStreakValue = event.data.streak;
          stats.currentStreak = currentStreakValue;
          stats.bestStreak = Math.max(stats.bestStreak, currentStreakValue);
          stats.lastStreakDate = event.data.date;
          break;

        case EventTypes.STREAK_BROKEN:
          currentStreakValue = 0;
          stats.currentStreak = 0;
          break;

        case EventTypes.STREAK_RESTORED:
          currentStreakValue = event.data.streak;
          stats.currentStreak = currentStreakValue;
          stats.bestStreak = Math.max(stats.bestStreak, currentStreakValue);
          break;

        case EventTypes.HINT_USED:
          stats.hintsUsed++;
          break;

        case EventTypes.ACHIEVEMENT_UNLOCKED:
          if (!stats.achievements.includes(event.data.achievementId)) {
            stats.achievements.push(event.data.achievementId);
          }
          break;

        case EventTypes.STATS_MIGRATED:
          // Handle migrated stats
          if (event.data.stats) {
            Object.assign(stats, event.data.stats);
          }
          break;
      }
    }

    // Calculate derived stats
    if (stats.gamesPlayed > 0) {
      stats.winRate = (stats.gamesWon / stats.gamesPlayed) * 100;
      stats.averageTime = stats.totalTime / stats.gamesPlayed;
      stats.averageMistakes = stats.totalMistakes / stats.gamesPlayed;
    }

    // Convert Set to Array for serialization
    stats.puzzlesCompleted = Array.from(stats.puzzlesCompleted);

    return stats;
  }

  /**
   * Update daily stats
   */
  updateDailyStats(stats, event) {
    const date = event.data.puzzleDate || event.timestamp.split('T')[0];

    if (!stats.dailyStats[date]) {
      stats.dailyStats[date] = {
        played: 0,
        won: 0,
        time: 0,
        mistakes: 0,
      };
    }

    stats.dailyStats[date].played++;

    if (event.data.won) {
      stats.dailyStats[date].won++;
    }

    if (event.data.time) {
      stats.dailyStats[date].time += event.data.time;
    }

    if (event.data.mistakes !== undefined) {
      stats.dailyStats[date].mistakes += event.data.mistakes;
    }
  }

  /**
   * Get events within a time range
   */
  getEventsByTimeRange(startTime, endTime) {
    return this.events.filter((event) => {
      const eventTime = new Date(event.timestamp);
      return eventTime >= new Date(startTime) && eventTime <= new Date(endTime);
    });
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.events.filter((event) => event.type === type);
  }

  /**
   * Deduplicate events (remove duplicates based on ID)
   */
  deduplicateEvents(events) {
    const seen = new Set();
    return events.filter((event) => {
      if (seen.has(event.id)) {
        return false;
      }
      seen.add(event.id);
      return true;
    });
  }

  /**
   * Merge events from multiple sources
   */
  mergeEvents(localEvents, remoteEvents) {
    const allEvents = [...localEvents, ...remoteEvents];
    const deduplicated = this.deduplicateEvents(allEvents);

    // Sort by timestamp
    return deduplicated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Subscribe to event notifications
   */
  subscribe(callback) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of an event
   */
  notifySubscribers(event) {
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (error) {
        console.error('[GameEventStore] Subscriber notification failed:', error);
      }
    }
  }

  /**
   * Load events from storage
   */
  async loadEvents() {
    try {
      const stored = localStorage.getItem('gameEvents');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.events = parsed.events || [];
        this.version = parsed.version || 1;
      }
    } catch (error) {
      console.error('[GameEventStore] Failed to load events:', error);
      this.events = [];
    }
  }

  /**
   * Persist event to storage
   */
  async persistEvent(event) {
    try {
      const stored = {
        events: this.events,
        version: this.version,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem('gameEvents', JSON.stringify(stored));

      // Also queue for cloud sync
      await this.queueForSync(event);
    } catch (error) {
      console.error('[GameEventStore] Failed to persist event:', error);
    }
  }

  /**
   * Queue event for cloud sync
   */
  async queueForSync(event) {
    // This will be implemented with the sync manager
    // For now, just log
    console.log('[GameEventStore] Event queued for sync:', event.id);
  }

  /**
   * Export events for backup
   */
  exportEvents() {
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      deviceId: this.getDeviceId(),
      events: this.events,
      stats: this.computeStats(),
    };
  }

  /**
   * Import events from backup
   */
  async importEvents(backup) {
    if (backup.version > this.version) {
      console.warn('[GameEventStore] Importing newer version:', backup.version);
    }

    // Merge with existing events
    const merged = this.mergeEvents(this.events, backup.events);

    this.events = merged;
    this.version = Math.max(this.version, backup.version);

    // Persist the merged events
    await this.persistEvent(null);

    return {
      imported: backup.events.length,
      total: this.events.length,
    };
  }

  /**
   * Start event processor
   */
  startEventProcessor() {
    // Process queued events every 30 seconds
    setInterval(() => {
      this.processQueuedEvents();
    }, 30000);
  }

  /**
   * Process queued events
   */
  async processQueuedEvents() {
    // This will be implemented with the sync manager
    console.log('[GameEventStore] Processing queued events...');
  }

  /**
   * Check for streak continuation
   */
  async checkStreakContinuation(puzzleDate) {
    // This will be implemented with the streak manager
    console.log('[GameEventStore] Checking streak for:', puzzleDate);
  }

  /**
   * Check for achievements
   */
  async checkAchievements(event) {
    // This will be implemented with the achievements manager
    console.log('[GameEventStore] Checking achievements for:', event.type);
  }

  /**
   * Queue failed event for retry
   */
  async queueForRetry(event) {
    // This will be implemented with the retry manager
    console.log('[GameEventStore] Queueing for retry:', event.id);
  }

  /**
   * Helper methods
   */
  async getDeviceId() {
    // Get from Capacitor Device API
    if (window.Capacitor && window.Capacitor.Plugins.Device) {
      const info = await window.Capacitor.Plugins.Device.getId();
      return info.identifier;
    }

    // Fallback to stored ID
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `web-${uuidv4()}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  async getUserId() {
    // Get from auth service when available
    return localStorage.getItem('userId') || null;
  }

  getSessionId() {
    // Get or create session ID
    if (!this.sessionId) {
      this.sessionId = uuidv4();
    }
    return this.sessionId;
  }

  getAppVersion() {
    return process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
  }

  getPlatform() {
    if (window.Capacitor) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  /**
   * Clear all events (use with caution!)
   */
  async clearAllEvents() {
    this.events = [];
    localStorage.removeItem('gameEvents');
    console.warn('[GameEventStore] All events cleared');
  }
}

// Export singleton instance
export const gameEventStore = new GameEventStore();
export default GameEventStore;
