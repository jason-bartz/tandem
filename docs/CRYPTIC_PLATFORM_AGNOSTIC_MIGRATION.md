# Daily Cryptic: Platform-Agnostic Storage Migration Plan

**Project:** Daily Cryptic Stats Migration
**Goal:** Match Tandem Daily's platform-agnostic storage approach (Preferences on iOS, localStorage on Web)
**Created:** January 2025
**Status:** Planning Phase

---

## Table of Contents
1. [Current State](#current-state)
2. [Target State](#target-state)
3. [Why This Migration](#why-this-migration)
4. [Migration Strategy](#migration-strategy)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Timeline](#timeline)

---

## Current State

### Daily Cryptic Storage (BEFORE Migration)

**Current Implementation:**
- ❌ **Hardcoded localStorage** calls in `crypticStorage.js`
- ❌ **Web-only** - Won't work properly on iOS native app
- ⚠️ **Inconsistent** with Tandem Daily's approach
- ⚠️ **No Capacitor Preferences** integration

**Current Code Pattern:**
```javascript
// src/lib/crypticStorage.js (Lines 14-54, 117-158)
export function saveCrypticGameState(state) {
  localStorage.setItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(state));
  // ❌ Direct localStorage call - doesn't work on iOS native
}

export function loadCrypticGameState() {
  const saved = localStorage.getItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
  // ❌ Direct localStorage call - doesn't work on iOS native
}

export function saveCrypticStats(stats) {
  localStorage.setItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));
  // ❌ Direct localStorage call - doesn't work on iOS native
}

export function loadCrypticStats() {
  const saved = localStorage.getItem(CRYPTIC_STORAGE_KEYS.STATS);
  // ❌ Direct localStorage call - doesn't work on iOS native
}
```

**Partial Async Implementation (Inconsistent):**
```javascript
// Lines 304-342 - Has async functions but only for native
export async function saveCrypticGameStateAsync(state) {
  if (Capacitor.isNativePlatform()) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: CRYPTIC_STORAGE_KEYS.CURRENT_GAME, value: JSON.stringify(state) });
  } else {
    saveCrypticGameState(state); // Falls back to sync localStorage
  }
}
```

**Problems:**
1. ⚠️ Main functions use direct `localStorage` (sync, web-only)
2. ⚠️ Async functions exist but aren't used consistently
3. ⚠️ Platform detection scattered throughout
4. ⚠️ Doesn't match Tandem's proven pattern

---

## Target State

### Daily Cryptic Storage (AFTER Migration)

**Match Tandem Daily's Pattern:**
```javascript
// Platform-agnostic storage helpers (like Tandem's storage.js)
async function getCrypticStorageItem(key) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

async function setCrypticStorageItem(key, value) {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

// All functions become async and platform-agnostic
export async function saveCrypticStats(stats) {
  await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));
}

export async function loadCrypticStats() {
  const saved = await getCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS);
  return saved ? JSON.parse(saved) : defaultStats;
}
```

---

## Why This Migration

### Benefits

**1. Platform Consistency ✅**
- Same storage mechanism as Tandem Daily
- One proven pattern across entire app
- Easier maintenance

**2. iOS Native Support ✅**
- Proper Capacitor Preferences on iOS
- Data persists correctly on iOS app
- No browser localStorage limitations

**3. Future CloudKit Readiness 🔮**
- Platform-agnostic layer makes adding CloudKit easier later
- Can follow same pattern as Tandem when ready
- Infrastructure in place for cross-device sync

**4. Code Consistency ✅**
- Match proven Tandem pattern
- Single source of truth for storage approach
- Reduce cognitive load for developers

**5. Better Error Handling ✅**
- Async/await allows proper error handling
- Try/catch blocks work correctly
- No silent failures

---

## Migration Strategy

### Approach: Gradual Migration with Backward Compatibility

**Phase 1: Add Platform-Agnostic Helpers**
- Add helper functions to `crypticStorage.js`
- Don't break existing code yet

**Phase 2: Migrate Functions One-by-One**
- Convert sync functions to async
- Update all callers
- Test thoroughly

**Phase 3: Update All Call Sites**
- Update `useCrypticGame.js`
- Update completion screens
- Update any other consumers

**Phase 4: Data Migration (For Existing Users)**
- Detect old localStorage data on iOS
- Migrate to Preferences automatically
- Ensure no data loss

**Phase 5: Cleanup**
- Remove old sync functions
- Remove `*Async` duplicates
- Clean up comments

---

## Implementation Plan

### Phase 1: Add Platform-Agnostic Storage Helpers (Day 1)

**File:** `src/lib/crypticStorage.js`

**Add at top of file (after imports):**
```javascript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Platform-agnostic storage helper - GET
 * Works on both iOS (Preferences) and Web (localStorage)
 */
async function getCrypticStorageItem(key) {
  if (typeof window === 'undefined') {
    return null; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  } else {
    return localStorage.getItem(key);
  }
}

/**
 * Platform-agnostic storage helper - SET
 * Works on both iOS (Preferences) and Web (localStorage)
 */
async function setCrypticStorageItem(key, value) {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.set({ key, value });
  } else {
    localStorage.setItem(key, value);
  }
}

/**
 * Platform-agnostic storage helper - REMOVE
 * Works on both iOS (Preferences) and Web (localStorage)
 */
async function removeCrypticStorageItem(key) {
  if (typeof window === 'undefined') {
    return; // SSR safety
  }

  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    await Preferences.remove({ key });
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Get all storage keys (for migration/debugging)
 */
async function getCrypticStorageKeys() {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const result = await Preferences.keys();
    return result.keys;
  } else {
    return Object.keys(localStorage);
  }
}
```

**Status:** ✅ Helpers added, no breaking changes

---

### Phase 2: Migrate Core Storage Functions (Day 1-2)

**2.1 Migrate Game State Functions**

**BEFORE:**
```javascript
export function saveCrypticGameState(state) {
  try {
    const stateToSave = { ...state, savedAt: new Date().toISOString() };
    localStorage.setItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(stateToSave));
    logger.info('[CrypticStorage] Game state saved');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save game state', { error: error.message });
  }
}

export function loadCrypticGameState() {
  try {
    const saved = localStorage.getItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    if (!saved) return null;
    const state = JSON.parse(saved);
    logger.info('[CrypticStorage] Game state loaded', { savedAt: state.savedAt });
    return state;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load game state', { error: error.message });
    return null;
  }
}

export function clearCrypticGameState() {
  try {
    localStorage.removeItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    logger.info('[CrypticStorage] Game state cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear game state', { error: error.message });
  }
}
```

**AFTER:**
```javascript
export async function saveCrypticGameState(state) {
  try {
    const stateToSave = { ...state, savedAt: new Date().toISOString() };
    await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME, JSON.stringify(stateToSave));
    logger.info('[CrypticStorage] Game state saved');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save game state', { error: error.message });
  }
}

export async function loadCrypticGameState() {
  try {
    const saved = await getCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    if (!saved) return null;
    const state = JSON.parse(saved);
    logger.info('[CrypticStorage] Game state loaded', { savedAt: state.savedAt });
    return state;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load game state', { error: error.message });
    return null;
  }
}

export async function clearCrypticGameState() {
  try {
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    logger.info('[CrypticStorage] Game state cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear game state', { error: error.message });
  }
}
```

**Changes:**
- ✅ Made async
- ✅ Use platform-agnostic helpers
- ✅ Same error handling
- ✅ Same logging

---

**2.2 Migrate Puzzle Progress Functions**

**BEFORE:**
```javascript
export function saveCrypticPuzzleProgress(date, progress) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const progressToSave = { ...progress, date, savedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(progressToSave));
    logger.info('[CrypticStorage] Puzzle progress saved', { date });
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save puzzle progress', { date, error: error.message });
  }
}

export function loadCrypticPuzzleProgress(date) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    const progress = JSON.parse(saved);
    logger.info('[CrypticStorage] Puzzle progress loaded', { date });
    return progress;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load puzzle progress', { date, error: error.message });
    return null;
  }
}
```

**AFTER:**
```javascript
export async function saveCrypticPuzzleProgress(date, progress) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const progressToSave = { ...progress, date, savedAt: new Date().toISOString() };
    await setCrypticStorageItem(key, JSON.stringify(progressToSave));
    logger.info('[CrypticStorage] Puzzle progress saved', { date });
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save puzzle progress', { date, error: error.message });
  }
}

export async function loadCrypticPuzzleProgress(date) {
  try {
    const key = `${CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS}${date}`;
    const saved = await getCrypticStorageItem(key);
    if (!saved) return null;
    const progress = JSON.parse(saved);
    logger.info('[CrypticStorage] Puzzle progress loaded', { date });
    return progress;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load puzzle progress', { date, error: error.message });
    return null;
  }
}
```

---

**2.3 Migrate Stats Functions**

**BEFORE:**
```javascript
export function saveCrypticStats(stats) {
  try {
    localStorage.setItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));
    logger.info('[CrypticStorage] Stats saved');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save stats', { error: error.message });
  }
}

export function loadCrypticStats() {
  try {
    const saved = localStorage.getItem(CRYPTIC_STORAGE_KEYS.STATS);
    if (!saved) {
      return defaultStats;
    }
    const stats = JSON.parse(saved);
    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load stats', { error: error.message });
    return defaultStats;
  }
}

export function updateCrypticStatsAfterCompletion(date, timeTaken, hintsUsed) {
  try {
    const stats = loadCrypticStats(); // ❌ Sync call
    // ... update logic ...
    saveCrypticStats(stats); // ❌ Sync call
    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to update stats', { error: error.message });
    return loadCrypticStats();
  }
}
```

**AFTER:**
```javascript
export async function saveCrypticStats(stats) {
  try {
    await setCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS, JSON.stringify(stats));
    logger.info('[CrypticStorage] Stats saved');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to save stats', { error: error.message });
  }
}

export async function loadCrypticStats() {
  try {
    const saved = await getCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS);
    if (!saved) {
      return defaultStats;
    }
    const stats = JSON.parse(saved);
    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to load stats', { error: error.message });
    return defaultStats;
  }
}

export async function updateCrypticStatsAfterCompletion(date, timeTaken, hintsUsed) {
  try {
    const stats = await loadCrypticStats(); // ✅ Async

    // Add to completed puzzles
    if (!stats.completedPuzzles) {
      stats.completedPuzzles = {};
    }
    stats.completedPuzzles[date] = {
      timeTaken,
      hintsUsed,
      completedAt: new Date().toISOString(),
    };

    // Update total completed
    stats.totalCompleted = Object.keys(stats.completedPuzzles).length;

    // Update perfect solves
    if (hintsUsed === 0) {
      stats.perfectSolves = (stats.perfectSolves || 0) + 1;
    }

    // Update total hints used
    stats.totalHintsUsed = (stats.totalHintsUsed || 0) + hintsUsed;

    // Calculate average time
    const times = Object.values(stats.completedPuzzles)
      .map((p) => p.timeTaken)
      .filter((t) => t && t > 0);
    if (times.length > 0) {
      stats.averageTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    }

    // Calculate current streak
    stats.currentStreak = calculateCrypticStreak(stats.completedPuzzles);
    stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);

    // Save last played date
    stats.lastPlayedDate = date;

    await saveCrypticStats(stats); // ✅ Async

    logger.info('[CrypticStorage] Stats updated after completion', {
      date,
      streak: stats.currentStreak,
      totalCompleted: stats.totalCompleted,
    });

    return stats;
  } catch (error) {
    logger.error('[CrypticStorage] Failed to update stats', { error: error.message });
    return await loadCrypticStats();
  }
}
```

---

**2.4 Migrate Utility Functions**

**BEFORE:**
```javascript
export function clearAllCrypticStorage() {
  try {
    localStorage.removeItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    localStorage.removeItem(CRYPTIC_STORAGE_KEYS.STATS);
    localStorage.removeItem(CRYPTIC_STORAGE_KEYS.STREAK);
    localStorage.removeItem(CRYPTIC_STORAGE_KEYS.LAST_PLAYED_DATE);

    const allKeys = Object.keys(localStorage);
    const progressKeys = allKeys.filter((key) =>
      key.startsWith(CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS)
    );
    progressKeys.forEach((key) => localStorage.removeItem(key));

    logger.info('[CrypticStorage] All cryptic storage cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear all storage', { error: error.message });
  }
}
```

**AFTER:**
```javascript
export async function clearAllCrypticStorage() {
  try {
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.CURRENT_GAME);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STATS);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.STREAK);
    await removeCrypticStorageItem(CRYPTIC_STORAGE_KEYS.LAST_PLAYED_DATE);

    const allKeys = await getCrypticStorageKeys();
    const progressKeys = allKeys.filter((key) =>
      key.startsWith(CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS)
    );

    for (const key of progressKeys) {
      await removeCrypticStorageItem(key);
    }

    logger.info('[CrypticStorage] All cryptic storage cleared');
  } catch (error) {
    logger.error('[CrypticStorage] Failed to clear all storage', { error: error.message });
  }
}
```

---

### Phase 3: Update All Call Sites (Day 2-3)

**3.1 Update useCrypticGame.js**

**Lines to Update:**
- Line 78: `saveCrypticGameState(...)` → Add `await`
- Line 108: `loadCrypticPuzzleProgress(...)` → Add `await`
- Line 109: `loadCrypticGameState()` → Add `await`
- Line 175: `saveCrypticPuzzleProgress(...)` → Add `await`
- Line 241: `saveCrypticPuzzleProgress(...)` → Add `await`
- Line 250: `updateCrypticStatsAfterCompletion(...)` → Add `await`
- Line 270: `clearCrypticGameState()` → Add `await`
- Line 359: `clearCrypticGameState()` → Add `await`

**Example Update:**
```javascript
// BEFORE
useEffect(() => {
  if (gameState === CRYPTIC_GAME_STATES.PLAYING && puzzle) {
    saveCrypticGameState({ /* ... */ }); // ❌ Fire and forget
  }
}, [userAnswer, hintsUsed, unlockedHints, attempts, elapsedTime]);

// AFTER
useEffect(() => {
  if (gameState === CRYPTIC_GAME_STATES.PLAYING && puzzle) {
    saveCrypticGameState({ /* ... */ }).catch((err) => {
      logger.error('[useCrypticGame] Failed to save game state', { error: err.message });
    }); // ✅ Async with error handling
  }
}, [userAnswer, hintsUsed, unlockedHints, attempts, elapsedTime]);
```

---

**3.2 Update CrypticCompleteScreen.jsx**

**If it loads stats directly:**
```javascript
// BEFORE (if exists)
const stats = loadCrypticStats();

// AFTER
const [stats, setStats] = useState(null);

useEffect(() => {
  loadCrypticStats().then(setStats);
}, []);
```

---

### Phase 4: Data Migration for Existing Users (Day 3)

**Add migration function to crypticStorage.js:**

```javascript
/**
 * Migrate localStorage data to Preferences on iOS
 * Called once on app startup for iOS users
 */
export async function migrateLocalStorageToPreferences() {
  const isNative = Capacitor.isNativePlatform();

  if (!isNative) {
    return; // Web users don't need migration
  }

  try {
    logger.info('[CrypticStorage] Starting iOS migration check');

    // Check if migration already done
    const migrationFlag = await getCrypticStorageItem('cryptic_migration_v1_done');
    if (migrationFlag === 'true') {
      logger.info('[CrypticStorage] Migration already completed');
      return;
    }

    // Migrate each key from localStorage to Preferences
    const keysToMigrate = [
      CRYPTIC_STORAGE_KEYS.CURRENT_GAME,
      CRYPTIC_STORAGE_KEYS.STATS,
      CRYPTIC_STORAGE_KEYS.STREAK,
      CRYPTIC_STORAGE_KEYS.LAST_PLAYED_DATE,
    ];

    let migratedCount = 0;

    for (const key of keysToMigrate) {
      const localData = localStorage.getItem(key);
      if (localData) {
        await Preferences.set({ key, value: localData });
        migratedCount++;
        logger.info(`[CrypticStorage] Migrated key: ${key}`);
      }
    }

    // Migrate puzzle progress keys
    const allLocalKeys = Object.keys(localStorage);
    const progressKeys = allLocalKeys.filter((key) =>
      key.startsWith(CRYPTIC_STORAGE_KEYS.PUZZLE_PROGRESS)
    );

    for (const key of progressKeys) {
      const localData = localStorage.getItem(key);
      if (localData) {
        await Preferences.set({ key, value: localData });
        migratedCount++;
      }
    }

    // Mark migration as complete
    await setCrypticStorageItem('cryptic_migration_v1_done', 'true');

    logger.info(`[CrypticStorage] Migration complete. Migrated ${migratedCount} keys.`);
  } catch (error) {
    logger.error('[CrypticStorage] Migration failed', { error: error.message });
    // Don't throw - gracefully degrade to current data
  }
}
```

**Call migration in useCrypticGame.js:**
```javascript
// In useCrypticGame hook, on mount
useEffect(() => {
  // Run migration first (only on iOS, only once)
  migrateLocalStorageToPreferences().then(() => {
    // Then load puzzle
    loadPuzzle();
  });

  return () => {
    // Cleanup timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, []);
```

---

### Phase 5: Remove Old Async Functions (Day 3)

**Remove these duplicate functions from crypticStorage.js:**

```javascript
// Lines 304-342 - DELETE THESE
export async function saveCrypticGameStateAsync(state) { /* ... */ }
export async function loadCrypticGameStateAsync() { /* ... */ }
```

**Why?** Main functions are now async, so `*Async` duplicates are redundant.

---

## Testing Strategy

### Unit Tests

**Test File:** `src/lib/__tests__/crypticStorage.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import {
  saveCrypticStats,
  loadCrypticStats,
  saveCrypticGameState,
  loadCrypticGameState,
  clearAllCrypticStorage,
} from '../crypticStorage';

describe('crypticStorage (Platform-Agnostic)', () => {
  beforeEach(() => {
    // Clear all storage
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Web Platform', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    });

    it('should save and load stats using localStorage', async () => {
      const stats = {
        totalCompleted: 10,
        currentStreak: 5,
        longestStreak: 8,
      };

      await saveCrypticStats(stats);
      const loaded = await loadCrypticStats();

      expect(loaded).toEqual(stats);
      expect(localStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      vi.spyOn(Preferences, 'get').mockResolvedValue({ value: null });
      vi.spyOn(Preferences, 'set').mockResolvedValue(undefined);
    });

    it('should save and load stats using Preferences', async () => {
      const stats = {
        totalCompleted: 10,
        currentStreak: 5,
        longestStreak: 8,
      };

      await saveCrypticStats(stats);
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'cryptic_stats',
        value: JSON.stringify(stats),
      });

      // Mock Preferences.get to return saved stats
      vi.spyOn(Preferences, 'get').mockResolvedValue({
        value: JSON.stringify(stats),
      });

      const loaded = await loadCrypticStats();
      expect(loaded).toEqual(stats);
    });
  });
});
```

---

### Manual Testing Checklist

**Web Testing:**
- [ ] Save cryptic stats, reload page, verify stats persist
- [ ] Complete a puzzle, verify stats update
- [ ] Clear browser data, verify stats reset correctly
- [ ] Test in Chrome, Safari, Firefox
- [ ] Test in incognito/private mode

**iOS Testing:**
- [ ] Save cryptic stats, kill app, reopen, verify stats persist
- [ ] Complete a puzzle, verify stats update
- [ ] Delete and reinstall app, verify clean state
- [ ] Test migration from old localStorage data
- [ ] Verify no duplicate data in localStorage + Preferences
- [ ] Test on iPhone, iPad

**Cross-Platform:**
- [ ] Verify same code paths on both platforms
- [ ] Check error handling on both platforms
- [ ] Verify logging works correctly
- [ ] Test offline functionality

---

## Rollback Plan

### If Migration Fails

**Step 1: Revert crypticStorage.js**
```bash
git checkout HEAD -- src/lib/crypticStorage.js
```

**Step 2: Revert useCrypticGame.js**
```bash
git checkout HEAD -- src/hooks/useCrypticGame.js
```

**Step 3: Clear any migrated Preferences data (iOS)**
```javascript
// Add to Settings > Developer Tools (hidden option)
async function clearMigratedCrypticData() {
  const keys = await Preferences.keys();
  for (const key of keys.keys) {
    if (key.startsWith('cryptic_')) {
      await Preferences.remove({ key });
    }
  }
}
```

**Step 4: Test on clean device**
- Verify old code works
- Verify no data corruption
- Document issues encountered

---

## Timeline

| Day | Phase | Tasks | Deliverable |
|-----|-------|-------|-------------|
| **Day 1** | Phase 1 | Add platform-agnostic helpers | Helpers added, tests pass |
| **Day 1** | Phase 2.1 | Migrate game state functions | 3 functions migrated |
| **Day 1** | Phase 2.2 | Migrate puzzle progress functions | 2 functions migrated |
| **Day 2** | Phase 2.3 | Migrate stats functions | 3 functions migrated |
| **Day 2** | Phase 2.4 | Migrate utility functions | 2 functions migrated |
| **Day 2** | Phase 3 | Update all call sites | useCrypticGame.js updated |
| **Day 3** | Phase 4 | Add data migration | iOS users migrated automatically |
| **Day 3** | Phase 5 | Cleanup old code | Remove duplicate `*Async` functions |
| **Day 3** | Testing | Full test suite | All tests pass |
| **Day 4** | QA | Manual testing | Verified on iOS + Web |

**Total Duration:** 4 days

---

## Success Metrics

### Technical Metrics
- ✅ All crypticStorage functions are async
- ✅ All functions use platform-agnostic helpers
- ✅ No direct localStorage calls remain
- ✅ iOS uses Capacitor Preferences
- ✅ Web uses localStorage
- ✅ Tests pass on both platforms

### User Metrics
- ✅ No data loss during migration
- ✅ Stats persist correctly on iOS
- ✅ Stats persist correctly on Web
- ✅ No performance regression
- ✅ Error rate stays < 0.1%

---

## Files Modified

### Modified Files
- ✅ `src/lib/crypticStorage.js` - Add helpers, migrate all functions
- ✅ `src/hooks/useCrypticGame.js` - Add await to all storage calls
- ⚠️ `src/components/cryptic/CrypticCompleteScreen.jsx` - If loads stats directly

### New Files
- ✅ `src/lib/__tests__/crypticStorage.test.js` - Unit tests
- ✅ `docs/CRYPTIC_PLATFORM_AGNOSTIC_MIGRATION.md` - This document

### No Changes Required
- ✅ `src/services/cryptic.service.js` - Already uses async/await
- ✅ `src/app/api/cryptic/stats/route.js` - Server-side, no changes needed
- ✅ Supabase migrations - No database changes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | High | Extensive testing, keep old data |
| iOS Preferences API failure | Low | Medium | Fallback to localStorage |
| Performance regression | Low | Low | Async operations are fast |
| Breaking existing flows | Medium | High | Thorough testing, staged rollout |
| User complaints | Low | Medium | Clear communication, rollback ready |

---

## Communication Plan

### Internal Team
- 📢 Announce migration plan in team Slack
- 📋 Share this document for review
- 🎯 Schedule code review before merging
- 🧪 QA testing before production

### Users
- ℹ️ No user-facing changes
- ℹ️ Transparent migration (happens automatically)
- ℹ️ No action required from users
- ⚠️ If issues: Rollback immediately, notify users

---

## Next Steps After Migration

### Optional Future Enhancements

**1. Add CloudKit Sync for Cryptic (Match Tandem)**
- Use same CloudKit service
- Sync cryptic stats across devices
- Merge conflicts like Tandem does

**2. Unified Stats Service**
- Single service for both games
- Consistent API
- Shared infrastructure

**3. Server-Side Sync Improvements**
- Real-time sync with Supabase
- Conflict resolution
- Offline queue

---

## Approval & Sign-Off

### Technical Review
- [ ] Code review completed
- [ ] Tests written and passing
- [ ] Performance benchmarks acceptable
- [ ] Security review (data migration safety)

### QA Testing
- [ ] Manual testing on iOS completed
- [ ] Manual testing on Web completed
- [ ] Migration testing with real data
- [ ] Rollback plan tested

### Deployment Approval
- [ ] Product Owner approval
- [ ] Engineering Lead approval
- [ ] Ready for production

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Next Review:** After Phase 3 completion
