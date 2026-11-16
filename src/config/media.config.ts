import type { MediaConfig } from '@/lib/config/schema/media.schema'
import {
  mediaSourceRegistry,
  videoDeliveryRegistry,
  type ImplementedMediaSource,
  type ImplementedVideoProvider,
} from '@mtreml/portfolio-core/media'

/* One video (the autoplaying landing master) and one responsive image (the Works image); the pipeline reads this file, nothing reaches a third-party origin. */

export const media: MediaConfig = {
  // Content media comes off the filesystem: same-origin, served from `public/media` (a link the pipeline writes; the media itself is not in git).
  source: 'local',
  videoProvider: 'local',

  basePath: '/media',

  // The width ladder, fixed once. Mobile-first; the 800 rung: a phone at DPR 2 asks for 720–786 device pixels, and without it every one would land on 960.
  imageWidths: [320, 480, 640, 800, 960, 1280, 1600, 1920, 2560],

  /* Modern formats first, a universally supported fallback last — the last rung must stay universal. */
  imageFormats: ['avif', 'webp', 'jpeg'],

  // One profile: the landing master, encoded by `media:generate`. Measured against the master's own decode at 1920: CRF 27 → 30.2 dB / 0.78 SSIM, 4.5 MB;
  // differential PSNR is flat at 30.9–32.4 dB across 23→33 (no knee). Capped at 1920: the rungs above buy resolution no targeted viewport shows a moving image at.
  videoEncode: {
    landing: { maxWidth: 1920, crf: 27 },
  },

  lazyLoadOffscreen: true,
}

// The same registry the pipeline writes from; the render side names the master's logical path and the adapter resolves it through the committed manifest.
const VIDEO_PROVIDER = 'local' satisfies ImplementedVideoProvider

export const videoDelivery = videoDeliveryRegistry[VIDEO_PROVIDER]

const IMAGE_SOURCE = 'local' satisfies ImplementedMediaSource

export const imageDelivery = mediaSourceRegistry[IMAGE_SOURCE]
