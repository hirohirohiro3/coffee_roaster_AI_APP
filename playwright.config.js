// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './', // Scan from the project root

  // Explicitly ignore the vitest files
  testIgnore: '**/roastUtils.test.js',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /jules-scratch\/verification\/auth\.setup\.js/,
    },

    {
      name: 'chromium',
      // Only run the spec files in the verification folder
      testMatch: /jules-scratch\/verification\/.*\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        // Use prepared auth state.
        storageState: 'jules-scratch/verification/auth.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'python -m http.server 8080',
    cwd: 'public',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
