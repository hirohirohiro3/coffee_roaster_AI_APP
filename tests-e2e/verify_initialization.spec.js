import { test, expect } from '@playwright/test';

test('Page should load without console errors and show login form', async ({ page }) => {
  console.log('Test starting...');
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console Error]: ${msg.text()}`);
      errors.push(msg.text());
    } else {
      console.log(`[Browser Console]: ${msg.type()} - ${msg.text()}`);
    }
  });

  console.log('Navigating to page...');
  await page.goto('/');
  console.log('Page navigation complete.');

  console.log('Checking for console errors...');
  expect(errors).toHaveLength(0);
  console.log('Console error check complete.');

  console.log('Waiting for login button to be visible...');
  await expect(page.locator('#loginButton')).toBeVisible();
  console.log('Login button is visible.');
});
