/**
 * Navigation Helper Functions for Playwright Tests
 */

/**
 * Open the archive modal
 * @param {import('@playwright/test').Page} page
 */
export async function openArchiveModal(page) {
  // Click the archive/calendar button
  const archiveButton = page.locator(
    '[data-testid="archive-button"], button:has-text("Archive"), button:has-text("Calendar")'
  );
  await archiveButton.click();

  // Wait for modal to open
  await page.waitForSelector('[data-testid="archive-modal"], .archive-modal', {
    timeout: 10000,
  });

  // Wait for puzzles to load
  await page.waitForTimeout(1000);
}

/**
 * Close the currently open modal
 * @param {import('@playwright/test').Page} page
 */
export async function closeModal(page) {
  // Try to find and click close button
  const closeButton = page.locator(
    'button[aria-label="Close"], button:has-text("Close"), [data-testid="close-button"]'
  );

  if (await closeButton.count() > 0) {
    await closeButton.first().click();
  } else {
    // Press Escape key as fallback
    await page.keyboard.press('Escape');
  }

  await page.waitForTimeout(500);
}

/**
 * Get all puzzle items in the archive
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export async function getArchivePuzzles(page) {
  return page.locator('[data-testid="puzzle-item"], .puzzle-item, button:has-text("Puzzle #")');
}

/**
 * Get locked puzzle items in the archive
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export async function getLockedPuzzles(page) {
  return page.locator(
    '[data-testid="puzzle-item"]:has-text("🔒"), .puzzle-item:has-text("🔒"), button:has-text("Puzzle #"):has-text("🔒")'
  );
}

/**
 * Get unlocked puzzle items in the archive
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').Locator>}
 */
export async function getUnlockedPuzzles(page) {
  // Find puzzles without lock icon
  const allPuzzles = await getArchivePuzzles(page);
  const lockedPuzzles = await getLockedPuzzles(page);

  const allCount = await allPuzzles.count();
  const lockedCount = await lockedPuzzles.count();

  return {
    count: allCount - lockedCount,
    locator: allPuzzles,
  };
}

/**
 * Click on a locked puzzle to trigger paywall
 * @param {import('@playwright/test').Page} page
 */
export async function clickLockedPuzzle(page) {
  const lockedPuzzles = await getLockedPuzzles(page);
  const count = await lockedPuzzles.count();

  if (count === 0) {
    throw new Error('No locked puzzles found');
  }

  // Click the first locked puzzle
  await lockedPuzzles.first().click();

  // Wait for paywall modal
  await page.waitForTimeout(1000);
}

/**
 * Navigate to account page
 * @param {import('@playwright/test').Page} page
 */
export async function goToAccountPage(page) {
  await page.goto('/account');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to home page
 * @param {import('@playwright/test').Page} page
 */
export async function goToHomePage(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for page to be fully loaded
 * @param {import('@playwright/test').Page} page
 */
export async function waitForPageLoad(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000); // Extra buffer for React hydration
}
