import { test as setup, expect } from '@playwright/test';

const authFile = 'jules-scratch/verification/auth.json';

setup('authenticate', async ({ page }) => {
  // Go to the login page
  await page.goto('/');

  // Wait for the login form to be visible
  await expect(page.locator('#loginForm')).toBeVisible();

  // Enter the credentials
  await page.locator('#loginEmail').fill('test@example.com');
  await page.locator('#loginPassword').fill('testpass123');

  // Click the login button
  await page.locator('#loginButton').click();

  // Wait for the main content to be visible, indicating a successful login.
  // This is a more reliable way to wait than waiting for a specific URL.
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 });

  // Check that the user info is displayed
  await expect(page.locator('#userInfo')).toBeVisible();
  await expect(page.locator('#userEmail')).toHaveText('test@example.com');

  // End of authentication steps.

  // Save the authentication state to a file.
  await page.context().storageState({ path: authFile });
  console.log(`Authentication state saved to ${authFile}`);
});
