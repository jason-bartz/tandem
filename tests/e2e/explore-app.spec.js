const { test, expect } = require('@playwright/test');

/**
 * Exploratory test to understand the app structure
 * This will help us identify the correct selectors
 */

test.describe('Explore App Structure', () => {
  test('should load homepage and explore UI elements', async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for React to hydrate

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/01-homepage.png', fullPage: true });

    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());

    // Try to find archive/calendar button
    const possibleArchiveButtons = await page.locator('button, [role="button"], a').all();
    console.log(`\nFound ${possibleArchiveButtons.length} clickable elements`);

    // Look for buttons with text containing archive, calendar, history, etc.
    const archiveRelatedButtons = await page
      .locator('button:has-text("Archive"), button:has-text("Calendar"), button:has-text("History"), [aria-label*="Archive"], [aria-label*="Calendar"]')
      .all();

    if (archiveRelatedButtons.length > 0) {
      console.log(`\nFound ${archiveRelatedButtons.length} archive-related buttons`);
      for (let i = 0; i < archiveRelatedButtons.length && i < 5; i++) {
        const text = await archiveRelatedButtons[i].textContent();
        const ariaLabel = await archiveRelatedButtons[i].getAttribute('aria-label');
        console.log(`  Button ${i + 1}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
      }

      // Try clicking the first one
      console.log('\nClicking first archive button...');
      await archiveRelatedButtons[0].click();
      await page.waitForTimeout(2000);

      // Take screenshot after click
      await page.screenshot({ path: 'test-results/02-after-archive-click.png', fullPage: true });

      // Check if modal appeared
      const modals = await page.locator('[role="dialog"], .modal, [class*="modal"]').all();
      console.log(`Found ${modals.length} modal(s) after click`);

      // Look for puzzles in the modal
      const puzzleElements = await page
        .locator('[class*="puzzle"], button:has-text("Puzzle"), [aria-label*="Puzzle"]')
        .all();
      console.log(`Found ${puzzleElements.length} puzzle-related elements`);

      if (puzzleElements.length > 0) {
        console.log('\nFirst 5 puzzle elements:');
        for (let i = 0; i < puzzleElements.length && i < 5; i++) {
          const text = await puzzleElements[i].textContent();
          const hasLock = text?.includes('🔒');
          console.log(`  Puzzle ${i + 1}: "${text?.trim()}" ${hasLock ? '(LOCKED)' : ''}`);
        }
      }
    } else {
      console.log('\n❌ No archive buttons found');

      // List all buttons to help debug
      console.log('\nAll buttons on page:');
      const allButtons = await page.locator('button').all();
      for (let i = 0; i < allButtons.length && i < 10; i++) {
        const text = await allButtons[i].textContent();
        const ariaLabel = await allButtons[i].getAttribute('aria-label');
        console.log(`  Button ${i + 1}: text="${text?.trim()}", aria-label="${ariaLabel}"`);
      }
    }

    // Check for navigation/settings
    const navButtons = await page
      .locator('button:has-text("Settings"), button:has-text("Menu"), [aria-label*="Settings"], [aria-label*="Menu"]')
      .all();
    console.log(`\nFound ${navButtons.length} navigation/settings buttons`);
  });

  test('should explore welcome screen structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Get all text content on page
    const bodyText = await page.locator('body').textContent();
    console.log('\nPage contains these keywords:');
    console.log('  - "Archive":', bodyText?.includes('Archive'));
    console.log('  - "Calendar":', bodyText?.includes('Calendar'));
    console.log('  - "Settings":', bodyText?.includes('Settings'));
    console.log('  - "Play":', bodyText?.includes('Play'));
    console.log('  - "Puzzle":', bodyText?.includes('Puzzle'));

    // Dump HTML structure for archive button area
    const html = await page.content();
    console.log('\nPage loaded successfully, HTML length:', html.length);
  });
});
