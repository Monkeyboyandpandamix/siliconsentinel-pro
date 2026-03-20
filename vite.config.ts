import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5000,
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/.local/**',
          '**/.cache/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/uploads/**',
          '**/*.db',
          '**/*.db-wal',
          '**/*.db-shm',
          '**/.replit',
          '**/replit.nix',
        ],
      },
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
