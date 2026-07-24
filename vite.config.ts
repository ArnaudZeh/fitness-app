/// <reference types="vitest/config" />
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this as a project page (arnaudzeh.github.io/fitness-app/),
// not from the domain root — every other target (dev server, a future
// custom-domain host) does serve from root, so the subpath only applies
// when explicitly building for Pages.
const base = process.env.GITHUB_PAGES === 'true' ? '/fitness-app/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest (a custom src/sw.ts), not the default generateSW —
      // generateSW's auto-generated worker has no room for custom push /
      // notificationclick listeners, needed for P6b's wellness reminders.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Fitness',
        short_name: 'Fitness',
        description: 'Suivi de musculation, hypoxie intermittente et bien-être',
        lang: 'fr',
        theme_color: '#0b0f14',
        background_color: '#0b0f14',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', './e2e/**'],
  },
})
