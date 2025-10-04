# Next Steps: Complete User-Timezone Puzzle System Implementation

## Context

### ✅ Completed: Backend Infrastructure (Phases 1-3)

The core puzzle number system has been successfully implemented and deployed:

- **Puzzle Number Utilities** ([src/lib/puzzleNumber.js](src/lib/puzzleNumber.js))
  - `getCurrentPuzzleNumber()` - calculates current puzzle based on user's local timezone
  - `getDateForPuzzleNumber()` - converts puzzle number to date
  - `getPuzzleNumberForDate()` - converts date to puzzle number
  - `getDisplayDate()` - formats date for display in user's locale

- **Database Layer** ([src/lib/db.js](src/lib/db.js))
  - `getPuzzle(identifier)` - unified function supporting both dates and puzzle numbers
  - Backward compatible with existing date-based queries

- **API Routes**
  - [/api/puzzle/route.js](src/app/api/puzzle/route.js) - accepts `?number=N` or `?date=YYYY-MM-DD`
  - [/api/puzzles/archive/route.js](src/app/api/puzzles/archive/route.js) - NEW number-based archive endpoint

- **Platform Service** ([src/services/platform.js](src/services/platform.js))
  - Updated `fetchPuzzle()` to use puzzle numbers
  - Maintains backward compatibility with dates

### 📋 Remaining: UI Layer & Bug Fixes (Phases 4-6)

The frontend components need to be updated to use the new puzzle number system and fix the reported iOS freeze issues.

---

## Phase 4: Fix Subscription & Paywall Issues

### Task 4.1: Update Subscription Access Logic

**File**: [src/services/subscriptionService.js](src/services/subscriptionService.js)

**Current Issue**: Uses date-based "last 5 days" logic, which doesn't align with user-timezone puzzle numbers.

**Changes Needed**:

```javascript
// REPLACE the current canAccessPuzzle method

// ❌ OLD - Date-based (remove this)
canAccessPuzzle(puzzleDate) {
  const isSubscribed = this.isSubscribed();
  if (isSubscribed) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const puzzle = new Date(puzzleDate + 'T00:00:00');
  puzzle.setHours(0, 0, 0, 0);
  const daysDiff = Math.floor((today - puzzle) / (1000 * 60 * 60 * 24));

  return daysDiff <= 5; // Today + last 5 days
}

// ✅ NEW - Puzzle number-based (use this)
canAccessPuzzle(identifier) {
  const isSubscribed = this.isSubscribed();
  if (isSubscribed) return true;

  // Convert identifier to puzzle number if needed
  let puzzleNumber;
  if (typeof identifier === 'number') {
    puzzleNumber = identifier;
  } else if (/^\d+$/.test(identifier)) {
    puzzleNumber = parseInt(identifier);
  } else {
    // If date string provided, convert to number
    puzzleNumber = getPuzzleNumberForDate(identifier);
  }

  const currentNumber = getCurrentPuzzleNumber();

  // Free users: current + last 3 puzzles
  return puzzleNumber >= (currentNumber - 3) && puzzleNumber <= currentNumber;
}
```

**Additional Import Needed**:

```javascript
import { getCurrentPuzzleNumber, getPuzzleNumberForDate } from '@/lib/puzzleNumber';
```

**Testing**:

- [ ] Verify free users can access current puzzle + last 3
- [ ] Verify free users cannot access older puzzles (paywall appears)
- [ ] Verify subscribers can access all puzzles

---

### Task 4.2: Fix PaywallModal Blocking Issue

**File**: [src/components/PaywallModal.jsx](src/components/PaywallModal.jsx)

**Current Issue**: Line 15-17 calls `await subscriptionService.initialize()` which blocks for 5+ seconds.

**Root Cause**: Subscription service should already be initialized at app bootstrap (GameContainerClient.jsx:146).

**Changes Needed**:

```javascript
// REPLACE the useEffect at lines 14-18

// ❌ OLD - Blocking initialization (remove this)
useEffect(() => {
  if (isOpen && Capacitor.isNativePlatform()) {
    loadProducts();
  }
}, [isOpen]);

// ✅ NEW - Use already-initialized products (use this)
useEffect(() => {
  if (isOpen && Capacitor.isNativePlatform()) {
    // Check if service is already ready
    if (subscriptionService.isReady()) {
      loadProducts();
    } else {
      // Subscribe to state changes
      const unsubscribe = subscriptionService.onStateChange((state) => {
        if (state === 'READY') {
          loadProducts();
          unsubscribe();
        } else if (state === 'FAILED') {
          setError('Unable to load subscription options. Please try again later.');
          setProductsLoading(false);
          unsubscribe();
        }
      });

      return unsubscribe;
    }
  }
}, [isOpen]);
```

**Update loadProducts function** (lines 20-42):

```javascript
// REPLACE loadProducts to remove duplicate initialization

// ❌ OLD - Has await initialize() (remove this)
const loadProducts = async () => {
  try {
    setProductsLoading(true);
    setError(null);

    await subscriptionService.initialize(); // ← THIS IS THE BLOCKING CALL
    const allProducts = subscriptionService.getProducts();
    // ...
  }
};

// ✅ NEW - Use already initialized service (use this)
const loadProducts = async () => {
  try {
    setProductsLoading(true);
    setError(null);

    // Service is already initialized at app bootstrap
    const allProducts = subscriptionService.getProducts();

    if (!allProducts || Object.keys(allProducts).length === 0) {
      setError(
        'Subscription options are loading. This may take a moment in TestFlight. Please close and try again.'
      );
    }
  } catch (err) {
    console.error('Failed to load products:', err);
    setError(
      "Unable to load subscription options. Please ensure you're connected to the internet and try again."
    );
  } finally {
    setProductsLoading(false);
  }
};
```

**Testing**:

- [ ] Verify paywall modal opens instantly without freeze
- [ ] Verify products load correctly on iOS
- [ ] Verify error handling works if service not ready
- [ ] Test on TestFlight build

---

## Phase 5: Update Archive Modal

### Task 5.1: Migrate to Number-Based Archive API

**File**: [src/components/game/ArchiveModalPaginated.jsx](src/components/game/ArchiveModalPaginated.jsx)

**Current Issue**: Uses old date-based `/api/puzzles/paginated` endpoint with timezone bugs.

**Changes Needed**:

**1. Update imports** (top of file):

```javascript
import { getCurrentPuzzleNumber, getDateForPuzzleNumber } from '@/lib/puzzleNumber';
```

**2. Update state variables** (around line 20):

```javascript
// REPLACE date-based state with number-based state

// ❌ OLD
const [puzzles, setPuzzles] = useState([]);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

// ✅ NEW
const [puzzles, setPuzzles] = useState([]);
const [currentNumber, setCurrentNumber] = useState(getCurrentPuzzleNumber());
const [startNumber, setStartNumber] = useState(1);
const [hasMore, setHasMore] = useState(true);
```

**3. Replace loadPuzzles function** (around line 100):

```javascript
// REPLACE entire loadPuzzles function

const loadPuzzles = useCallback(
  async (page = 1, append = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const limit = 20;
      const currentPuzzleNumber = getCurrentPuzzleNumber();

      // Calculate start and end numbers
      const endNum = currentPuzzleNumber - (page - 1) * limit;
      const startNum = Math.max(1, endNum - limit + 1);

      const response = await fetch(
        `/api/puzzles/archive?start=${startNum}&end=${endNum}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch puzzles');
      }

      const data = await response.json();

      if (data.success) {
        if (append) {
          setPuzzles((prev) => [...prev, ...data.puzzles]);
        } else {
          setPuzzles(data.puzzles);
        }

        setHasMore(data.pagination.hasMore);
        setStartNumber(startNum);

        // Check access permissions for loaded puzzles
        checkAccessPermissions(data.puzzles, append);
      } else {
        throw new Error(data.error || 'Failed to load puzzles');
      }
    } catch (err) {
      console.error('Error loading puzzles:', err);
      setError('Failed to load puzzles. Please try again.');
    } finally {
      setLoading(false);
    }
  },
  [loading, checkAccessPermissions]
);
```

**4. Update checkAccessPermissions** to use puzzle numbers:

```javascript
const checkAccessPermissions = useCallback(
  (puzzlesToCheck, append = false) => {
    const accessMap = append ? { ...puzzleAccessMap } : {};

    puzzlesToCheck.forEach((puzzle) => {
      const cacheKey = puzzle.number.toString(); // Use number as key

      if (paginatedCache.puzzleAccessMap[cacheKey] !== undefined) {
        accessMap[cacheKey] = !paginatedCache.puzzleAccessMap[cacheKey];
        return;
      }

      // Use puzzle number for access check (not date)
      const hasAccess =
        !Capacitor.isNativePlatform() || subscriptionService.canAccessPuzzle(puzzle.number);
      accessMap[cacheKey] = !hasAccess;
      paginatedCache.puzzleAccessMap[cacheKey] = hasAccess;
    });

    if (append) {
      setPuzzleAccessMap((prev) => ({ ...prev, ...accessMap }));
    } else {
      setPuzzleAccessMap(accessMap);
    }
  },
  [puzzleAccessMap]
);
```

**5. Update handlePuzzleClick**:

```javascript
const handlePuzzleClick = useCallback(
  async (puzzle) => {
    const isLocked = puzzleAccessMap[puzzle.number.toString()];

    if (isLocked) {
      playHaptic('error');
      setShowPaywall(true);
      return;
    }

    playHaptic('light');
    onClose();

    // Use puzzle number for loading
    onSelectPuzzle(puzzle.number);
  },
  [puzzleAccessMap, onSelectPuzzle, onClose, playHaptic]
);
```

**6. Update puzzle card rendering** (around line 300):

```javascript
// Update to show puzzle number and formatted date
<button
  onClick={() => handlePuzzleClick(puzzle)}
  className={/* ... */}
>
  <div className="flex justify-between items-center">
    <div className="text-left">
      <div className="font-bold text-gray-800 dark:text-gray-200">
        Puzzle #{puzzle.number}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {new Date(puzzle.date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
      {puzzle.theme && (
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          {puzzle.theme}
        </div>
      )}
    </div>
    {puzzleAccessMap[puzzle.number.toString()] && (
      <div className="text-2xl">🔒</div>
    )}
  </div>
</button>
```

**Testing**:

- [ ] Verify archive shows correct puzzles (current through puzzle #1)
- [ ] Verify pagination works correctly
- [ ] Verify lock icons appear on correct puzzles
- [ ] Verify clicking paywalled puzzle opens paywall (no freeze)
- [ ] Verify clicking unlocked puzzle loads correctly

---

## Phase 6: Update Welcome Screen

### Task 6.1: Display Puzzle Number and User-Locale Date

**File**: [src/components/game/WelcomeScreen.jsx](src/components/game/WelcomeScreen.jsx)

**Changes Needed**:

**1. Add imports** (top of file):

```javascript
import { getCurrentPuzzleNumber, getDisplayDate } from '@/lib/puzzleNumber';
```

**2. Calculate puzzle number** (add to component):

```javascript
const puzzleNumber = getCurrentPuzzleNumber();
const displayDate = getDisplayDate(puzzleNumber);
```

**3. Update UI to show puzzle number** (around line 50-60):

```javascript
// FIND the title section and update it

// ✅ NEW - Show puzzle number prominently
<div className="text-center mb-8">
  <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-200 mb-2">Tandem</h1>
  <div className="text-xl text-gray-600 dark:text-gray-400">Puzzle #{puzzleNumber}</div>
  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">{displayDate}</div>
</div>
```

**Alternative Design** (if you prefer date more prominent):

```javascript
<div className="text-center mb-8">
  <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-200 mb-2">Tandem</h1>
  <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">{displayDate}</div>
  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Puzzle #{puzzleNumber}</div>
</div>
```

**Testing**:

- [ ] Verify puzzle number displays correctly
- [ ] Verify date shows in user's locale format
- [ ] Test at midnight boundary (should increment correctly)
- [ ] Test across different timezones

---

## Testing Checklist

### Cross-Platform Testing

- [ ] **iOS Native App**
  - [ ] Puzzle number matches user's local date
  - [ ] Archive modal opens without freeze
  - [ ] Paywall modal opens instantly when clicking locked puzzles
  - [ ] Can play current + last 3 puzzles as free user
  - [ ] Subscription check works correctly

- [ ] **PWA (Mobile)**
  - [ ] Same puzzle number as iOS on same calendar day
  - [ ] Archive displays correctly
  - [ ] All features work without native plugins

- [ ] **Desktop Web**
  - [ ] Matches mobile puzzle number
  - [ ] All features functional

- [ ] **Localhost Development**
  - [ ] Consistent behavior with production

### Timezone Testing

Test in different timezones to ensure consistency:

- [ ] **Pacific Time (PST/PDT)** - Should show same puzzle# on same calendar day
- [ ] **Eastern Time (EST/EDT)** - Should show same puzzle# on same calendar day
- [ ] **GMT/UTC** - Should show same puzzle# on same calendar day
- [ ] **Japan (JST)** - Should show same puzzle# on same calendar day

### Midnight Boundary Testing

- [ ] Open app at 11:59 PM local time
- [ ] Wait until 12:00 AM
- [ ] Refresh/reload app
- [ ] Verify puzzle number increments by 1
- [ ] Verify new puzzle loads correctly
- [ ] Verify previous puzzle moves to archive

### Subscription Testing

- [ ] **Free User**
  - [ ] Can access current puzzle
  - [ ] Can access last 3 puzzles
  - [ ] Cannot access puzzle #(current - 4) - shows lock
  - [ ] Clicking locked puzzle opens paywall instantly

- [ ] **Subscribed User**
  - [ ] Can access all puzzles in archive
  - [ ] No lock icons appear
  - [ ] Can scroll through entire history

### Performance Testing

- [ ] Archive modal opens in < 1 second
- [ ] Paywall modal opens instantly (no 5-second freeze)
- [ ] Puzzle loads in < 2 seconds on good connection
- [ ] Offline mode works (shows cached puzzles)
- [ ] No UI freezes or blocking operations

---

## Success Criteria

### All Issues Resolved ✅

1. **Archive displays correct puzzles**
   - Shows current day's puzzle (based on user timezone)
   - Shows previous puzzles back to puzzle #1
   - No missing puzzles

2. **Paywall works correctly**
   - Opens instantly when clicking locked puzzle
   - No app freeze or unresponsive UI
   - Can close and return to archive

3. **Puzzle numbers consistent**
   - Same number across all platforms on same calendar day
   - Updates at midnight in user's timezone
   - Matches Wordle behavior

4. **Subscription logic correct**
   - Free users: current + last 3 puzzles
   - Subscribers: all puzzles
   - Access checks are synchronous (no blocking)

5. **Production quality code**
   - Follows Apple HIG
   - No race conditions
   - Proper error handling
   - Performance optimized

---

## Files Modified Summary

| File                                            | Status      | Changes                           |
| ----------------------------------------------- | ----------- | --------------------------------- |
| `src/lib/puzzleNumber.js`                       | ✅ Complete | Core utilities for puzzle numbers |
| `src/lib/db.js`                                 | ✅ Complete | Unified `getPuzzle()` function    |
| `src/app/api/puzzle/route.js`                   | ✅ Complete | Dual parameter support            |
| `src/app/api/puzzles/archive/route.js`          | ✅ Complete | New number-based endpoint         |
| `src/services/platform.js`                      | ✅ Complete | Updated to use puzzle numbers     |
| `src/services/subscriptionService.js`           | 📋 Task 4.1 | Update to number-based access     |
| `src/components/PaywallModal.jsx`               | 📋 Task 4.2 | Remove blocking initialize        |
| `src/components/game/ArchiveModalPaginated.jsx` | 📋 Task 5.1 | Migrate to new API                |
| `src/components/game/WelcomeScreen.jsx`         | 📋 Task 6.1 | Display puzzle number             |

---

## Implementation Order

**Recommended order to minimize issues:**

1. **Task 4.1** - Update subscription access logic (foundational change)
2. **Task 4.2** - Fix paywall modal blocking (critical bug fix)
3. **Task 6.1** - Update welcome screen (safe, visual change)
4. **Task 5.1** - Migrate archive modal (most complex, do last)

After each task, test thoroughly before proceeding to the next.

---

## Deployment Notes

- All backend changes are already deployed to production
- Frontend changes can be deployed incrementally
- Maintain backward compatibility during rollout
- Monitor for any API errors after deployment
- Consider feature flag for gradual rollout

---

## Support & References

- **Puzzle Number System**: [src/lib/puzzleNumber.js](src/lib/puzzleNumber.js)
- **Database Functions**: [src/lib/db.js](src/lib/db.js)
- **Archive API**: [src/app/api/puzzles/archive/route.js](src/app/api/puzzles/archive/route.js)
- **Platform Service**: [src/services/platform.js](src/services/platform.js)

For questions or issues during implementation, refer to the commit history:

- `01a9abc` - User-timezone puzzle number system (backend)
- `8614f86` - Production-ready subscription refactor
- `87d1986` - Prevent paywall freeze (initial fix)
