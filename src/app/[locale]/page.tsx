import { getTranslations, setRequestLocale } from 'next-intl/server'

/* ══════════════════════════════════════════════════════════════════════════════
   LANDING PAGE — WP-01 PLACEHOLDER

   The real landing (WP-05) is a full-viewport muted looping video with the logo+name
   lockup centered over it, and the scroll-driven animation that carries the name up into
   its header position. Nothing of that exists yet — this placeholder exists so the route,
   the locale layout and the export are real before any design content lands.
   ══════════════════════════════════════════════════════════════════════════════ */

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale })

  return (
    <section className="landing">
      <h1>{t('landing.placeholder')}</h1>
    </section>
  )
}
