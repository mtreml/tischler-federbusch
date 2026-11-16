import { site } from '@/config/site.config'
import { media, imageDelivery } from '@/config/media.config'
import { ParallaxImage } from '@/components/content/ParallaxImage'
import { FULL_BLEED_SIZES, toLogicalPath } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORKS SECTION — the landing page, below the fold

   The one-scroll document's second act: the tagline and the responsive
   Works image, in the same document as the landing — "Arbeiten" is the
   menu's one anchor, and it scrolls to this section rather than navigating.
   Everything this section carries is resolved from the central configuration
   at render, and the static export keeps prerendering it: the server half
   resolves the image here (the media seam), and the only client piece is the
   parallax on top of an otherwise plain `<picture>`.
   ══════════════════════════════════════════════════════════════════════════════ */

export function WorksSection() {
  /* The configured value is a served asset path; the delivery adapter speaks
     logical paths — the served path with `media.basePath` removed — and the
     committed manifest is what makes one a set of files. The `validate-config`
     cross-checks guarantee the configured path names declared media and that
     `works.image` and `seo.ogImage` name the same one. */
  const resolved = imageDelivery.resolveImage(toLogicalPath(site.works.image, media.basePath))

  return (
    <section id={site.routes.anchors.arbeiten} className="works">
      <p className="works__tagline">{site.identity.tagline}</p>
      {/* The manifest is committed and the gate keeps `works.image` declared, so the
          resolution is defined here; the degenerate renders the section without the
          image rather than a broken one. */}
      {resolved !== undefined && (
        <ParallaxImage
          sources={resolved.sources}
          src={resolved.src}
          sizes={FULL_BLEED_SIZES}
          width={resolved.width}
          height={resolved.height}
          alt={site.works.imageAlt}
        />
      )}
    </section>
  )
}
