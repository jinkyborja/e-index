import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    allowedHosts: ['e-index-fr8e.onrender.com'],
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  preview: {
    allowedHosts: ['e-index-fr8e.onrender.com']
  }
});
