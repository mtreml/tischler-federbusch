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

/* ══════════════════════════════════════════════════════════════════════════════
   SITE CONFIGURATION SCHEMA — mirrors `src/config/site.config.ts` group for group
   and key for key, in the order it declares them.

   Legal keys live in `legal.schema.ts` and media keys in `media.schema.ts`; both
   are their own configuration module.

   ── What this file does NOT hold ───────────────────────────────────────────────
   • The locale set as a second copy. `i18n/routing.ts` derives `locales` and
     `defaultLocale` from `languages.*` in the configuration.
   • Design values. Colour, type scale, spacing, breakpoint widths, name geometry
     and easing curves are in `src/config/tokens.css`.
   ══════════════════════════════════════════════════════════════════════════════ */

/** A `routes.*` key: one URL segment per configured locale. */
const routeSegmentPerLocale = z.record(
  z.string(),
  checkedString(isRouteSegment, 'must be a lowercase, hyphen-separated URL segment'),
)

/**
 * One entry of the menu list, in the order the menu renders it — the menu renders
 * exactly this list and nothing else. `tel` and `email` carry no label: both
 * resolve their display text and their target from `contact` at render time, so
 * there is no second place for the number or the address to live.
 */
const anchorItem = z.object({
  type: z.literal('anchor'),
  /** The key into `routes.anchors`; the target id itself lives there. */
  anchor: checkedString(isAnchorId, 'must be a lowercase id, e.g. "arbeiten"'),
  /** Visible label. */
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
  /* ── Identity ───────────────────────────────────────────────────────────────── */
  identity: z.object({
    displayName: z.string(),
    tagline: z.string(),
    /**
     * The bare registered domain, for reference. It is not a URL: the bare domain
     * 301s to the www one at the server level (WP-09), and every URL this site
     * emits is built from `canonicalOrigin`.
     */
    domain: z.string(),
    /** Every emitted URL is built from this one key and no other. */
    canonicalOrigin: checkedString(
      isAbsoluteOrigin,
      'must be an absolute origin with no trailing slash, e.g. https://www.example.com',
    ),
  }),

  /* ── Languages ─────────────────────────────────────────────────────────────────
     The single source of truth for the locale set. `i18n/routing.ts` reads these
     and declares no copy of its own. German only, by decision: one configured
     locale, no visible switch — the machinery carries the prefix and the map, so
     a second locale later is a configuration change, not an architecture one. */
  languages: z.object({
    supported: z.array(checkedString(isLocaleCode, 'must be a BCP 47 language tag')),
    default: z.string(),
  }),

  /**
   * `routes.impressum` is a per-locale map: a project that translates its segments
   * supplies one value per configured locale, one that does not supplies the same
   * value for each. Locale parity is a cross-key rule in `../validate.ts`, because
   * the shape cannot know the locale set.
   */
  routes: z.object({
    home: z.literal('/'),
    impressum: routeSegmentPerLocale,
    /** The on-page anchors a menu item may point at, by the key `navigation.items` uses. */
    anchors: z.record(z.string(), checkedString(isAnchorId, 'must be a lowercase id')),
  }),

  /* ── Contact ───────────────────────────────────────────────────────────────────
     THE ONE PLACE CONTACT DETAILS EXIST. The menu (WP-06), the footer (WP-07) and
     the legal page (WP-07) all read them here, so they cannot disagree. */
  contact: z.object({
    name: z.string(),
    addressLines: z.array(z.string()),
    /** The human form, as it appears in the menu. */
    phoneDisplay: z.string(),
    /** The `tel:` target, E.164. Must name the same number as `phoneDisplay`. */
    phoneHref: checkedString(isTelHref, 'must be an E.164 number, e.g. +436644107272'),
    /** The `mailto:` target, and the display text of the email menu entry. */
    email: checkedString(isEmail, 'must be an email address'),
  }),

  /* ── Footer ────────────────────────────────────────────────────────────────────
     The copyright holder is not a key: it resolves to `contact.name` at render
     time, so clearing the contact name clears it with it. The legal link is a
     plain link with plain navigation — no transition overlay (WP-06). */
  footer: z.object({
    legalLabel: z.string(),
    /** Renders as "Website von {credit}". */
    credit: z.string(),
    creditUrl: checkedString(isHttpsUrl, 'must be an https URL'),
  }),

  /* ── SEO ───────────────────────────────────────────────────────────────────────
     German by decision — the site has one locale, so the strings are plain
     rather than per-locale records. */
  seo: z.object({
    /** `%s` is replaced with the document's own title; pages supply only their own. */
    titleTemplate: z.string(),
    defaultDescription: z.string(),
    structuredDataType: z.enum(['Person', 'Organization']),
    /** The Works image (WP-03), as a logical asset path under `media.basePath`. */
    ogImage: checkedString(isAssetPath, 'must be a rooted asset path'),
  }),

  /* ── Landing ───────────────────────────────────────────────────────────────────
     The autoplaying, looping, audio-stripped master (WP-03 encodes it; the
     encode strips the audio, which is why the text alternative is owed). */
  landing: z.object({
    /** Logical path of the landing master under `media.basePath`. */
    video: checkedString(isAssetPath, 'must be a rooted asset path'),
    /** The intro — video deblur plus logo/name fade-in — in one figure. 1.5 s. */
    introDurationMs: z.number().int().min(100).max(10_000),
    /** The a11y text alternative for the muted video. */
    videoLabel: z.string(),
    objectFit: z.enum(['cover', 'contain', 'fill']),
  }),

  /* ── Navigation ─────────────────────────────────────────────────────────────────
     The menu item list, in order. The menu renders this list and nothing else;
     an item is an anchor entry (label here, target in `routes.anchors`) or one
     of the two contact entries that resolve entirely from `contact`. */
  navigation: z.object({
    items: z.array(navigationItem),
  }),
})

export type SiteConfig = z.infer<typeof siteSchema>
export type NavigationItem = z.infer<typeof navigationItem>
