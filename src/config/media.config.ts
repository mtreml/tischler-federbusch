import type { MediaConfig } from '@/lib/config/schema/media.schema'

/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA CONFIGURATION

   This site carries exactly one video (the autoplaying landing master) and one
   responsive image (the Works image, WP-03). The pipeline reads this file;
   nothing about it is an environment variable, and nothing reaches a
   third-party origin.
   ══════════════════════════════════════════════════════════════════════════════ */

export const media: MediaConfig = {
  /* ── Content media comes off the filesystem ───────────────────────────────────
     Every logical `/media/…` path resolves to a **same-origin** path served out
     of `public/media`, which is a link the pipeline writes (`media:link`); the
     media itself is not in git. Switching providers later is one edit here —
     until then `local` is the only value the pipeline (WP-03) honours. */
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
     must carry its measurement in a comment. The number below is the
     **starting point, not the answer**: 23 is x264's documented default and
     the figure WP-03 measures from. The doctrine (atreoscope): find the
     smallest CRF indistinguishable from the master at 1:1; a tripod shot of a
     still subject is indistinguishable several steps above 23 and halves what
     every visitor autoplays — 27 is the likely landing point for this
     footage, but the number is only as good as the measurement beside it.
     `media:generate` (WP-03) records the measurement here when it takes it.

     Capped at 1920 rather than at the image ladder's 2560: the master is
     decoded frame by frame on the visitor's device, and the rungs above 1920
     buy resolution no viewport this site targets shows a *moving* image at.
     `maxWidth` never upscales, so the figure stays a bound and not a target. */
  videoEncode: {
    landing: { maxWidth: 1920, crf: 23 },
  },

  lazyLoadOffscreen: true,
}
