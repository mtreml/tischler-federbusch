import type { MediaConfig } from '@/lib/config/schema/media.schema'
import {
  mediaSourceRegistry,
  videoDeliveryRegistry,
  type ImplementedMediaSource,
  type ImplementedVideoProvider,
} from '@mtreml/portfolio-core/media'

/* MEDIA CONFIGURATION
   This site carries exactly one video (the autoplaying landing master) and one responsive
   image (the Works image). The pipeline reads this file; nothing reaches a third-party origin. */

export const media: MediaConfig = {
  /* Content media comes off the filesystem: same-origin, served from `public/media` (a link
     the pipeline writes; the media itself is not in git). `local` is the only value the pipeline honours. */
  source: 'local',
  videoProvider: 'local',

  /* Root of the content asset tree, so no component hard-codes a media path. */
  basePath: '/media',

  /* The width ladder, fixed once. Mobile-first: 90 % of visitors are phones in portrait. The
     mobile band keeps a rung of its own (800): a phone at DPR 2 asks for 720–786 device pixels,
     and without it every one would land on 960 and fetch 78 % more pixels than it can show. */
  imageWidths: [320, 480, 640, 800, 960, 1280, 1600, 1920, 2560],

  /* Modern formats first, a universally supported fallback last — the last rung must stay universal. */
  imageFormats: ['avif', 'webp', 'jpeg'],

  /* One profile: the autoplaying landing master, encoded from
     media-originals/…/VID_20261114_082951.mp4 (11 s, 4K) by `media:generate`.

     Measured (frame 150 of the original, 3840×2160 → 1920), against the master's own decode at 1920:
     CRF 23 → 33.2 dB PSNR / 0.89 SSIM; **CRF 27 → 30.2 dB / 0.78**; CRF 29 → 28.9 dB / 0.70.
     A lossless re-encode (CRF 0) reaches 54.7 dB, so the ceiling is the master's own fine texture,
     not the encoder — and the differential PSNR between two-CRF steps is flat at 30.9–32.4 dB
     across 23→33, i.e. there is **no knee**: below 27 each step buys fidelity at a constant rate.
     Full 11 s encodes at 1920: 10.7 MB (23) vs **4.5 MB (27)** vs 3.0 MB (29).

     27 is the landing point: the master is a muted backdrop that 90 % of visitors receive at
     720–800 device pixels, where the downscale low-passes exactly the detail the curve trades, and
     1:1 is a case no viewport this site targets shows. 27 is the smallest CRF whose cost the visit
     can carry — indistinguishability at 1:1 is not metric-provable for this source; this comment is
     the record of that.

     Capped at 1920, not the image ladder's 2560: the master is decoded frame by frame on the
     visitor's device, and the rungs above buy resolution no targeted viewport shows a moving image at.
     `maxWidth` never upscales, so the figure stays a bound and not a target. */
  videoEncode: {
    landing: { maxWidth: 1920, crf: 27 },
  },

  lazyLoadOffscreen: true,
}

/* THE RENDER-SIDE VIDEO DELIVERY
   The same registry the pipeline writes from, keyed by the provider above. The render side names
   the master's *logical* path and the adapter resolves it through the committed manifest into the
   served file. A literal `satisfies` makes an unimplemented provider name a type error here, not
   a runtime failure on a visitor's page. */
const VIDEO_PROVIDER = 'local' satisfies ImplementedVideoProvider

export const videoDelivery = videoDeliveryRegistry[VIDEO_PROVIDER]

/* THE RENDER-SIDE IMAGE DELIVERY
   The image analogue of the video delivery, for the one responsive image the site carries (Works).
   Same registry, keyed by the source above; a literal `satisfies` for the same reason. */
const IMAGE_SOURCE = 'local' satisfies ImplementedMediaSource

export const imageDelivery = mediaSourceRegistry[IMAGE_SOURCE]
