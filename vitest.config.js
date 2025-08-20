import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in a browser-like environment
    environment: 'jsdom',
  },
});
