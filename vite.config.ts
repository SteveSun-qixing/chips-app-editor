import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@chips/components': resolve(__dirname, 'src/shims/chips-components'),
    },
  },
  server: {
    port: 5174,
    host: true,
    fs: {
      allow: [resolve(__dirname, '..')],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
  },
  clearScreen: false,
});
