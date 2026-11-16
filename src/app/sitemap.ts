import type { MetadataRoute } from 'next'

import { locales, type AppPathname } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

/* ══════════════════════════════════════════════════════════════════════════════
   /sitemap.xml — a stub, to be finalized.

   The framework's file convention, which under `output: 'export'` writes a real
   `out/sitemap.xml` at build time rather than serving it from a route handler. It sits at
   the app root, above both root layouts, because a metadata route needs no layout and the
   sitemap belongs to the site rather than to a locale — the localized URLs are inside it.

   One entry per page per configured locale. The paths go through `pathFor`, so they carry
   the trailing slash the export writes — a sitemap URL without it is a 404 on a plain
   static host.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * REQUIRED under `output: 'export'`, and the build says so rather than guessing.
 *
 * A metadata route is a `GET` route handler, and route handlers are not cached by default
 * in Next 16 — so a static export refuses to collect one that has not opted in:
 * `export const dynamic = "force-static" … not configured on route "/sitemap.xml" with
 * "output: export"`. Without it the build fails outright, which is the right failure and an
 * unobvious one.
 */
export const dynamic = 'force-static'

const ORIGIN = 'https://www.tischler-federbusch.at'

/* Every routable page of the site — the map in `@/i18n/routing` stays the single list of
   them, and this list names them by route identifier. */
const PAGES: AppPathname[] = ['/', '/impressum-datenschutz']

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    PAGES.map((href) => ({
      url: `${ORIGIN}${pathFor({ href, locale })}`,
      /* The locale is the only one, and it is in the URL — no alternates to declare. */
    })),
  )
}
