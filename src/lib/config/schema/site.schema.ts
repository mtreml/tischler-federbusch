import { z } from 'zod'

import {
  checkedString,
  isAbsoluteOrigin,
  isAnchorId,
  isAssetPath,
  isEmail,
  isHttpsUrl,
  isLocaleCode,
  isRouteSegment,
  isTelHref,
} from './shared'

// Mirrors `site.config.ts` group for group. Locales are derived in `i18n/routing.ts`; design values live in `tokens.css`.

const routeSegmentPerLocale = z.record(
  z.string(),
  checkedString(isRouteSegment, 'must be a lowercase, hyphen-separated URL segment'),
)

const anchorItem = z.object({
  type: z.literal('anchor'),
  anchor: checkedString(isAnchorId, 'must be a lowercase id, e.g. "arbeiten"'),
  label: z.string(),
})
const telItem = z.object({
  type: z.literal('tel'),
})
const emailItem = z.object({
  type: z.literal('email'),
})
const navigationItem = z.discriminatedUnion('type', [anchorItem, telItem, emailItem])

export const siteSchema = z.object({
  identity: z.object({
    displayName: z.string(),
    tagline: z.string(),
    domain: z.string(),
    canonicalOrigin: checkedString(
      isAbsoluteOrigin,
      'must be an absolute origin with no trailing slash, e.g. https://www.example.com',
    ),
  }),

  languages: z.object({
    supported: z.array(checkedString(isLocaleCode, 'must be a BCP 47 language tag')),
    default: z.string(),
  }),

  routes: z.object({
    home: z.literal('/'),
    impressum: routeSegmentPerLocale,
    anchors: z.record(z.string(), checkedString(isAnchorId, 'must be a lowercase id')),
  }),

  // The one place contact details exist: menu, footer and legal page all read them here.
  contact: z.object({
    name: z.string(),
    addressLines: z.array(z.string()),
    phoneDisplay: z.string(),
    // Must name the same number as `phoneDisplay`.
    phoneHref: checkedString(isTelHref, 'must be an E.164 number, e.g. +436644107272'),
    email: checkedString(isEmail, 'must be an email address'),
  }),

  // Copyright holder is not a key: it resolves to `contact.name` at render time.
  footer: z.object({
    legalLabel: z.string(),
    credit: z.string(),
    creditUrl: checkedString(isHttpsUrl, 'must be an https URL'),
  }),

  seo: z.object({
    title: z.string(),
    titleTemplate: z.string(),
    defaultDescription: z.string(),
    structuredDataType: z.enum(['Person', 'Organization']),
    ogImage: checkedString(isAssetPath, 'must be a rooted asset path'),
  }),

  landing: z.object({
    video: checkedString(isAssetPath, 'must be a rooted asset path'),
    introDurationMs: z.number().int().min(100).max(10_000),
    videoLabel: z.string(),
    objectFit: z.enum(['cover', 'contain', 'fill']),
  }),

  works: z.object({
    images: z
      .array(
        z.object({
          image: checkedString(isAssetPath, 'must be a rooted asset path'),
          imageAlt: z.string(),
        }),
      )
      .min(1),
  }),

  navigation: z.object({
    items: z.array(navigationItem),
  }),
})

export type SiteConfig = z.infer<typeof siteSchema>
export type NavigationItem = z.infer<typeof navigationItem>
