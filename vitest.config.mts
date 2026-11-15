import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/* The unit gate. WP-01 covers the i18n seam — the pathname map and the
   trailing-slash helper — the one place a wrong path 404s on a plain static host.
   The suites for the central configuration (WP-02), the media declarations (WP-03)
   and the face (WP-04) have landed; the views' (WP-05–07) join as those packages do. */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      /* Mirrors the tsconfig path, declared rather than inferred so the two cannot drift
         into resolving differently. */
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/unit/setup.ts'],
    server: {
      deps: {
        /* `next-intl`'s ESM build imports `next/navigation` without a file extension, and
           Next 16 ships no `exports` map — so Node's own ESM resolution cannot find it and
           the import fails. Vite's resolver does the extension lookup, so the dependency is
           processed rather than externalized. It matters because the i18n suite asserts the
           *localized* paths `getPathname` returns. */
        inline: ['next-intl'],
      },
    },
    env: {
      NODE_ENV: 'test',
    },
  },
})
