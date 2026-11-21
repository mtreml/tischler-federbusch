import { setRequestLocale } from 'next-intl/server'

import { Footer } from '@/components/layout/Footer'
import { WorksSection } from '@/components/content/WorksSection'
import LandingView from '@/views/LandingView'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING PAGE — ONE SCROLL

   The site is a single page: the full-viewport landing, then the works
   section and the footer below it in the same document — "Arbeiten"
   is the only menu anchor, and it scrolls rather than navigates. The header
   — the landing's, rendered by the intro it shares the fade with — floats
   over the whole of it; the menu and the transition overlay mount in the
   `[locale]` layout and nowhere else.
   ══════════════════════════════════════════════════════════════════════════════ */

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <LandingView params={params} />
      {/* The header's white bar: sticky, so the compositor moves it with the scroll — it rides the works
          section's top and pins once the landing is gone, never over the film. */}
      <div className="header-backdrop" aria-hidden="true" />
      {/* The works section: the `#arbeiten` target the menu anchor and
          the transition sequence scroll to, in this same document. */}
      <WorksSection locale={locale} />
      {/* The footer: the last child of `<main>`, below the works
          section — the one-scroll document ends here. */}
      <Footer locale={locale} />
    </>
  )
}
