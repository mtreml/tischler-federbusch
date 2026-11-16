import { getTranslations } from 'next-intl/server'

import { defaultLocale, locales } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

import '@/styles/globals.css'

/* NOT FOUND
   An unmatched path has no language — no segment to read, and guessing from headers would
   contradict the locale-fixed-by-URL rule — so the page renders in every configured locale,
   default first (today: one block). The web server must return this with a genuine 404
   status, not a 200, or search engines index it.

   This is `global-not-found.tsx`, not `not-found.tsx`: it answers a URL that matches no route
   at all. Next bypasses rendering entirely, so nothing wraps this page — it renders its own
   `<html>` and imports the stylesheet itself, or it exports unstyled with no `lang`.
   `lang` is the default locale; each block carries its own `lang` for screen-reader pronunciation. */

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
          Bypassing rendering also bypasses the Metadata API — this file supplies the title,
          or the exported 404 has none (a11y gate: `document-title`). Noindex: no layout above
          this page to carry it.
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
              {/* One top-level heading per page: the default locale carries the h1. */}
              {index === 0 ? <h1>{block.title}</h1> : <h2>{block.title}</h2>}
              <p>{block.description}</p>
              {/*
                Plain anchors, deliberately: this document sits outside the [locale] segment,
                so there is no current locale for the locale-aware Link to be relative to.
                The href comes from `pathFor` — still the localized segment from the map.
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
