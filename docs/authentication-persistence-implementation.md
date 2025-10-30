# Authentication & Subscription Persistence Implementation

**Goal:** Implement instant authentication and subscription state persistence following modern mobile web game best practices (Wordle, NYT Games, Duolingo).

**Status:** In Progress
**Started:** 2025-10-30
**Approach:** Option 3 - Hybrid (Context + Eager Initialization + LocalStorage Caching)

---

## Problem Statement

### Current Issues

1. **Authentication appears "logged out" on page reload** until Settings is clicked
2. **Archive puzzles show as locked** initially, then update after subscription loads
3. **No eager state hydration** - everything loads asynchronously after render
4. **Poor UX** - users see flash of incorrect state before it updates

### Root Causes

- Auth state loads asynchronously without cached display
- Subscription service only initializes when explicitly called
- No React Context for subscription (just singleton service)
- Components don't auto-update when subscription changes

---

## Solution Architecture

### Hybrid Approach Components

1. **SubscriptionContext Provider**
   - React Context wrapping subscription service
   - Provides reactive state to all components
   - Automatic re-renders on state changes

2. **LocalStorage Caching**
   - Cache auth state (already done by Supabase)
   - Cache subscription status for instant display
   - Background refresh for accuracy

3. **Eager Initialization**
   - Hydrate from cache on app load (0ms delay)
   - Initialize subscription when auth loads
   - Show cached state immediately

4. **Background Refresh**
   - Fetch fresh auth session from Supabase
   - Fetch subscription status from API
   - Update UI only if state changed

---

## Implementation Flow

```
App Load (0ms)
  ↓
AuthProvider hydrates from localStorage ← INSTANT
  ↓
SubscriptionProvider hydrates from localStorage ← INSTANT
  ↓
Render UI with cached states ← USER SEES LOGGED IN
  ↓
Background: Supabase validates session
  ↓
Background: API fetches subscription status
  ↓
Update UI only if state changed ← SEAMLESS
```

---

## File Changes Required

### Phase 1: Create Subscription Context ✅ Planned

**New File:** `src/contexts/SubscriptionContext.jsx`

**Features:**

- Context provider wrapping subscription service
- Eager hydration from localStorage on mount
- Auto-refresh when auth state changes
- Cache updates to localStorage
- Export `useSubscription()` hook

**Cache Keys:**

- `tandem_subscription_cache` - Formatted state for context
- `tandem_subscription_raw` - Raw API response (in service)

---

### Phase 2: Enhance WebSubscriptionService ✅ Planned

**File:** `src/services/webSubscriptionService.js`

**Changes:**

- Add localStorage caching to `loadSubscriptionStatus()`
- Return cached data immediately, fetch fresh in background
- Update cache after successful API calls
- Handle cache invalidation on sign out

**Cache Strategy:**

```javascript
// 1. Check cache first (instant)
const cached = localStorage.getItem('tandem_subscription_raw');
if (cached) {
  this.subscriptionStatus = JSON.parse(cached);
}

// 2. Fetch fresh data
const response = await fetch('/api/subscription/status');

// 3. Update cache
localStorage.setItem('tandem_subscription_raw', JSON.stringify(data));
```

---

### Phase 3: Update Root Layout ✅ Planned

**File:** `src/app/layout.jsx`

**Changes:**

- Import SubscriptionProvider
- Wrap children with provider (after AuthProvider)

**New Structure:**

```jsx
<ThemeProvider>
  <AuthProvider>
    <SubscriptionProvider>
      <IOSContainerWrapper>{children}</IOSContainerWrapper>
    </SubscriptionProvider>
  </AuthProvider>
</ThemeProvider>
```

---

### Phase 4: Refactor Components ✅ Planned

#### **A) ArchiveModalPaginated.jsx**

**Current Issues:**

- Manual subscription service calls
- Async access checks
- Shows locks, then updates

**Changes:**

```javascript
// Before:
const [puzzleAccessMap, setPuzzleAccessMap] = useState({});
subscriptionService.refreshSubscriptionStatus();

// After:
const { isActive } = useSubscription();
// Access map updates automatically via context
```

**Benefits:**

- Instant lock display from cached state
- Auto-updates when subscription changes
- No manual refresh calls

---

#### **B) Settings.jsx**

**Current Issues:**

- Direct subscription service calls
- Manual status checks
- No auto-refresh on purchase

**Changes:**

```javascript
// Before:
const [isSubscribed, setIsSubscribed] = useState(false);
// Manual checks...

// After:
const { isActive, tier, expiryDate, refreshStatus } = useSubscription();
```

**Benefits:**

- Reactive subscription badge
- Auto-updates after purchase
- Cleaner code

---

#### **C) PaywallModal.jsx**

**Current Issues:**

- Manual refresh after purchase
- Components don't update automatically

**Changes:**

```javascript
// Before:
await subscriptionService.refreshSubscriptionStatus();

// After:
const { refreshStatus } = useSubscription();
await refreshStatus(); // Triggers context update
```

**Benefits:**

- All components update automatically
- Archive unlocks instantly
- Settings badge updates

---

## Data Flow

### Authentication State

```
User Signs In
  ↓
AuthContext updates user state
  ↓
Supabase stores session in localStorage (automatic)
  ↓
SubscriptionContext detects auth change
  ↓
Fetches subscription status
  ↓
Caches to localStorage
  ↓
All components re-render with new state
```

### Page Reload

```
User Refreshes Page
  ↓
AuthContext reads session from localStorage (0ms)
  ↓
SubscriptionContext reads from localStorage (0ms)
  ↓
UI renders immediately with cached state
  ↓
Background: Validate session with Supabase
  ↓
Background: Fetch fresh subscription status
  ↓
Update only if changed
```

### Purchase Flow

```
User Completes Purchase
  ↓
PaywallModal calls refreshStatus()
  ↓
SubscriptionContext fetches new status
  ↓
Updates cache and state
  ↓
All components re-render:
  - Archive unlocks puzzles
  - Settings shows badge
  - Hard Mode enables
```

---

## Cache Management

### Cache Invalidation Strategy

**When to Clear Cache:**

1. User signs out → Clear both auth and subscription cache
2. Subscription status changes → Update cache
3. API returns 401/403 → Clear cache and force re-auth

**Cache Freshness:**

- Subscription cache: Valid for session duration
- Always validate on:
  - App launch
  - Auth state change
  - Manual refresh (pull-to-refresh)

**Storage Keys:**

```javascript
// Managed by Supabase
'sb-{project-ref}-auth-token'; // Auth session

// Managed by SubscriptionContext
'tandem_subscription_cache'; // { isActive, tier, expiryDate, loading }

// Managed by webSubscriptionService
'tandem_subscription_raw'; // Raw API response
```

---

## Testing Plan

### Phase 5: Testing ✅ Planned

#### Test 1: Authentication Persistence

1. Sign in with email/password
2. Close tab completely
3. Reopen site in new tab
4. **Expected:** User appears logged in immediately (no flash)

#### Test 2: Subscription State Persistence

1. Subscribe to Tandem Unlimited
2. Verify Settings shows "Tandem Unlimited" badge
3. Close tab
4. Reopen site
5. **Expected:** Settings still shows badge immediately

#### Test 3: Archive Access Persistence

1. Subscribe to Tandem Unlimited
2. Open Archive modal
3. **Expected:** Old puzzles show unlocked immediately (no locks)
4. Close tab
5. Reopen site
6. Open Archive modal
7. **Expected:** Still unlocked (no flash of locks)

#### Test 4: Purchase Flow

1. Click locked puzzle in Archive
2. Complete purchase
3. **Expected:**
   - Archive unlocks immediately
   - Settings shows badge
   - No page reload required

#### Test 5: Sign Out Flow

1. Sign out from Settings
2. **Expected:**
   - Cache cleared
   - Archive shows locks (free tier)
   - Settings hides account section

#### Test 6: Expired Subscription

1. Mock expired subscription in cache
2. Refresh page
3. **Expected:**
   - Shows cached "expired" state initially
   - Background refresh updates to actual state
   - Archive locks old puzzles

---

## Success Criteria

### Must Have

- ✅ User appears logged in immediately on page reload
- ✅ Subscription status shows correctly without delay
- ✅ Archive puzzles show correct lock state instantly
- ✅ No flash of incorrect content (logged out → logged in)
- ✅ Purchase updates all components automatically

### Nice to Have

- ✅ Skeleton loading states during true first load
- ✅ Error boundaries for auth/subscription failures
- ✅ Retry logic for failed API calls
- ✅ Pull-to-refresh for manual status check

---

## Performance Considerations

### Bundle Size

- SubscriptionContext: ~2KB (minified + gzipped)
- No new dependencies required
- Lazy loading of subscription service preserved

### Runtime Performance

- 0ms delay to show cached state
- Background refresh doesn't block UI
- Context re-renders only affected components
- LocalStorage reads/writes are negligible (<1ms)

### Memory

- Minimal state in context (~100 bytes)
- Cache size: ~500 bytes in localStorage
- No memory leaks (proper cleanup in useEffect)

---

## Rollback Plan

If issues arise:

1. Remove SubscriptionProvider from layout
2. Revert component changes to use service directly
3. Keep localStorage caching in service (safe improvement)
4. Auth context unchanged (no risk)

---

## Future Enhancements

### Phase 6: Additional Optimizations (Post-Launch)

1. **Service Worker Caching**
   - Cache API responses
   - Offline mode support

2. **Optimistic UI Updates**
   - Show purchased state immediately
   - Verify in background

3. **Real-time Sync**
   - WebSocket for subscription updates
   - Multi-tab synchronization

4. **Advanced Caching**
   - TTL for cache entries
   - Stale-while-revalidate pattern

---

## Timeline

- **Phase 1-3:** SubscriptionContext + Service Updates (30 min)
- **Phase 4:** Component Refactoring (45 min)
- **Phase 5:** Testing (30 min)
- **Total:** ~2 hours

---

## References

### Modern Web Game Examples

- **Wordle:** Instant game state on reload
- **NYT Games:** Subscription status persists seamlessly
- **Duolingo:** Authentication never flashes logged out
- **Spotify Web:** Subscription tier always visible

### Technical References

- Supabase Auth Persistence: https://supabase.com/docs/guides/auth/sessions
- React Context Best Practices: https://react.dev/reference/react/useContext
- LocalStorage Performance: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

---

## Notes

- All localStorage operations include try/catch for quota exceeded errors
- Cache keys prefixed with "tandem\_" to avoid conflicts
- Context providers ordered: Theme → Auth → Subscription (dependency order)
- iOS native app uses same pattern (IAP instead of Stripe)

---

## Progress Tracking

- [x] Problem analysis and architecture design
- [x] Implementation plan documentation
- [x] Phase 1: Create SubscriptionContext
- [x] Phase 2: Update WebSubscriptionService caching
- [x] Phase 3: Update root layout
- [x] Phase 4A: Refactor ArchiveModalPaginated
- [x] Phase 4B: Refactor Settings
- [x] Phase 4C: Refactor PaywallModal
- [ ] Phase 5: Testing all scenarios
- [ ] Code review and optimization
- [ ] Deploy to production

---

## Implementation Summary

### Completed Changes

#### 1. SubscriptionContext Provider (`src/contexts/SubscriptionContext.jsx`)

- ✅ Created new React Context for subscription state
- ✅ Eager hydration from localStorage on mount
- ✅ Auto-refresh when auth state changes
- ✅ Cache management with proper serialization
- ✅ Exported `useSubscription()` hook for easy consumption

**Key Features:**

```javascript
const { isActive, tier, expiryDate, cancelAtPeriodEnd, loading, refreshStatus } = useSubscription();
```

#### 2. WebSubscriptionService Updates (`src/services/webSubscriptionService.js`)

- ✅ Added cache key constant
- ✅ Hydration on service construction
- ✅ Cache-first loading strategy
- ✅ Automatic cache updates after API calls
- ✅ Cache clearing on sign out

**Cache Strategy:**

- `tandem_subscription_raw` - Stores raw subscription data
- Auto-hydrates on service import
- Updates after every successful API call

#### 3. Root Layout Update (`src/app/layout.jsx`)

- ✅ Imported SubscriptionProvider
- ✅ Added to component tree after AuthProvider
- ✅ Proper nesting order: Theme → Auth → Subscription

**Provider Hierarchy:**

```jsx
<ThemeProvider>
  <AuthProvider>
    <SubscriptionProvider>
      <IOSContainerWrapper>{children}</IOSContainerWrapper>
    </SubscriptionProvider>
  </AuthProvider>
</ThemeProvider>
```

#### 4. Component Refactoring

**ArchiveModalPaginated.jsx:**

- ✅ Imports useSubscription hook
- ✅ Uses `isActive` from context
- ✅ Replaced manual subscription refresh with `refreshStatus()`
- ✅ Auto-updates access map when subscription changes
- ✅ Removed redundant subscription initialization code

**Settings.jsx:**

- ✅ Removed local `subscriptionInfo` state
- ✅ Uses `isActive`, `tier`, `loading` from context
- ✅ Removed manual `loadSubscriptionInfo()` function
- ✅ Displays subscription badge from context state

**PaywallModal.jsx:**

- ✅ Imports useSubscription hook
- ✅ Calls `refreshStatus()` after purchase (iOS)
- ✅ Calls `refreshStatus()` after restore purchases
- ✅ Calls `refreshStatus()` after auth success (Web)
- ✅ Maintains existing purchase flow logic

---

## Next Steps: Testing

Now that all code changes are complete, proceed with comprehensive testing.
