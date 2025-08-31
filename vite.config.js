import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    '__DEFINES__': JSON.stringify({}),
  },
  envDir: './',
  envPrefix: [],

  // エントリーポイントを明示的に指定
  build: {
    rollupOptions: {
      input: 'index.html'
    }
  },

  // ▼▼▼ このブロックを追加 ▼▼▼
  server: {
    watch: {
      // .log ファイルの変更を無視して無限ループを防ぐ
      ignored: ['**/*.log'],
    }
  }
});
