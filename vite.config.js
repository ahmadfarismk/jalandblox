import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Install to phone + works offline after the first visit (task F11)
    VitePWA({
      registerType: 'autoUpdate', // a new version replaces the old one on next open
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'JalanKL',
        short_name: 'JalanKL',
        description: 'Your guide from KLIA into KL, with a stamp for every landmark you visit.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Keep the app shell on the phone so it opens without signal
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      // Lets you write imports like '@/core/progress' instead of '../../core/progress'
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Lets a phone on the same Wi-Fi open the dev server
    host: true,
  },
});
