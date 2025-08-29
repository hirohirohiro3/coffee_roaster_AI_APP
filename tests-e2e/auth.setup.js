import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to the root of the web server
  await page.goto('/');

  // Wait for the login form to be visible
  await expect(page.locator('#loginForm')).toBeVisible({ timeout: 10000 });

  // Switch to the sign-up form
  await page.locator('#showSignUpFormButton').click();
  await expect(page.locator('#signUpForm')).toBeVisible({ timeout: 10000 });

  // Fill in the credentials for sign-up
  const email = `test-${Date.now()}@example.com`;
  await page.locator('#signUpEmail').fill(email);
  await page.locator('#signUpPassword').fill('testpass123');

  // Click the sign-up button
  await page.locator('#signUpButton').click();

  // Wait for the app to fetch initial data from the Firestore emulator
  await page.waitForResponse(res => res.url().includes(':8081/'), { timeout: 10000 });

  // The main content container should become visible
  await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 });

  // And as a final check, wait for the main app title to be there.
  const heading = page.getByRole('heading', { name: 'コーヒー焙煎記録' });
  await expect(heading).toBeVisible({ timeout: 10000 });

  // Save the authentication state to a file
  await page.context().storageState({ path: authFile });
});
