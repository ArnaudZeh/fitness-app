/// <reference types="vitest/config" />
import path from 'node:path'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves this as a project page (arnaudzeh.github.io/fitness-app/),
// not from the domain root — every other target (dev server, a future
// custom-domain host) does serve from root, so the subpath only applies
// when explicitly building for Pages.
const base = process.env.GITHUB_PAGES === 'true' ? '/fitness-app/' : '/'

// Read directly from git rather than a hand-maintained package.json version
// (still at the Vite template's default "0.0.0") — commits land on main
// continuously with no release/tag process, so the short SHA is the only
// value that's always accurate. Surfaced small at the bottom of Profil as a
// build reference (e.g. to confirm a deploy actually landed).
function getGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(getGitSha()),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' + injectRegister: false — the app registers the SW itself
      // (src/components/UpdatePrompt.tsx) via virtual:pwa-register/react so
      // it can show a "Mettre à jour" banner instead of silently swapping
      // the app under the user mid-session (updates ship several times a
      // day; iOS home-screen PWAs otherwise only pick up a new SW on a full
      // force-quit + reopen).
      registerType: 'prompt',
      injectRegister: false,
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
