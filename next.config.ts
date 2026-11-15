import { networkInterfaces } from 'node:os'

import { generateBuildId } from '@mtreml/portfolio-core/next'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/* The build ID rule — why a revision-derived ID, why the commit, why the dirty-tree
   suffix — lives with the implementation in `@mtreml/portfolio-core/next`.
 */

/**
 * This machine's non-loopback IPv4 addresses, for `allowedDevOrigins`.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────
 * Testing a layout on a real phone means browsing the dev server over the WiFi
 * (`http://<this-machine>:3000`). `next dev` already listens on `0.0.0.0`, so that reaches it —
 * but Next's dev-only cross-site guard allowlists just `localhost`, `*.localhost` and the bound
 * hostname, which is the literal `0.0.0.0` and matches nothing.
 *
 * The failure that causes is worth naming, because it does not look like a configuration
 * problem: documents and static assets carry no `Origin` header, so **the page loads and looks
 * entirely correct**. The Fast Refresh WebSocket handshake does send one, and it alone gets a
 * 403. The symptom is that edits stop appearing on the phone while they still appear on the
 * laptop — which reads as a caching problem, not an allowlist one.
 *
 * ── Why the interfaces rather than a literal address ───────────────────────────
 * The `Origin` the phone sends back is *this server's* address, not the phone's, so the set to
 * allow is exactly the set of addresses this machine is reachable at — which is what
 * `networkInterfaces` returns. A hardcoded IP would be a lie the first time DHCP renewed the
 * lease or the laptop joined another network, and a `192.168.*.*` wildcard would allow origins
 * this server never answers on.
 *
 * Dev-only, and inert everywhere else: `allowedDevOrigins` is read by `next dev` and has no
 * bearing on the export, so nothing here can reach a built artefact or the VPS.
 */
function lanDevOrigins(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .flatMap((iface) =>
      iface !== undefined && iface.family === 'IPv4' && !iface.internal ? [iface.address] : [],
    )
}

const nextConfig: NextConfig = {
  /* Static export. Produces plain HTML, CSS and JS
     that deploys to any EU host with no Node runtime to operate or patch. */
  output: 'export',

  /* Reach the dev server from a phone on the same WiFi — see lanDevOrigins above. */
  allowedDevOrigins: lanDevOrigins(),

  /* The export is reproducible per revision — the rule and the failure notice live in
     `@mtreml/portfolio-core/next`. */
  generateBuildId: () => generateBuildId(process.cwd()),

  /* Without this the export writes `/<locale>/index.html` for nothing and `impressum.html`
     while every link points at `/<locale>/impressum-datenschutz/`, and a plain static host
     404s on every internal link. */
  trailingSlash: true,

  /* An accepted cost: a static export has no runtime image optimizer, so responsive
     variants are generated at build time by the media pipeline (`npm run media:generate`,
     the engine of `@mtreml/portfolio-core/pipeline`) and pages emit explicit srcset/sizes
     instead. */
  images: {
    unoptimized: true,
  },

  /* Fail the build on a type error rather than shipping past it. This is also gate 3 in its
     own right; set here so a bare `next build` cannot come out greener than the gate
     chain. Linting is gate 4 and runs as its own step — Next 16 no longer accepts an `eslint`
     key here, so the chain is the only place it lives. */
  typescript: {
    ignoreBuildErrors: false,
  },

  experimental: {
    /* ── Required by this architecture, not chosen for convenience ────────────────
       `src/app/global-not-found.tsx` needs this flag. Next 16's own documentation names exactly
       our two conditions as the cases it exists for: "your app has multiple root layouts … so
       there's no single layout to compose a global 404 from", and "your root layout is defined
       using top-level dynamic segments (e.g. `app/[country]/layout.tsx`)". Both hold here,
       because `<html lang>` has to match the URL locale — see `src/app/[locale]/layout.tsx`.

       The alternatives were measured against the emitted output rather than guessed:
         • `not-found.tsx` inside the `(entry)` route group is **silently ignored** — the build
           succeeds and Next's built-in "This page could not be found" is exported instead.
         • `not-found.tsx` at the app root with no layout above it gets an auto-generated shell,
           so the page renders `<html>` inside `<body>`: invalid nested documents, with the outer
           `<html>` carrying no `lang`.

       The exposure is bounded and stated rather than discovered later: if the flag is
       withdrawn, the fallback is one top-level `app/layout.tsx` plus `not-found.tsx`, and
       `<html lang>` on localized pages then needs another mechanism. The end-to-end suite
       asserts the 404 document's content, its status and its `lang`, so a regression fails a
       gate instead of shipping. */
    globalNotFound: true,
  },

  /* Security headers are deliberately absent: a `headers()` export is not applied
     under a static export. They live in the web-server configuration, which is the only
     place they take effect. */
}

export default withNextIntl(nextConfig)
