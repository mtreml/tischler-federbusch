import { getTranslations, setRequestLocale } from 'next-intl/server'

import { routing } from '@/i18n/routing'

/* ══════════════════════════════════════════════════════════════════════════════
   IMPRESSUM & DATENSCHUTZ — WP-01 PLACEHOLDER

   The only separate page on the site. WP-07 renders the legal text from the central
   configuration; the route and its static generation are real already.
   ══════════════════════════════════════════════════════════════════════════════ */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function ImpressumDatenschutzPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale })

  return (
    <section className="impressum-datenschutz">
      <h1>{t('impressumDatenschutz.placeholder')}</h1>
    </section>
  )
}
