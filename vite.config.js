import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'src', '.env') });

const apiPort = process.env.PORT || '3001';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
    allowedHosts: ['e-index-fr8e.onrender.com'],
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`
    }
  },
  preview: {
    allowedHosts: ['e-index-fr8e.onrender.com']
  }
});
