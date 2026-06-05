import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  // GitHub Pages alt-dizin: CI'da VITE_BASE=/<repo>/ set edilir; lokalde "/" kalır.
  base: process.env.VITE_BASE || '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@content': resolve(__dirname, 'content'),
    },
  },
  server: {
    port: 5173,
    open: false,
    fs: {
      // content dizinine erişim için
      allow: ['..'],
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
  json: {
    stringify: false,
  },
  publicDir: 'content',
});
