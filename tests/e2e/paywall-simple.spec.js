const { test, expect } = require('@playwright/test');

/**
 * Simplified Paywall and Authentication E2E Tests
 * Tests the web subscription system with correct navigation flow
 */

test.describe('Paywall and Account System Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear cookies and storage
    await context.clearCookies();

    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for React hydration

    // Click "Play Today's Puzzle" to enter game interface
    const playButton = page.locator('button:has-text("Play Today")');
    await playButton.click();
    await page.waitForTimeout(2000);
  });

  test('should display archive button after entering game', async ({ page }) => {
    // Take screenshot of game screen
    await page.screenshot({ path: 'tests/screenshots/01-game-screen.png', fullPage: true });

    // Look for all buttons to find archive/calendar
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons in game interface`);

    for (let i = 0; i < Math.min(allButtons.length, 15); i++) {
      const text = await allButtons[i].textContent();
      const ariaLabel = await allButtons[i].getAttribute('aria-label');
      console.log(`Button ${i + 1}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
    }

    // Try to find archive/calendar button
    const archiveButtons = await page
      .locator('button[aria-label*="Archive"], button[aria-label*="Calendar"], button[aria-label*="archive"], button[aria-label*="calendar"]')
      .all();

    console.log(`Found ${archiveButtons.length} archive-related buttons`);

    expect(archiveButtons.length).toBeGreaterThan(0);
  });

  test('should open archive modal and show puzzles', async ({ page }) => {
    // Find and click archive button (try multiple possible selectors)
    const archiveButton = page
      .locator('button[aria-label*="Archive"], button[aria-label*="Calendar"]')
      .first();

    if (await archiveButton.count() > 0) {
      await archiveButton.click();
      await page.waitForTimeout(2000);

      // Take screenshot of archive
      await page.screenshot({ path: 'tests/screenshots/02-archive-modal.png', fullPage: true });

      // Look for puzzle elements
      const puzzleElements = await page.locator('button:has-text("Puzzle #")').all();
      console.log(`Found ${puzzleElements.length} puzzles in archive`);

      // Count locked puzzles
      const lockedPuzzles = await page.locator('text=/Puzzle #.*🔒/').all();
      console.log(`Found ${lockedPuzzles.length} locked puzzles`);

      // Count unlocked (last 4 should be unlocked)
      const unlockedCount = puzzleElements.length - lockedPuzzles.length;
      console.log(`Unlocked puzzles: ${unlockedCount}`);

      expect(puzzleElements.length).toBeGreaterThan(0);

      // CORE TEST: Verify exactly 4 puzzles are unlocked (free access)
      expect(unlockedCount).toBe(4);
    } else {
      console.log('❌ Archive button not found after entering game');
      throw new Error('Archive button not found');
    }
  });

  test('should trigger paywall or auth modal when clicking locked puzzle', async ({ page }) => {
    // Open archive
    const archiveButton = page
      .locator('button[aria-label*="Archive"], button[aria-label*="Calendar"]')
      .first();

    await archiveButton.click();
    await page.waitForTimeout(2000);

    // Find a locked puzzle (has 🔒)
    const lockedPuzzle = page.locator('button:has-text("🔒")').first();

    if (await lockedPuzzle.count() > 0) {
      await lockedPuzzle.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/03-after-locked-click.png', fullPage: true });

      // Check for modal (either paywall or auth)
      const bodyText = await page.locator('body').textContent();

      const hasPaywallContent =
        bodyText?.includes('Unlimited') ||
        bodyText?.includes('Subscribe') ||
        bodyText?.includes('Buddy Pass') ||
        bodyText?.includes('Best Friends') ||
        bodyText?.includes('Soulmates');

      const hasAuthContent =
        bodyText?.includes('Sign In') ||
        bodyText?.includes('Sign Up') ||
        bodyText?.includes('Log In') ||
        bodyText?.includes('Create Account');

      console.log('Has paywall content:', hasPaywallContent);
      console.log('Has auth content:', hasAuthContent);

      // Should show either paywall or auth modal
      expect(hasPaywallContent || hasAuthContent).toBe(true);
    } else {
      console.log('⚠️  No locked puzzles found (might be a new app with only 4 puzzles)');
    }
  });

  test('should show subscription tiers if paywall is displayed', async ({ page }) => {
    // Open archive and click locked puzzle
    const archiveButton = page
      .locator('button[aria-label*="Archive"], button[aria-label*="Calendar"]')
      .first();
    await archiveButton.click();
    await page.waitForTimeout(2000);

    const lockedPuzzle = page.locator('button:has-text("🔒")').first();

    if (await lockedPuzzle.count() > 0) {
      await lockedPuzzle.click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/04-paywall-tiers.png', fullPage: true });

      const pageContent = await page.textContent('body');

      // Check for subscription tiers
      const hasBuddyPass = pageContent?.includes('Buddy Pass') || pageContent?.includes('$1.99');
      const hasBestFriends =
        pageContent?.includes('Best Friends') || pageContent?.includes('$14.99');
      const hasSoulmates = pageContent?.includes('Soulmates') || pageContent?.includes('$29.99');

      console.log('Buddy Pass visible:', hasBuddyPass);
      console.log('Best Friends visible:', hasBestFriends);
      console.log('Soulmates visible:', hasSoulmates);

      // If paywall is shown, should show pricing
      if (pageContent?.includes('Unlimited') || pageContent?.includes('Subscribe')) {
        // At least one tier should be visible
        const hasAnyTier = hasBuddyPass || hasBestFriends || hasSoulmates;
        expect(hasAnyTier).toBe(true);
      }
    }
  });

  test('should access account page (web only)', async ({ page }) => {
    // Navigate to account page
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/05-account-page.png', fullPage: true });

    const pageContent = await page.textContent('body');

    // Should either show account page or redirect/require auth
    const hasAccountContent =
      pageContent?.includes('Account') ||
      pageContent?.includes('Subscription') ||
      pageContent?.includes('Sign In') ||
      pageContent?.includes('Log In');

    console.log('Has account-related content:', hasAccountContent);

    expect(hasAccountContent).toBe(true);
  });
});
