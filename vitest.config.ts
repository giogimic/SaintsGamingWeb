import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 15000,
  },
  resolve: {
    alias: [
      { find: '@/auth', replacement: path.resolve(__dirname, './auth') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
    ],
  },
});
