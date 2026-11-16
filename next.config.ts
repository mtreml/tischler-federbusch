import { networkInterfaces } from 'node:os'

import { generateBuildId } from '@mtreml/portfolio-core/next'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// This machine's non-loopback IPv4 addresses, for `allowedDevOrigins`.
// A phone on WiFi 403s on the Fast Refresh handshake only; its `Origin` is this server's
// address, so the allowed set is exactly this machine's addresses. Dev-only.
function lanDevOrigins(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .flatMap((iface) =>
      iface !== undefined && iface.family === 'IPv4' && !iface.internal ? [iface.address] : [],
    )
}

const nextConfig: NextConfig = {
  output: 'export',  // plain HTML/CSS/JS, no Node runtime to operate

  allowedDevOrigins: lanDevOrigins(),

  generateBuildId: () => generateBuildId(process.cwd()),  // reproducible per revision

  // Without this the export 404s on every internal link (links point at `/<locale>/…/`, files land elsewhere).
  trailingSlash: true,

  // No runtime image optimizer under a static export: variants are built by the media pipeline, pages emit explicit srcset/sizes.
  images: {
    unoptimized: true,
  },

  // Fail the build on a type error (gate 3); linting is gate 4 and runs as its own step.
  typescript: {
    ignoreBuildErrors: false,
  },

  experimental: {
    // Required by this architecture: multiple root layouts + `[locale]` at the top level, because
    // `<html lang>` must match the URL locale. The alternatives were measured, not guessed — the
    // route-group `not-found.tsx` is silently ignored, and a root one nests `<html>` in `<body>`.
    globalNotFound: true,
  },

  // Security headers deliberately absent: a `headers()` export is not applied under a static export.
  // They live in the web-server configuration.
}

export default withNextIntl(nextConfig)
