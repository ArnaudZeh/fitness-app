/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Injected by vite.config.ts's `define` — short git SHA and build
// timestamp, computed at build time.
declare const __APP_VERSION__: string
declare const __BUILD_DATE__: string
