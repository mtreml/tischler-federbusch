import { getTranslations } from 'next-intl/server'

import { defaultLocale, locales } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

import '@/styles/globals.css'

// An unmatched path has no language, so the page renders in every configured locale, default first; the web server must return it with a genuine 404.
// `global-not-found.tsx`, not `not-found.tsx`: Next bypasses rendering entirely, so this renders its own `<html>` and imports the stylesheet itself.


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
        {/* Bypassing rendering also bypasses the Metadata API — this file supplies the title (a11y gate: `document-title`); noindex: no layout above to carry it. */}
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
              {/* Plain anchors, deliberately: outside the [locale] segment there is no current locale for the locale-aware Link; the href comes from `pathFor`. */}
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
