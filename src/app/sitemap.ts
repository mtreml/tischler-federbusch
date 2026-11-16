import type { MetadataRoute } from 'next'

import { locales, type AppPathname } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'

// One entry per page per locale; paths go through `pathFor`, so they carry the trailing slash the export writes.

// REQUIRED under `output: 'export'`: route handlers are not cached by default in Next 16 — the build fails outright without this.
export const dynamic = 'force-static'

const ORIGIN = 'https://www.tischler-federbusch.at'

const PAGES: AppPathname[] = ['/', '/impressum-datenschutz']

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    PAGES.map((href) => ({
      url: `${ORIGIN}${pathFor({ href, locale })}`,
    })),
  )
}
