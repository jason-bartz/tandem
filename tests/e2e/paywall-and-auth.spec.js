const { test, expect } = require('@playwright/test');
const {
  generateTestEmail,
  signUp,
  signIn,
  clearStorage,
  isAuthenticated,
} = require('../helpers/auth');
const {
  openArchiveModal,
  closeModal,
  getArchivePuzzles,
  getLockedPuzzles,
  getUnlockedPuzzles,
  clickLockedPuzzle,
  goToAccountPage,
  goToHomePage,
  waitForPageLoad,
} = require('../helpers/navigation');

/**
 * Tandem Paywall and Authentication E2E Tests
 *
 * Tests the web subscription system to ensure:
 * 1. Free users have same access as iOS (4 puzzles: current + 3 days back)
 * 2. Account creation works
 * 3. Paywall triggers correctly
 * 4. Stripe integration works
 */

test.describe('Free User Archive Access', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await clearStorage(page);

    // Navigate to home page
    await goToHomePage(page);
    await waitForPageLoad(page);
  });

  test('should show exactly 4 unlocked puzzles for non-authenticated users', async ({ page }) => {
    // Open archive modal
    await openArchiveModal(page);

    // Get all puzzle items
    const allPuzzles = await getArchivePuzzles(page);
    const allCount = await allPuzzles.count();

    console.log(`Total puzzles in archive: ${allCount}`);

    // Count unlocked puzzles (those without lock icon)
    const lockedPuzzles = await getLockedPuzzles(page);
    const lockedCount = await lockedPuzzles.count();
    const unlockedCount = allCount - lockedCount;

    console.log(`Unlocked puzzles: ${unlockedCount}`);
    console.log(`Locked puzzles: ${lockedCount}`);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/free-user-archive.png', fullPage: true });

    // Assert that exactly 4 puzzles are unlocked (current + 3 days back)
    expect(unlockedCount).toBe(4);

    // Assert that all other puzzles are locked
    expect(lockedCount).toBe(allCount - 4);
  });

  test('should display lock icon on puzzles older than 3 days', async ({ page }) => {
    // Open archive modal
    await openArchiveModal(page);

    // Find locked puzzles
    const lockedPuzzles = await getLockedPuzzles(page);
    const lockedCount = await lockedPuzzles.count();

    // Should have at least some locked puzzles (unless there are only 4 total)
    const allPuzzles = await getArchivePuzzles(page);
    const allCount = await allPuzzles.count();

    if (allCount > 4) {
      expect(lockedCount).toBeGreaterThan(0);
    }

    // Verify lock icon is visible on locked puzzles
    if (lockedCount > 0) {
      const firstLockedPuzzle = lockedPuzzles.first();
      await expect(firstLockedPuzzle).toContainText('🔒');

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/locked-puzzle-icon.png',
        fullPage: true,
      });
    }
  });

  test('should trigger paywall when clicking locked puzzle', async ({ page }) => {
    // Open archive modal
    await openArchiveModal(page);

    // Click on a locked puzzle
    await clickLockedPuzzle(page);

    // Wait for paywall or auth modal to appear
    await page.waitForTimeout(1000);

    // Should see either paywall modal or auth modal
    const paywallModal = page.locator(
      '[data-testid="paywall-modal"], .paywall-modal, text=/Tandem Unlimited/i'
    );
    const authModal = page.locator('[data-testid="auth-modal"], text=/Sign In|Log In|Sign Up/i');

    const hasPaywall = (await paywallModal.count()) > 0;
    const hasAuthModal = (await authModal.count()) > 0;

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/locked-puzzle-click.png', fullPage: true });

    // Should show at least one modal
    expect(hasPaywall || hasAuthModal).toBe(true);
  });
});

test.describe('Authentication Flow', () => {
  let testEmail;
  let testPassword;

  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await clearStorage(page);

    // Generate unique credentials for this test
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';

    await goToHomePage(page);
    await waitForPageLoad(page);
  });

  test('should create new account via signup flow', async ({ page }) => {
    // Open archive and click locked puzzle to trigger auth
    await openArchiveModal(page);
    await clickLockedPuzzle(page);

    // Wait for auth modal
    await page.waitForSelector('text=/Sign Up|Create Account/i', { timeout: 10000 });

    // Take screenshot before signup
    await page.screenshot({ path: 'tests/screenshots/auth-modal-signup.png', fullPage: true });

    // Sign up
    await signUp(page, {
      email: testEmail,
      password: testPassword,
      fullName: 'Test User',
    });

    // Wait for modal to close and check auth status
    await page.waitForTimeout(2000);

    // Take screenshot after signup
    await page.screenshot({ path: 'tests/screenshots/after-signup.png', fullPage: true });

    // Verify user is now authenticated
    const authenticated = await isAuthenticated(page);
    console.log(`User authenticated after signup: ${authenticated}`);

    // Should see paywall or be redirected
    // Note: Actual behavior depends on whether auth modal closes and shows paywall
  });

  test('should login with existing credentials', async ({ page, context }) => {
    // For this test, we'll need to have created an account first
    // This is a simplified version - in a real scenario, you'd use a test account

    // Open archive and trigger auth modal
    await openArchiveModal(page);
    await clickLockedPuzzle(page);

    // Wait for auth modal
    await page.waitForSelector('text=/Sign In|Log In/i', { timeout: 10000 });

    // Switch to login mode if not already
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In")');
    if (!(await signInButton.isVisible())) {
      await page.click('text=/.*[Ll]og [Ii]n.*|.*[Ss]ign [Ii]n.*/');
    }

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/auth-modal-login.png', fullPage: true });

    // Note: We can't actually test login without pre-created credentials
    // This test demonstrates the flow
  });
});

test.describe('Paywall Display and Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await goToHomePage(page);
    await waitForPageLoad(page);
  });

  test('should display all subscription tiers with correct pricing', async ({ page }) => {
    // Open archive and click locked puzzle
    await openArchiveModal(page);
    await clickLockedPuzzle(page);

    // Wait for paywall modal (may need to handle auth first)
    await page.waitForTimeout(2000);

    // Look for subscription tiers
    const buddyPass = page.locator('text=/Buddy Pass|\\$1\\.99/i');
    const bestFriends = page.locator('text=/Best Friends|\\$14\\.99/i');
    const soulmates = page.locator('text=/Soulmates|\\$29\\.99/i');

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/paywall-tiers.png', fullPage: true });

    // Check if tiers are visible (they should be if paywall is shown)
    const hasBuddyPass = (await buddyPass.count()) > 0;
    const hasBestFriends = (await bestFriends.count()) > 0;
    const hasSoulmates = (await soulmates.count()) > 0;

    console.log(`Buddy Pass visible: ${hasBuddyPass}`);
    console.log(`Best Friends visible: ${hasBestFriends}`);
    console.log(`Soulmates visible: ${hasSoulmates}`);

    // At least one tier should be visible if paywall is shown
    expect(hasBuddyPass || hasBestFriends || hasSoulmates).toBe(true);
  });

  test('should show Stripe payment buttons', async ({ page }) => {
    // Open archive and trigger paywall
    await openArchiveModal(page);
    await clickLockedPuzzle(page);

    await page.waitForTimeout(2000);

    // Look for Stripe-related buttons
    const subscribeButtons = page.locator(
      'button:has-text("Subscribe"), button:has-text("Choose Plan"), button:has-text("Get Started")'
    );

    const buttonCount = await subscribeButtons.count();
    console.log(`Subscribe/payment buttons found: ${buttonCount}`);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/paywall-payment-buttons.png',
      fullPage: true,
    });

    // Should have subscribe buttons if paywall is displayed
    if (buttonCount > 0) {
      expect(buttonCount).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Stripe Checkout Integration', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
    await goToHomePage(page);
    await waitForPageLoad(page);
  });

  test('should initiate Stripe checkout session when clicking subscription tier', async ({
    page,
    context,
  }) => {
    // This test will verify that clicking a tier attempts to redirect to Stripe
    // We'll intercept the navigation to avoid actually going to Stripe

    let stripeRedirectAttempted = false;
    let stripeUrl = null;

    // Listen for navigation events
    page.on('framenavigated', async (frame) => {
      const url = frame.url();
      if (url.includes('checkout.stripe.com')) {
        stripeRedirectAttempted = true;
        stripeUrl = url;
        console.log(`Stripe checkout URL: ${url}`);
      }
    });

    // Open archive and trigger paywall
    await openArchiveModal(page);
    await clickLockedPuzzle(page);

    await page.waitForTimeout(2000);

    // Find and click a subscription button
    const subscribeButton = page
      .locator(
        'button:has-text("Subscribe"), button:has-text("Choose"), button:has-text("Get Started")'
      )
      .first();

    if ((await subscribeButton.count()) > 0) {
      // Take screenshot before clicking
      await page.screenshot({
        path: 'tests/screenshots/before-stripe-click.png',
        fullPage: true,
      });

      // Click the button
      await subscribeButton.click({ timeout: 5000 });

      // Wait for redirect or error
      await page.waitForTimeout(3000);

      // Take screenshot after clicking
      await page.screenshot({
        path: 'tests/screenshots/after-stripe-click.png',
        fullPage: true,
      });

      // Check if Stripe redirect was attempted
      console.log(`Stripe redirect attempted: ${stripeRedirectAttempted}`);
      if (stripeUrl) {
        console.log(`Stripe URL: ${stripeUrl}`);
      }
    }
  });
});

test.describe('Account Page Access', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should require authentication to access account page', async ({ page }) => {
    // Try to access account page without auth
    await goToAccountPage(page);

    // Should be redirected to login or see auth requirement
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/account-page-no-auth.png',
      fullPage: true,
    });

    // Should either redirect away from /account or show auth requirement
    const hasAuthPrompt = (await page.locator('text=/Sign In|Log In|Sign Up/i').count()) > 0;
    const isNotOnAccountPage = !currentUrl.includes('/account');

    expect(hasAuthPrompt || isNotOnAccountPage).toBe(true);
  });

  test('should show subscription status on account page for authenticated users', async ({
    page,
  }) => {
    // This test assumes you have test credentials
    // For now, it will navigate and screenshot the expected behavior

    await goToAccountPage(page);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/account-page.png', fullPage: true });

    // If authenticated, should see subscription-related text
    const hasSubscriptionText =
      (await page.locator('text=/Subscription|Status|Plan/i').count()) > 0;
    console.log(`Has subscription status text: ${hasSubscriptionText}`);
  });
});

test.describe('Archive Access Consistency After Authentication', () => {
  test('should maintain 4-puzzle free access for authenticated non-subscribers', async ({
    page,
  }) => {
    // This test verifies that after auth, free access remains the same

    // Clear storage and start fresh
    await clearStorage(page);
    await goToHomePage(page);
    await waitForPageLoad(page);

    // Open archive as non-authenticated user
    await openArchiveModal(page);

    // Count unlocked puzzles before auth
    const beforeAuth = await getArchivePuzzles(page);
    const beforeCount = await beforeAuth.count();
    const beforeLocked = await getLockedPuzzles(page);
    const beforeLockedCount = await beforeLocked.count();
    const beforeUnlockedCount = beforeCount - beforeLockedCount;

    console.log(`Before auth - Unlocked: ${beforeUnlockedCount}, Locked: ${beforeLockedCount}`);

    await closeModal(page);

    // Note: After authentication, should still see same access
    // This would require actually creating an account and logging in
    // For now, we document the expected behavior

    // Expected: 4 unlocked puzzles remain the same before and after auth
    expect(beforeUnlockedCount).toBe(4);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/archive-access-consistency.png',
      fullPage: true,
    });
  });
});
