import { NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Menu } from '@/components/layout/Menu'
import { TransitionOverlay } from '@/components/layout/TransitionOverlay'
import { site } from '@/config/site.config'
import { pathFor } from '@/i18n/paths'
import { routing } from '@/i18n/routing'
import { MenuProvider } from '@/lib/menu'
import { localize, resolveCanonicalUrl } from '@/lib/config/resolve'

import '@/styles/globals.css'

/* Root layout under the dynamic `[locale]` segment (the Next-documented i18n pattern), so
   `<html lang>` is the locale from the URL. The menu and transition overlay mount here —
   deliberately no `template.tsx`: that remounts on every navigation and `AnimatePresence`
   can never hold the outgoing tree. */

/* Site-wide metadata from central config; pages override title/description/canonical and inherit the OG set. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  const title = localize(site.seo.title, locale)
  const description = localize(site.seo.defaultDescription, locale)
  const canonical = resolveCanonicalUrl(pathFor({ href: '/', locale }))
  const ogImage = resolveCanonicalUrl(site.seo.ogImage)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: site.identity.displayName,
      type: 'website',
      locale,
      images: [{ url: ogImage }],
    },
    icons: { icon: '/tab-icon.svg', apple: '/apple-touch-icon.png' },
  }
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // `[locale]` catches unknown top-level paths; an unrecognised locale gets the not-found document.
  if (!hasLocale(routing.locales, locale)) notFound()

  // Opts the subtree into static rendering; without it next-intl treats the request as dynamic.
  setRequestLocale(locale)

  const t = await getTranslations({ locale })

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale}>
          <MenuProvider>
            <a className="skip-link" href="#main-content">
              {t('common.skipToContent')}
            </a>
            <main id="main-content">{children}</main>
            <Menu />
            <TransitionOverlay />
          </MenuProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
