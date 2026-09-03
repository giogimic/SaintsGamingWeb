import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: [
      { find: 'next-auth/react', replacement: path.resolve(__dirname, './src/providers/NextAuthShim.tsx') },
      { find: '@/auth', replacement: path.resolve(__dirname, './src/providers/NextAuthShim.tsx') },
      { find: '@prisma/client', replacement: path.resolve(__dirname, './src/shims/prismaShim.ts') },
      { find: '.prisma/client/index-browser', replacement: path.resolve(__dirname, './src/shims/prismaShim.ts') },
      { find: '.prisma/client', replacement: path.resolve(__dirname, './src/shims/prismaShim.ts') },
      { find: '@/web/lib/prisma', replacement: path.resolve(__dirname, './src/shims/prismaShim.ts') },
      { find: '@/app', replacement: path.resolve(__dirname, '../app') },
      { find: '@', replacement: path.resolve(__dirname, '../src') },
      { find: '~', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
