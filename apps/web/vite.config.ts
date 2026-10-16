import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// The dev server proxies /api so the browser stays same-origin and the refresh cookie just works.
// changeOrigin stays false: the API refuses any Host other than localhost (DNS-rebinding guard).
const API_TARGET = process.env.COINBOOK_API_URL ?? 'http://127.0.0.1:8082';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
  server: {
    port: 5373,
    host: '127.0.0.1',
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 5373,
    host: '127.0.0.1',
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
});
