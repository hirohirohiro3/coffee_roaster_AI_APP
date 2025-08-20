import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = 'jules-scratch/verification/auth.json';

setup('authenticate', async ({ page }) => {
  // Get the absolute path to the index.html file
  const filePath = path.resolve(process.cwd(), 'public/index.html');

  // Navigate to the local file
  await page.goto(`file://${filePath}`);

  // Wait for the login form to be visible
  await expect(page.locator('#loginForm')).to_be_visible({ timeout: 10000 });

  // Fill in the credentials
  await page.locator('#loginEmail').fill('test@example.com');
  await page.locator('#loginPassword').fill('testpass123');

  // Click the login button
  await page.locator('#loginButton').click();

  // Wait for the main content to be visible after login
  await expect(page.locator('#main-content')).to_be_visible({ timeout: 10000 });

  // Save the authentication state to a file
  await page.context().storage_state({ path: authFile });
});
