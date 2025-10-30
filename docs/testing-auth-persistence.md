# Testing Guide: Authentication & Subscription Persistence

**Purpose:** Verify that authentication and subscription state persist correctly across page reloads and show immediately without flashing incorrect content.

**Date:** 2025-10-30
**Related:** [authentication-persistence-implementation.md](authentication-persistence-implementation.md)

---

## Prerequisites

1. **Build the application:**

   ```bash
   npm run build
   npm run dev
   ```

2. **Test accounts needed:**
   - Free account (no subscription)
   - Paid account (active Tandem Unlimited subscription)

3. **Test in multiple browsers:**
   - Chrome/Edge (Desktop)
   - Safari (Desktop & iOS)
   - Firefox (Desktop)

---

## Test Scenarios

### Test 1: Authentication Persistence (Free Account)

**Objective:** Verify auth state persists and shows immediately on reload.

**Steps:**

1. Open https://localhost:3000 in incognito/private browsing
2. Click any locked puzzle in Archive → Sign Up button
3. Create new account with email/password
4. Verify you're logged in (Settings shows account section)
5. **Close the browser tab completely**
6. **Open new tab and navigate to https://localhost:3000**

**Expected Result:**

- ✅ User appears logged in IMMEDIATELY (no flash)
- ✅ Settings → Account section visible right away
- ✅ No loading state before showing account info
- ✅ Archive shows free tier access (last 4 days unlocked)

**Failure Indicators:**

- ❌ Shows "logged out" state first, then updates to logged in
- ❌ Settings → Account section appears after delay
- ❌ Flash of "Sign In" button before showing user email

---

### Test 2: Subscription Status Persistence (Paid Account)

**Objective:** Verify subscription status persists and archive shows unlocked immediately.

**Prerequisites:**

- Account with active Tandem Unlimited subscription
- Or use Stripe test mode to create test subscription

**Steps:**

1. Sign in with account that has active subscription
2. Open Settings → Verify "Tandem Unlimited" badge is visible
3. Open Archive → Verify old puzzles show UNLOCKED (no 🔒 icons)
4. **Close browser tab completely**
5. **Open new tab and navigate to https://localhost:3000**
6. **Immediately open Archive modal**

**Expected Result:**

- ✅ Archive puzzles show UNLOCKED immediately (no locks)
- ✅ No flash of locked state before unlocking
- ✅ Settings shows "Tandem Unlimited" badge immediately
- ✅ Hard Mode toggle is visible/enabled (premium feature)

**Failure Indicators:**

- ❌ Archive shows locks first, then unlocks after delay
- ❌ Settings shows loading spinner before badge
- ❌ Hard Mode toggle appears after delay

---

### Test 3: Purchase Flow & Immediate Update

**Objective:** Verify purchase updates all components without page reload.

**Steps:**

1. Sign in with FREE account (no subscription)
2. Open Archive → Click any old locked puzzle
3. PaywallModal opens → Select "Buddy Pass" ($1.99/month)
4. Complete Stripe test checkout:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
5. Wait for redirect back to app

**Expected Result:**

- ✅ Archive puzzles unlock IMMEDIATELY (no reload needed)
- ✅ Settings shows "Tandem Unlimited" badge
- ✅ Hard Mode toggle appears
- ✅ No page refresh required

**Failure Indicators:**

- ❌ Need to refresh page to see unlocked puzzles
- ❌ Settings still shows "View Plans" button
- ❌ Archive still shows locks

---

### Test 4: Sign Out Flow & Cache Clearing

**Objective:** Verify signing out clears cached subscription state.

**Steps:**

1. Sign in with PAID account
2. Verify Settings shows "Tandem Unlimited" badge
3. Verify Archive shows old puzzles unlocked
4. Settings → Account → Sign Out
5. Verify signed out state
6. **Refresh page**

**Expected Result:**

- ✅ Archive shows locks on old puzzles (free tier)
- ✅ Settings hides account section
- ✅ Settings hides subscription badge
- ✅ Hard Mode toggle hidden
- ✅ No remnants of subscription state

**Failure Indicators:**

- ❌ Archive still shows unlocked (cached subscription)
- ❌ Settings still shows badge after sign out
- ❌ localStorage still contains subscription data

---

### Test 5: Expired Subscription Handling

**Objective:** Verify expired subscriptions show correctly after reload.

**Note:** This requires manually expiring a subscription in Stripe dashboard.

**Steps:**

1. Sign in with account that has EXPIRED subscription
2. Verify Archive shows locks on old puzzles
3. Verify Settings shows expiry status (if displayed)
4. **Refresh page**

**Expected Result:**

- ✅ Archive shows locks immediately (no flash of unlocked)
- ✅ Settings shows expired/canceled status
- ✅ "View Plans" button shown to renew

**Failure Indicators:**

- ❌ Shows unlocked puzzles first, then locks them
- ❌ Still shows "Tandem Unlimited" badge

---

### Test 6: Network Offline Resilience

**Objective:** Verify app works with cached state when offline.

**Steps:**

1. Sign in with PAID account
2. Verify everything works normally
3. Open DevTools → Network tab → Set to "Offline"
4. **Refresh page**
5. Try opening Archive, Settings

**Expected Result:**

- ✅ Page loads with cached auth state
- ✅ Archive shows unlocked (from cache)
- ✅ Settings shows subscription badge (from cache)
- ✅ App is functional with cached data
- ⚠️ May show warning about network issues

**Failure Indicators:**

- ❌ Page fails to load at all
- ❌ Shows logged out when offline
- ❌ Archive shows all puzzles locked

---

### Test 7: Multi-Tab Synchronization

**Objective:** Verify subscription state syncs across tabs.

**Steps:**

1. Open app in Tab A (signed in, FREE account)
2. Open app in Tab B (same browser)
3. In Tab B: Subscribe to Tandem Unlimited
4. Complete purchase, return to app
5. **Switch to Tab A** (don't refresh)
6. Open Archive in Tab A

**Expected Result:**

- ⚠️ Currently: Tab A won't auto-update (requires manual refresh)
- ✅ After refresh: Tab A shows updated subscription state

**Future Enhancement:**

- Use `storage` event listener for cross-tab sync
- Or use BroadcastChannel API

---

### Test 8: Fast Network / Slow API Response

**Objective:** Verify cached state displays while API loads.

**Steps:**

1. Sign in with PAID account
2. Open DevTools → Network tab
3. Add throttling: "Slow 3G"
4. **Refresh page**
5. Immediately open Archive

**Expected Result:**

- ✅ Archive shows unlocked from cache IMMEDIATELY
- ✅ No loading spinner blocking UI
- ✅ Background refresh happens silently
- ✅ UI only updates if state changed

**Failure Indicators:**

- ❌ Archive shows loading state while fetching
- ❌ Shows locks first, then unlocks after API responds

---

## Browser-Specific Testing

### Chrome/Edge

- ✅ Test with DevTools Application tab → Clear Storage
- ✅ Verify localStorage persistence
- ✅ Test service worker interactions (if any)

### Safari Desktop

- ✅ Test with Develop → Empty Caches
- ✅ Verify private browsing mode (no persistence)
- ✅ Test cross-origin storage restrictions

### Safari iOS

- ✅ Test on actual device (not just simulator)
- ✅ Verify PWA mode vs browser mode
- ✅ Test after device reboot
- ✅ Test with "Prevent Cross-Site Tracking" ON

### Firefox

- ✅ Test with "Enhanced Tracking Protection" strict mode
- ✅ Verify localStorage allowed
- ✅ Test private window mode

---

## Automated Testing (Future)

### Unit Tests (Jest)

```javascript
describe('SubscriptionContext', () => {
  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(
      'tandem_subscription_cache',
      JSON.stringify({
        isActive: true,
        tier: 'buddypass',
      })
    );
    // Test render shows cached state immediately
  });

  it('clears cache on sign out', () => {
    // Test that localStorage cleared after signOut()
  });
});
```

### Integration Tests (Playwright)

```javascript
test('archive shows unlocked after page reload', async ({ page }) => {
  // Sign in with paid account
  await signInAsPaidUser(page);

  // Verify archive unlocked
  await page.goto('/');
  await page.click('[data-testid="archive-button"]');
  const locks = await page.locator('.puzzle-item 🔒').count();
  expect(locks).toBe(0);

  // Reload page
  await page.reload();

  // Verify still unlocked (from cache)
  await page.click('[data-testid="archive-button"]');
  const locksAfter = await page.locator('.puzzle-item 🔒').count();
  expect(locksAfter).toBe(0);
});
```

---

## Performance Metrics

### Target Metrics

- **Time to show cached auth state:** < 50ms
- **Time to show cached subscription state:** < 50ms
- **Background API refresh:** < 500ms (not blocking)
- **First Contentful Paint:** < 1.5s

### How to Measure

1. Open DevTools → Performance tab
2. Start recording
3. Reload page
4. Stop recording
5. Look for:
   - When localStorage read happens
   - When context updates
   - When UI renders cached state

---

## Debugging Tips

### Check localStorage Contents

```javascript
// In browser console:
console.log('Auth:', localStorage.getItem('sb-{project-id}-auth-token'));
console.log('Subscription (context):', localStorage.getItem('tandem_subscription_cache'));
console.log('Subscription (service):', localStorage.getItem('tandem_subscription_raw'));
```

### Clear All Caches

```javascript
// In browser console:
localStorage.clear();
sessionStorage.clear();
// Then reload page
```

### Enable Debug Logging

Add to components:

```javascript
useEffect(() => {
  console.log('[SubscriptionContext] State:', { isActive, tier, loading });
}, [isActive, tier, loading]);
```

---

## Known Limitations

1. **Cross-tab sync:** Requires manual refresh in other tabs
2. **Service Workers:** May cache stale API responses
3. **Safari Private Browsing:** No localStorage persistence
4. **Cookie consent:** May block localStorage in some regions

---

## Success Criteria

All tests must pass with ✅ results:

- [ ] Test 1: Auth Persistence (Free Account)
- [ ] Test 2: Subscription Persistence (Paid Account)
- [ ] Test 3: Purchase Flow Updates
- [ ] Test 4: Sign Out Clears Cache
- [ ] Test 5: Expired Subscription Handling
- [ ] Test 6: Offline Resilience
- [ ] Test 7: Multi-Tab Sync (manual refresh OK)
- [ ] Test 8: Fast Display During Slow API

**Sign-off:**

- Developer: **********\_********** Date: **\_**
- QA: **********\_********** Date: **\_**
- Product: **********\_********** Date: **\_**
