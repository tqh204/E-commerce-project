import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(__dirname, 'views', 'frontend'),
  plugins: [react()],
  base: '/react-app/',
  resolve: {
    alias: {
      '@frontend-utils': path.resolve(__dirname, 'utils', 'frontend'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'public/react-app'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname, 'utils', 'frontend'),
        path.resolve(__dirname, 'views', 'frontend'),
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
