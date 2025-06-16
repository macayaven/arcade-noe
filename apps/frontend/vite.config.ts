import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3002', // Backend runs on 3002
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
