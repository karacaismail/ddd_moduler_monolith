import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cpSync, existsSync } from 'node:fs';

/**
 * publicDir = 'content' (cluster JSON'ları + manifest.json)
 * public/   = PWA dosyaları (manifest.webmanifest, sw.js, offline.html, robots.txt)
 *             → closeBundle hook ile dist/'e kopyalanır.
 */
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
  plugins: [
    {
      name: 'copy-public-assets',
      apply: 'build',
      closeBundle() {
        const src = resolve(__dirname, 'public');
        const dest = resolve(__dirname, 'dist');
        if (existsSync(src)) {
          cpSync(src, dest, { recursive: true });
          console.log('[copy-public-assets] public/ → dist/ kopyalandı');
        }
      },
    },
  ],
});
