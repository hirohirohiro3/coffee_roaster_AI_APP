import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // .env ファイルをロード
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      // __DEFINES__ をロードした環境変数で上書き
      '__DEFINES__': JSON.stringify(env),
    },
    envDir: './',
    envPrefix: [],

    // エントリーポイントを明示的に指定
    build: {
      rollupOptions: {
        input: 'index.html'
      }
    },

    server: {
      watch: {
        // .log ファイルの変更を無視して無限ループを防ぐ
        ignored: ['**/*.log'],
      }
    }
  };
});
