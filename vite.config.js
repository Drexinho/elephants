import { defineConfig } from 'vite'

/**
 * Vývoj: spusťte v jednom terminálu `php -S 127.0.0.1:8080` a v druhém `npm run dev`.
 * Vite proxy přepošle jen /api a /uploads na PHP. /videos/ servíruje Vite z public/videos/ (aby úvodní video šlo i bez PHP).
 */
export default defineConfig({
  base: './',
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: false },
      '/uploads': { target: 'http://127.0.0.1:8080', changeOrigin: false },
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: ['index.html', 'blog.html', 'admin.html', 'podpor.html'],
    },
  },
})
