import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    '__DEFINES__': {},
  },
  envDir: './',
  envPrefix: [],

  // エントリーポイントを明示的に指定
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  }
});
