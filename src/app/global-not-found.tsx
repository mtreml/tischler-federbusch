import { getTranslations } from 'next-intl/server'

import { defaultLocale, locales } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

import '@/styles/globals.css'

/* ══════════════════════════════════════════════════════════════════════════════
   NOT FOUND

   **An unmatched path has no language.** There is no language segment to read, and guessing
   one from request headers would contradict the requirement that the locale is fixed by the
   URL. The page therefore renders in every configured locale on one page, default locale
   first — which today means one block.

   Under a static export this emits `out/404.html`, and the web server must be pointed at it
   so an unknown path returns a genuine 404 status rather than a 200. The serving layer
   (`portfolio-serve` locally, Caddy on the VPS) does; a static host that serves this
   document with a success status is the failure mode to watch for, because search engines
   index it.

   ── Why this file sits at the app root and renders its own document ────────────
   This is `global-not-found.tsx`, not `not-found.tsx`, and the two are different
   conventions: `not-found` renders where a segment calls `notFound()`, while this one
   answers a URL that matches **no route at all**. Next skips rendering entirely and
   returns this document. It is experimental and needs `experimental.globalNotFound`;
   next.config.ts holds the flag and why this architecture requires it.

   Because Next bypasses rendering, nothing wraps this page — not a layout, and there is no
   `app/layout.tsx` in any case. So it renders its own `<html>` and imports the
   stylesheet itself. Without that it exports as an unstyled document with no `lang`
   attribute.

   `lang` is the default locale, and each language block carries its own `lang` so a screen
   reader switches pronunciation rather than reading German with another voice.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Default locale first, then the others in configured order. */
function orderedLocales(): string[] {
  const others = locales.filter((locale) => locale !== defaultLocale)
  return [defaultLocale, ...others]
}

export default async function NotFoundPage() {
  const blocks = await Promise.all(
    orderedLocales().map(async (locale) => {
      const t = await getTranslations({ locale })
      return {
        locale,
        title: t('notFound.title'),
        description: t('notFound.description'),
        toLanding: t('notFound.toLanding'),
        landingHref: pathFor({ href: '/', locale }),
        skip: t('common.skipToContent'),
      }
    }),
  )

  return (
    <html lang={defaultLocale}>
      <head>
        {/*
          `global-not-found` bypasses the app's normal rendering, and with it the Metadata
          API — so nothing supplies a `<title>` unless this file does. Without it the
          exported 404 document has no title at all, which the accessibility gate reports
          at serious severity (`document-title`) and which leaves the browser tab showing a
          bare URL.

          Marked not to be indexed: there is no layout above this page to carry it.
        */}
        <title>{blocks[0]?.title ?? 'Page not found'}</title>
        <meta name="robots" content="noindex, follow" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          {blocks[0]?.skip ?? 'Skip to content'}
        </a>
        <main id="main-content">
          {blocks.map((block, index) => (
            <section key={block.locale} lang={block.locale}>
              {/* Exactly one top-level heading per page: the default locale carries the
                  h1 and the other languages would follow as h2, which is also the reading
                  order. */}
              {index === 0 ? <h1>{block.title}</h1> : <h2>{block.title}</h2>}
              <p>{block.description}</p>
              {/*
                Plain anchors, deliberately. This document is reached at an arbitrary
                unmatched path outside the [locale] segment, so there is no current locale
                for the locale-aware Link to be relative to. The href comes from `pathFor`,
                so it is still the localized segment from the map, carrying the trailing
                slash the export writes.
              */}
              <nav aria-label={block.title}>
                <a href={block.landingHref}>{block.toLanding}</a>
              </nav>
            </section>
          ))}
        </main>
      </body>
    </html>
  )
}
