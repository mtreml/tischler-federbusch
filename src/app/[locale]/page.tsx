import { setRequestLocale } from 'next-intl/server'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { WorksSection } from '@/components/content/WorksSection'
import LandingView from '@/views/LandingView'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING PAGE — ONE SCROLL

   The site is a single page: the full-viewport landing, then the works
   section and the footer below it in the same document — "Arbeiten"
   is the only menu anchor, and it scrolls rather than navigates. The header
   floats over the whole of it; the menu and the transition overlay mount in
   the `[locale]` layout and nowhere else.
   ══════════════════════════════════════════════════════════════════════════════ */

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <>
      <Header />
      <LandingView params={params} />
      {/* The works section: the `#arbeiten` target the menu anchor and
          the transition sequence scroll to, in this same document. */}
      <WorksSection />
      {/* The footer: the last child of `<main>`, below the works
          section — the one-scroll document ends here. */}
      <Footer />
    </>
  )
}
