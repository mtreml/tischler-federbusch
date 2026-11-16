import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { defaultLocale } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT PATH RESOLUTION, HALF ONE OF TWO

   **The root path does not resolve to the default locale by itself.** Under a static export
   there is no middleware and no rewrite, so it has to be implemented explicitly — and
   *both halves are needed*:

     1. THIS FILE — a generated `/index.html` that redirects to `/<defaultLocale>/`, using
        `<meta http-equiv="refresh">` **plus a real `<a>` link** so it works with scripting
        disabled, and a canonical link so search engines do not read it as a duplicate.

     2. A SERVER-LEVEL REDIRECT, shipped with the web-server configuration. That is
        what actually serves visitors; this document is the fallback for hosts where a
        server redirect cannot be configured.

   ── The refresh meta is rendered in the body, not declared in `metadata` ─────────
   Next's Metadata API has no `http-equiv` field. Passing it through `metadata.other` emits
   `<meta name="refresh">`, which does nothing at all — a redirect document that silently
   does not redirect. React 19 hoists `<meta>` rendered anywhere in the tree into
   `<head>`, so rendering the real `http-equiv` tag from the component is both correct and
   the only way to emit it.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Built through the navigation helper, so it is the *localized* landing path. */
const target = pathFor({ href: '/', locale: defaultLocale })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: defaultLocale })

  return {
    title: t('rootRedirect.title'),
    description: t('rootRedirect.description'),
    /* The redirect declares its target, so the entry point is not read as a duplicate of
       the default-locale landing page. Absolute: a relative canonical link keeps working
       silently when the origin is wrong. (Finalized with the central configuration;
       the canonical host is the decided `https://www.tischler-federbusch.at`. */
    alternates: {
      canonical: `https://www.tischler-federbusch.at${target}`,
    },
  }
}

export default async function RootRedirectPage() {
  const t = await getTranslations({ locale: defaultLocale })

  return (
    <main id="main-content">
      {/* An immediate refresh. A delay would be a visible flash of a page that exists only
          to redirect. Hoisted into <head> by React 19. */}
      <meta httpEquiv="refresh" content={`0; url=${target}`} />

      <h1>
        {/*
          One sentence, and it is the link. A real link, not only a meta refresh: with
          scripting disabled — and where a browser or an extension declines to follow the
          refresh — this is what gets the visitor to the default locale.

          A plain <a> rather than the locale-aware Link on purpose: this document sits
          outside the [locale] segment, so there is no current locale to be relative to.
          The href comes from `pathFor`, so it is still the localized path from the map.
        */}
        <a href={target}>{t('rootRedirect.link')}</a>
      </h1>
    </main>
  )
}
