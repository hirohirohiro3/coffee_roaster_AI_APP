import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to the root of the web server
  await page.goto('/');

  // Wait for the login form to be visible
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

  // Fill in the credentials
  await page.locator('#loginEmail').fill('test@example.com');
  await page.locator('#loginPassword').fill('testpass123');

  // Click the login button
  await page.locator('#loginButton').click();

  // Wait for the main content to be visible after login
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 });

  // Save the authentication state to a file
  await page.context().storage_state({ path: authFile });
});
