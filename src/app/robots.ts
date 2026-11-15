import type { MetadataRoute } from 'next'

/* ══════════════════════════════════════════════════════════════════════════════
   /robots.txt — WP-01 STUB, finalized in WP-08.

   Generated from the central configuration's indexing policy in WP-08; until then the site
   is open. The sitemap is referenced by **absolute URL** — a relative reference there is
   ignored without complaint, so the sitemap would simply never be found.
   ══════════════════════════════════════════════════════════════════════════════ */

/** Required under `output: 'export'` — the build says so rather than guessing. */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      /* Gate-closed until go-live (WP-09): the noindex state is enforced by the serving
         layer and by the per-page metadata, not by a crawler rule that would also block the
         pages from being followed into the sitemap. */
      allow: '/',
    },
    sitemap: 'https://www.tischler-federbusch.at/sitemap.xml',
  }
}
