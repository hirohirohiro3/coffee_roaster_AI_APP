import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in a browser-like environment
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests-e2e/**'],
  },
});
