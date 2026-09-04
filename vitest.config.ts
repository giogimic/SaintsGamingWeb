import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
  },
  resolve: {
    alias: [
      { find: '@/auth', replacement: path.resolve(__dirname, './auth') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
