import { defineRouting } from 'next-intl/routing'

/* ══════════════════════════════════════════════════════════════════════════════
   ROUTING

   ── WP-01 state: the locales come from a local constant ─────────────────────────
   WP-02 introduces the central configuration, and this module then derives `locales`
   and `defaultLocale` from `site.languages.*` — the one source of truth — exactly as
   atreoscope does. Until then the constant below is the single place they live; nothing
   else in the app declares a locale set.

   The site is German only, by decision: one configured locale, no English route, no
   language switch, no locale detection. The machinery still carries the prefix and the
   map, so adding a locale later is a configuration change, not an architecture one.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The configured locale set, in configured order. */
export const locales = ['de']
export const defaultLocale: (typeof locales)[number] = 'de'

/**
 * The route identifiers the App Router knows, as opposed to the segments a visitor sees.
 *
 * **Route directory names are internal, not URLs**. The directory is
 * `src/app/[locale]/impressum-datenschutz/`, and the segment happens to be the same word —
 * on a single-locale site where nothing translates, that is a coincidence the map exists to
 * keep from becoming a convention.
 */
export type AppPathname = '/' | '/impressum-datenschutz'

/**
 * The localized pathname map. Single locale, untranslated segments, so the values are plain
 * strings rather than per-locale records; the record shape is what `segmentsFor(site.routes.*)`
 * produces in WP-02 and is already accepted here, which is what keeps that change local.
 */
export const localizedPathnames: Record<AppPathname, string | Record<string, string>> = {
  '/': '/',
  '/impressum-datenschutz': '/impressum-datenschutz',
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames: localizedPathnames,

  /* Every locale carries its prefix. The bare domain is handled explicitly instead —
     both halves of it: a generated redirect document *and* a server-level
     redirect. A static export has no middleware to negotiate anything. */
  localePrefix: 'always',

  /* No cookie: the locale lives in the URL, so nothing needs storing. */
  localeCookie: false,

  /* The language is fixed — never detected from browser headers, IP address or any
     other signal. */
  localeDetection: false,
  alternateLinks: false,
})
