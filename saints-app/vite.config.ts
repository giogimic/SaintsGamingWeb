import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  base: './',
  publicDir: path.resolve(__dirname, '../public'),
  plugins: [react(), tailwindcss()],
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
      { find: 'next-themes', replacement: path.resolve(__dirname, './src/shims/nextThemesShim.ts') },
      { find: 'next/link', replacement: path.resolve(__dirname, './src/shims/nextLinkShim.tsx') },
      { find: 'next/image', replacement: path.resolve(__dirname, './src/shims/nextImageShim.tsx') },
      { find: 'next/navigation', replacement: path.resolve(__dirname, './src/shims/nextNavigationShim.ts') },
      { find: '@/app', replacement: path.resolve(__dirname, '../app') },
      { find: '@', replacement: path.resolve(__dirname, '../src') },
      { find: '~', replacement: path.resolve(__dirname, './src') },
    ],
  },
  build: {
    emptyOutDir: false,
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
