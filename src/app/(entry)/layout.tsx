import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { defaultLocale } from '@/i18n/routing'

import '@/styles/globals.css'

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT LAYOUT FOR THE UNPREFIXED ENTRY POINTS — `/` and the not-found document.

   One of the two root layouts (see `src/app/[locale]/layout.tsx` for why there are two):
   there is no top-level `app/layout.tsx`, and Next 16's `global-not-found.tsx` — the
   document that answers a URL no route matches — needs exactly this split, because it
   renders its own `<html>`.

   The document beneath it carries the **default locale** — here, the only locale — as its
   `lang`, which is correct: the root path resolves to the default locale by design.

   These pages sit in a route group, so `(entry)` never appears in a URL — `/` stays `/`,
   which is what the framework requires when there is no top-level layout.
   ══════════════════════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  /* Neither document beneath this layout should be indexed: `/` is a redirect to the
     canonical entry point, and the not-found page is excluded from the sitemap. */
  robots: { index: false, follow: true },
  /* The tab icon is a square version of the `logo.svg` mark (WP-04), committed beside
     it in `public/`. */
  icons: { icon: '/tab-icon.svg' },
}

export default function EntryLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={defaultLocale}>
      <body className="entry">
        <a className="skip-link" href="#main-content">
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  )
}
