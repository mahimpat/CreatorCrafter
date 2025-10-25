import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'),
  publicDir: path.join(__dirname, 'resources/assets'),
  base: './',
  resolve: {
    alias: {
      '@renderer': path.join(__dirname, 'src/renderer'),
      '@common': path.join(__dirname, 'src/common'),
    },
  },
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.join(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
});
