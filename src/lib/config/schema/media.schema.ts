import { z } from 'zod'

import { checkedString, isAssetPath } from './shared'

/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA CONFIGURATION SCHEMA — mirrors `src/config/media.config.ts`.

   `media.source` and `media.videoProvider` **are** the switches for where the
   assets are resolved from. The enums list the names the pipeline knows about;
   only `local` is implemented for this site, and selecting anything else is a
   configuration the media pipeline does not honour.
   ══════════════════════════════════════════════════════════════════════════════ */

export const MEDIA_SOURCES = ['local', 'objectStorage', 'external'] as const
export const VIDEO_PROVIDERS = ['local', 'objectStorage', 'external'] as const

/**
 * Output formats, in preference order. The **last rung must stay universally
 * supported**: a `<picture>` takes the first `<source>` the browser understands,
 * so the final entry is the one that has to work everywhere in the browser
 * baseline and below it.
 */
export const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'] as const

/**
 * One video encode profile. `crf` is bounded at 0–51 because that is x264's own
 * range and a value outside it is a typo rather than an unusual choice — ffmpeg
 * would clamp it silently and the master would come back at a quality nobody
 * asked for. What the right figure inside it is is not portable between encoder
 * builds: it is a measurement, and the measurement sits beside the number in
 * `media.config.ts`.
 */
const videoEncodeProfile = z.object({
  /** Output width bound. Never upscales, so a narrower master stays its own width. */
  maxWidth: z.number().int().positive(),
  crf: z.number().int().min(0).max(51),
})

export const mediaSchema = z.object({
  source: z.enum(MEDIA_SOURCES),
  videoProvider: z.enum(VIDEO_PROVIDERS),

  /** Root of the content asset tree, so no component hard-codes a media path. */
  basePath: checkedString(isAssetPath, 'must be a rooted asset path'),

  /**
   * The width ladder, fixed once here rather than per call site. The Works image
   * is the only responsive image the site carries, and it is
   * mobile-first: the lower rungs are the ones 90 % of the visitors actually use.
   */
  imageWidths: z.array(z.number().int().positive()),

  /** Output formats, in preference order. The last rung must be universally supported. */
  imageFormats: z.array(z.enum(IMAGE_FORMATS)),

  /**
   * One profile rather than two: this site carries one video, the autoplaying
   * landing master, and it is on the critical path of every visit.
   */
  videoEncode: z.object({
    landing: videoEncodeProfile,
  }),

  /** Deferred loading of off-screen media. */
  lazyLoadOffscreen: z.boolean(),
})

export type MediaConfig = z.infer<typeof mediaSchema>
export type MediaSource = (typeof MEDIA_SOURCES)[number]
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number]
export type ImageFormat = (typeof IMAGE_FORMATS)[number]
