import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/* ══════════════════════════════════════════════════════════════════════════════
   LOCALE-AWARE NAVIGATION

   Every internal link in the application goes through these helpers, so the emitted href
   is always the *localized* segment. A raw `<a href="/impressum-datenschutz">` or a bare
   `next/link` bypasses the pathname map and 404s in exactly the locales that translate the
   segment — the failure mode that stays invisible in the default locale while the site is
   broken in every other language. The ESLint rule in `eslint.config.mjs` refuses those
   imports everywhere but here.

   This is the one module allowed to reach for the framework primitives, because it is
   where the localized versions are created.
   ══════════════════════════════════════════════════════════════════════════════ */

export const { Link, getPathname, usePathname } = createNavigation(routing)

/* ══════════════════════════════════════════════════════════════════════════════
   THE RAW PATHNAME AND THE RAW ROUTER

   `usePathname` above is next-intl's, and it returns the **internal** pathname —
   `/impressum-datenschutz`, not `/de/impressum-datenschutz/`. That is the right answer for
   building a link and the wrong one for reading *where the visitor actually is*: the page
   transition reads the finished, localized URL off the anchor the visitor clicked,
   and re-localizing it would be wrong.

   So the raw ones are exported under names that say which they are. They are only ever
   *read*; nothing builds an href from them, which is what the ESLint rule exists to
   prevent — and this module is where that rule is off.
   ══════════════════════════════════════════════════════════════════════════════ */
export { usePathname as useUrlPathname, useRouter as useUrlRouter } from 'next/navigation'
