/**
 * Authentication Helper Functions for Playwright Tests
 */

/**
 * Sign up with email and password
 * @param {import('@playwright/test').Page} page
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @param {string} credentials.fullName
 */
export async function signUp(page, { email, password, fullName }) {
  // Wait for the AuthModal to be visible
  await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 10000 });

  // Check if we need to switch to signup mode
  const signUpButton = page.locator('button:has-text("Create Account")');
  if (await signUpButton.isVisible()) {
    // Already in signup mode
  } else {
    // Switch to signup mode
    await page.click('text=/.*[Ss]ign [Uu]p.*/');
  }

  // Fill in the form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Full name field (if present in signup mode)
  const fullNameInput = page.locator('input[placeholder*="name" i]');
  if (await fullNameInput.count() > 0) {
    await fullNameInput.fill(fullName);
  }

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for success (modal closes or success message)
  await page.waitForTimeout(2000);
}

/**
 * Sign in with email and password
 * @param {import('@playwright/test').Page} page
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 */
export async function signIn(page, { email, password }) {
  // Wait for the AuthModal to be visible
  await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 10000 });

  // Ensure we're in login mode
  const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Log In")');
  if (!(await loginButton.isVisible())) {
    // Switch to login mode
    await page.click('text=/.*[Ll]og [Ii]n.*|.*[Ss]ign [Ii]n.*/');
  }

  // Fill in the form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for success
  await page.waitForTimeout(2000);
}

/**
 * Sign out
 * @param {import('@playwright/test').Page} page
 */
export async function signOut(page) {
  // Open settings or account menu
  await page.click('[data-testid="settings-button"], button:has-text("Settings")');

  // Click sign out button
  await page.click('button:has-text("Sign Out"), button:has-text("Log Out")');

  // Wait for sign out to complete
  await page.waitForTimeout(1000);
}

/**
 * Check if user is authenticated
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(page) {
  // Check for presence of user-specific UI elements
  const accountButton = page.locator('[href="/account"], button:has-text("Account")');
  return await accountButton.count() > 0;
}

/**
 * Generate a unique test email
 * @returns {string}
 */
export function generateTestEmail() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@tandemtest.com`;
}

/**
 * Clear browser storage (cookies, localStorage, sessionStorage)
 * @param {import('@playwright/test').Page} page
 */
export async function clearStorage(page) {
  await page.context().clearCookies();

  // Only clear storage if page is loaded (to avoid security errors)
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore security errors for unloaded pages
      }
    });
  } catch (error) {
    // Ignore - page may not be loaded yet
  }
}
