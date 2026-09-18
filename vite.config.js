import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
