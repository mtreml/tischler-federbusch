import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { defaultLocale } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

// Root path resolution, half one of two: a generated `/index.html` that redirects to `/<defaultLocale>/` — the fallback for hosts where a
// server redirect cannot be configured. The refresh meta is rendered in the body: Next's Metadata API has no `http-equiv` field, and React 19 hoists it.
const target = pathFor({ href: '/', locale: defaultLocale })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: defaultLocale })

  return {
    title: t('rootRedirect.title'),
    description: t('rootRedirect.description'),
    // The redirect declares its target, so the entry point is not read as a duplicate; absolute on purpose.
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
