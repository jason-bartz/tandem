/**
 * ConflictResolver - Smart conflict resolution for stats sync
 *
 * Implements various conflict resolution strategies including vector clocks,
 * last-write-wins, and intelligent merging based on field semantics.
 *
 * Following Apple HIG and professional game development standards.
 */

export class ConflictResolver {
  constructor() {
    // Field-specific resolution strategies
    this.fieldStrategies = {
      // Monotonically increasing fields - take maximum
      gamesPlayed: 'maximum',
      gamesWon: 'maximum',
      totalTime: 'maximum',
      totalMistakes: 'maximum',
      hintsUsed: 'maximum',
      puzzlesCompleted: 'union',

      // Streak fields - require special handling
      currentStreak: 'mostRecent',
      bestStreak: 'maximum',
      lastPlayedDate: 'mostRecent',
      lastStreakDate: 'mostRecent',

      // Achievements - union of all
      achievements: 'union',

      // Computed fields - recalculate
      winRate: 'compute',
      averageTime: 'compute',
      averageMistakes: 'compute',

      // Daily/weekly/monthly stats - merge
      dailyStats: 'merge',
      weeklyStats: 'merge',
      monthlyStats: 'merge',
    };

    // Vector clock for distributed consistency
    this.vectorClock = new Map();
  }

  /**
   * Detect conflicts between two stats objects
   */
  detectConflicts(stats1, stats2) {
    const conflicts = [];

    for (const field of Object.keys(this.fieldStrategies)) {
      if (field in stats1 && field in stats2) {
        if (this.hasConflict(stats1[field], stats2[field], field)) {
          conflicts.push({
            field,
            value1: stats1[field],
            value2: stats2[field],
            strategy: this.fieldStrategies[field],
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two values have a conflict
   */
  hasConflict(value1, value2, field) {
    // No conflict if values are identical
    if (value1 === value2) return false;

    // Arrays - check deep equality
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return !this.arraysEqual(value1, value2);
    }

    // Objects - check deep equality
    if (typeof value1 === 'object' && typeof value2 === 'object') {
      return !this.objectsEqual(value1, value2);
    }

    // Special handling for streak fields
    if (field === 'currentStreak') {
      // Need to check dates to determine real conflict
      return this.hasStreakConflict(value1, value2);
    }

    // Different primitive values = conflict
    return true;
  }

  /**
   * Check for streak conflict
   */
  hasStreakConflict(streak1, streak2) {
    // If both are 0, no conflict
    if (streak1 === 0 && streak2 === 0) return false;

    // If values differ, there's a conflict
    return streak1 !== streak2;
  }

  /**
   * Resolve conflicts between multiple sources
   */
  resolve(sources, options = {}) {
    const { strategy = 'smart', priorities = {} } = options;

    switch (strategy) {
      case 'smart':
        return this.smartMerge(sources, priorities);

      case 'lastWriteWins':
        return this.lastWriteWins(sources);

      case 'firstWriteWins':
        return this.firstWriteWins(sources);

      case 'highestValueWins':
        return this.highestValueWins(sources);

      case 'vectorClock':
        return this.vectorClockMerge(sources);

      default:
        return this.smartMerge(sources, priorities);
    }
  }

  /**
   * Smart merge - field-specific resolution
   */
  smartMerge(sources, _priorities) {
    const result = {
      stats: {},
      events: [],
    };

    // Get all unique fields
    const allFields = new Set();
    for (const source of Object.values(sources)) {
      if (source && source.stats) {
        Object.keys(source.stats).forEach((field) => allFields.add(field));
      }
    }

    // Resolve each field
    for (const field of allFields) {
      const values = this.collectFieldValues(sources, field);

      if (values.length === 0) continue;

      const strategy = this.fieldStrategies[field] || 'mostRecent';
      result.stats[field] = this.resolveField(field, values, strategy, sources);
    }

    // Merge events
    const allEvents = [];
    for (const source of Object.values(sources)) {
      if (source && source.events) {
        allEvents.push(...source.events);
      }
    }

    // Deduplicate events
    result.events = this.deduplicateEvents(allEvents);

    // Recompute derived fields
    this.recomputeDerivedFields(result.stats);

    return result;
  }

  /**
   * Collect all values for a field from sources
   */
  collectFieldValues(sources, field) {
    const values = [];

    for (const [sourceName, source] of Object.entries(sources)) {
      if (source && source.stats && field in source.stats) {
        values.push({
          source: sourceName,
          value: source.stats[field],
          timestamp: source.timestamp || new Date().toISOString(),
        });
      }
    }

    return values;
  }

  /**
   * Resolve a single field based on strategy
   */
  resolveField(field, values, strategy, _sources) {
    switch (strategy) {
      case 'maximum':
        return Math.max(...values.map((v) => Number(v.value) || 0));

      case 'minimum':
        return Math.min(...values.map((v) => Number(v.value) || 0));

      case 'sum':
        return values.reduce((sum, v) => sum + (Number(v.value) || 0), 0);

      case 'average':
        const sum = values.reduce((s, v) => s + (Number(v.value) || 0), 0);
        return sum / values.length;

      case 'mostRecent':
        // Sort by timestamp and take the most recent
        values.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return values[0].value;

      case 'union':
        // For arrays - combine all unique values
        if (Array.isArray(values[0].value)) {
          const union = new Set();
          values.forEach((v) => {
            if (Array.isArray(v.value)) {
              v.value.forEach((item) => union.add(JSON.stringify(item)));
            }
          });
          return Array.from(union).map((item) => JSON.parse(item));
        }
        return values[0].value;

      case 'merge':
        // For objects - deep merge
        if (typeof values[0].value === 'object' && !Array.isArray(values[0].value)) {
          return this.deepMerge(...values.map((v) => v.value));
        }
        return values[0].value;

      case 'compute':
        // Will be recomputed later
        return null;

      default:
        // Default to most recent
        values.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return values[0].value;
    }
  }

  /**
   * Last write wins resolution
   */
  lastWriteWins(sources) {
    let mostRecent = null;
    let mostRecentTime = 0;

    for (const source of Object.values(sources)) {
      if (source && source.timestamp) {
        const time = new Date(source.timestamp).getTime();
        if (time > mostRecentTime) {
          mostRecentTime = time;
          mostRecent = source;
        }
      }
    }

    return mostRecent || sources.local || {};
  }

  /**
   * First write wins resolution
   */
  firstWriteWins(sources) {
    let oldest = null;
    let oldestTime = Infinity;

    for (const source of Object.values(sources)) {
      if (source && source.timestamp) {
        const time = new Date(source.timestamp).getTime();
        if (time < oldestTime) {
          oldestTime = time;
          oldest = source;
        }
      }
    }

    return oldest || sources.local || {};
  }

  /**
   * Highest value wins resolution
   */
  highestValueWins(sources) {
    const result = {
      stats: {},
      events: [],
    };

    // For each numeric field, take the highest value
    const allFields = new Set();
    for (const source of Object.values(sources)) {
      if (source && source.stats) {
        Object.keys(source.stats).forEach((field) => allFields.add(field));
      }
    }

    for (const field of allFields) {
      let maxValue = -Infinity;

      for (const source of Object.values(sources)) {
        if (source && source.stats && field in source.stats) {
          const value = Number(source.stats[field]);
          if (!isNaN(value) && value > maxValue) {
            maxValue = value;
            result.stats[field] = source.stats[field];
          }
        }
      }

      // For non-numeric fields, use most recent
      if (maxValue === -Infinity) {
        const values = this.collectFieldValues(sources, field);
        if (values.length > 0) {
          values.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          result.stats[field] = values[0].value;
        }
      }
    }

    // Merge all events
    for (const source of Object.values(sources)) {
      if (source && source.events) {
        result.events.push(...source.events);
      }
    }

    result.events = this.deduplicateEvents(result.events);

    return result;
  }

  /**
   * Vector clock based merge
   */
  vectorClockMerge(sources) {
    for (const sourceName of Object.keys(sources)) {
      if (!this.vectorClock.has(sourceName)) {
        this.vectorClock.set(sourceName, 0);
      }
    }

    // Determine causal ordering
    const ordered = this.orderByVectorClock(sources);

    // Merge in causal order
    const result = {
      stats: {},
      events: [],
    };

    for (const source of ordered) {
      // Merge stats
      if (source.stats) {
        result.stats = { ...result.stats, ...source.stats };
      }

      // Merge events
      if (source.events) {
        result.events.push(...source.events);
      }

      this.updateVectorClock(source.sourceName);
    }

    result.events = this.deduplicateEvents(result.events);

    return result;
  }

  /**
   * Order sources by vector clock
   */
  orderByVectorClock(sources) {
    const sourceArray = Object.entries(sources).map(([name, data]) => ({
      sourceName: name,
      ...data,
      clock: this.vectorClock.get(name) || 0,
    }));

    // Sort by vector clock value
    sourceArray.sort((a, b) => a.clock - b.clock);

    return sourceArray;
  }

  /**
   * Update vector clock
   */
  updateVectorClock(sourceName) {
    const current = this.vectorClock.get(sourceName) || 0;
    this.vectorClock.set(sourceName, current + 1);
  }

  /**
   * Recompute derived fields
   */
  recomputeDerivedFields(stats) {
    // Recompute win rate
    if (stats.gamesPlayed > 0) {
      stats.winRate = (stats.gamesWon / stats.gamesPlayed) * 100;
      stats.averageTime = stats.totalTime / stats.gamesPlayed;
      stats.averageMistakes = stats.totalMistakes / stats.gamesPlayed;
    } else {
      stats.winRate = 0;
      stats.averageTime = 0;
      stats.averageMistakes = 0;
    }

    stats.gamesWon = Math.min(stats.gamesWon, stats.gamesPlayed);
    stats.currentStreak = Math.min(stats.currentStreak, stats.gamesPlayed);
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  }

  /**
   * Deduplicate events by ID
   */
  deduplicateEvents(events) {
    const seen = new Set();
    const unique = [];

    for (const event of events) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        unique.push(event);
      }
    }

    // Sort by timestamp
    unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return unique;
  }

  /**
   * Deep merge objects
   */
  deepMerge(...objects) {
    const result = {};

    for (const obj of objects) {
      if (!obj) continue;

      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;

        if (typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.deepMerge(result[key] || {}, value);
        } else if (Array.isArray(value)) {
          // For arrays, combine unique values
          if (!result[key]) result[key] = [];
          const combined = [...result[key], ...value];
          result[key] = Array.from(new Set(combined.map(JSON.stringify))).map(JSON.parse);
        } else {
          // For primitives, take the maximum (for numeric) or latest
          if (typeof value === 'number' && typeof result[key] === 'number') {
            result[key] = Math.max(result[key], value);
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Check array equality
   */
  arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    // Sort and compare
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();

    return sorted1.every((val, index) => val === sorted2[index]);
  }

  /**
   * Check object equality
   */
  objectsEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;

      const val1 = obj1[key];
      const val2 = obj2[key];

      if (typeof val1 === 'object' && typeof val2 === 'object') {
        if (!this.objectsEqual(val1, val2)) return false;
      } else if (val1 !== val2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate conflict report for debugging
   */
  generateConflictReport(sources) {
    const conflicts = [];

    // Compare all source pairs
    const sourceNames = Object.keys(sources);

    for (let i = 0; i < sourceNames.length - 1; i++) {
      for (let j = i + 1; j < sourceNames.length; j++) {
        const source1 = sources[sourceNames[i]];
        const source2 = sources[sourceNames[j]];

        if (source1 && source1.stats && source2 && source2.stats) {
          const fieldConflicts = this.detectConflicts(source1.stats, source2.stats);

          if (fieldConflicts.length > 0) {
            conflicts.push({
              sources: [sourceNames[i], sourceNames[j]],
              conflicts: fieldConflicts,
            });
          }
        }
      }
    }

    return {
      totalConflicts: conflicts.length,
      conflicts,
      timestamp: new Date().toISOString(),
    };
  }
}

export default ConflictResolver;
