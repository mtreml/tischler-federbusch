import { z } from 'zod'

import { checkedString, isAssetPath } from './shared'

// Mirrors `media.config.ts`. Only `local` is implemented; other sources are not honoured by the pipeline.
export const MEDIA_SOURCES = ['local', 'objectStorage', 'external'] as const
export const VIDEO_PROVIDERS = ['local', 'objectStorage', 'external'] as const

// The last format must stay universally supported: it is the fallback of `<picture>`.
export const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'] as const

// `crf` 0–51 is x264's own range; the right value is a measurement, recorded beside the number in `media.config.ts`.
const videoEncodeProfile = z.object({
  maxWidth: z.number().int().positive(),
  crf: z.number().int().min(0).max(51),
})

export const mediaSchema = z.object({
  source: z.enum(MEDIA_SOURCES),
  videoProvider: z.enum(VIDEO_PROVIDERS),

  basePath: checkedString(isAssetPath, 'must be a rooted asset path'),

  imageWidths: z.array(z.number().int().positive()),

  imageFormats: z.array(z.enum(IMAGE_FORMATS)),

  videoEncode: z.object({
    landing: videoEncodeProfile,
  }),

  lazyLoadOffscreen: z.boolean(),
})

export type MediaConfig = z.infer<typeof mediaSchema>
export type MediaSource = (typeof MEDIA_SOURCES)[number]
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number]
export type ImageFormat = (typeof IMAGE_FORMATS)[number]
