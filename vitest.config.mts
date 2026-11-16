import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/* The unit gate. The i18n seam — the pathname map and the
   trailing-slash helper — is the one place a wrong path 404s on a plain static host.
   The suites for the central configuration, the media declarations
   and the face have landed; the views' suites join as those surfaces land. */
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
