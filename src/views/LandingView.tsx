import { setRequestLocale } from 'next-intl/server'

import { LandingStage } from '@/components/media/LandingStage'
import { site } from '@/config/site.config'
import { media, videoDelivery } from '@/config/media.config'
import { toLogicalPath } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING (WP-05)

   The full-viewport first screenful: the muted looping master as backdrop,
   the lockup (mark stacked on the wordmark) centered over it, the 1.5 s
   deblur/fade intro, and the name's scroll-driven travel into its header
   slot. The server half of the view: this file resolves the configured
   logical path through the media manifest (the WP-03 seam — the render side
   names logical paths and lets the core helpers produce the served files)
   and the stage does the rest.

   The heading is structure rather than display — the wordmark carries the
   page's visible name — so it stays in the accessibility tree and is hidden
   visually. It reads `identity.displayName`, so there is no second name to
   keep in step.
   ══════════════════════════════════════════════════════════════════════════════ */

export default async function LandingView({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  /* The configured value is a served asset path; the delivery adapter speaks
     logical paths — the served path with `media.basePath` removed — and the
     manifest is what makes one a file. The `validate-config` cross-check
     guarantees the configured path names declared media (WP-05). */
  const video = videoDelivery.resolveVideo([toLogicalPath(site.landing.video, media.basePath)])

  return (
    <section className="landing" aria-label={site.identity.displayName}>
      <h1 className="sr-only">{site.identity.displayName}</h1>
      <LandingStage
        video={video}
        label={site.landing.videoLabel}
        objectFit={site.landing.objectFit}
        introDurationMs={site.landing.introDurationMs}
      />
    </section>
  )
}
