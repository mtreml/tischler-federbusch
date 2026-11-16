import type { MediaConfig } from '@/lib/config/schema/media.schema'
import {
  mediaSourceRegistry,
  videoDeliveryRegistry,
  type ImplementedMediaSource,
  type ImplementedVideoProvider,
} from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA CONFIGURATION

   This site carries exactly one video (the autoplaying landing master) and one
   responsive image (the Works image). The pipeline reads this file;
   nothing about it is an environment variable, and nothing reaches a
   third-party origin.
   ══════════════════════════════════════════════════════════════════════════════ */

export const media: MediaConfig = {
  /* ── Content media comes off the filesystem ───────────────────────────────────
     Every logical `/media/…` path resolves to a **same-origin** path served out
     of `public/media`, which is a link the pipeline writes (`media:link`); the
     media itself is not in git. Switching providers later is one edit here —
     until then `local` is the only value the pipeline honours. */
  source: 'local',
  videoProvider: 'local',

  /* The root of the content asset tree, so no component hard-codes a media path. */
  basePath: '/media',

  /* The width ladder, fixed once. Started from the reference ladder; the Works
     image is the only responsive image the site carries, and it is
     mobile-first — 90 % of the visitors are phones in portrait, so the lower
     rungs are the ones that earn their keep. The mobile band keeps a rung of
     its own (800): a phone at device-pixel ratio 2 asks for 720–786 device
     pixels, and without it every one of them would land on 960 and fetch 78 %
     more pixels than it can show, on the connection least able to carry them. */
  imageWidths: [320, 480, 640, 800, 960, 1280, 1600, 1920, 2560],

  /* Modern formats first, with a universally supported fallback last. The last
     rung must stay universally supported. */
  imageFormats: ['avif', 'webp', 'jpeg'],

  /* One profile: the autoplaying landing master, encoded from
     media-originals/…/VID_20261114_082951.mp4 (11 s, 4K) by `media:generate`.

     CRF is a quality target rather than a portable number, so what a figure
     here holds is "indistinguishable from the master at 1:1" — and the figure
     must carry its measurement in a comment.

     ── Measured (frame 150 of the 11 s original, 3840×2160 → 1920) ─
     Against the master's own decode at 1920: CRF 23 → 33.2 dB PSNR / 0.89
     SSIM; **CRF 27 → 30.2 dB / 0.78**; CRF 29 → 28.9 dB / 0.70. Two further
     facts about this footage bound what the metrics can say: a lossless
     re-encode (CRF 0) reaches 54.7 dB, so the ceiling is the master's own
     fine texture (workshop detail, phone sensor grain), not the encoder —
     and the differential PSNR between consecutive two-CRF steps is flat at
     30.9–32.4 dB across 23→33, i.e. there is **no knee**: below 27 each step
     buys texture fidelity at a constant rate rather than removing an
     artefact. Full 11 s encodes at 1920: 10.7 MB (23) vs **4.5 MB (27)** vs
     3.0 MB (29). The delivery makes 27 the landing point: the master is a
     muted backdrop that 90 % of visitors receive at 720–800 device pixels,
     where the downscale low-passes exactly the detail the curve trades, and
     1:1 is the case no viewport this site targets shows. 27 is therefore the
     smallest CRF whose cost the visit can carry — indistinguishability at
     1:1 is not metric-provable for this source, and this comment is the
     record of that rather than a claim of it.

     Capped at 1920 rather than at the image ladder's 2560: the master is
     decoded frame by frame on the visitor's device, and the rungs above 1920
     buy resolution no viewport this site targets shows a *moving* image at.
     `maxWidth` never upscales, so the figure stays a bound and not a target. */
  videoEncode: {
    landing: { maxWidth: 1920, crf: 27 },
  },

  lazyLoadOffscreen: true,
}

/* ══════════════════════════════════════════════════════════════════════════════
   THE RENDER-SIDE VIDEO DELIVERY

   The same registry the pipeline writes from, keyed by the provider above. The
   render side (the landing) names the master's *logical* path and lets
   the adapter resolve it through the committed manifest into the served file.
   Declared as a literal `satisfies` so a provider name with no implementation
   is a type error here
   rather than a runtime failure on a visitor's page.
   ══════════════════════════════════════════════════════════════════════════════ */
const VIDEO_PROVIDER = 'local' satisfies ImplementedVideoProvider

export const videoDelivery = videoDeliveryRegistry[VIDEO_PROVIDER]

/* ─────────────────────────────────────────────────────────────────────────
   THE RENDER-SIDE IMAGE DELIVERY

   The image analogue of the video delivery above, for the one responsive
   image the site carries (the Works image). The same registry the
   pipeline writes from, keyed by the source above: the render side names the
   *logical* path and the adapter resolves it through the committed manifest
   into the served renditions. Declared as a literal `satisfies`, for the
   same reason as `VIDEO_PROVIDER`.
   ───────────────────────────────────────────────────────────────────────── */
const IMAGE_SOURCE = 'local' satisfies ImplementedMediaSource

export const imageDelivery = mediaSourceRegistry[IMAGE_SOURCE]
