import { defineRouting } from 'next-intl/routing'

import { site } from '@/config/site.config'

/* ══════════════════════════════════════════════════════════════════════════════
   ROUTING

   The locale set and the route segments come from the central configuration
   (`site.languages.*`, `site.routes.*`) — the one source of truth. This module
   declares no copy of either, which the unit suite asserts: a locale written
   here would be a second declaration, and the day the configuration and this
   file disagree the site breaks in exactly one locale and looks fine in the
   default one.

   The site is German only, by decision: one configured locale, no English
   route, no language switch, no locale detection. The machinery still carries
   the prefix and the map, so adding a locale later is a configuration change,
   not an architecture one.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The configured locale set, in configured order. Derived, never re-declared. */
export const locales = site.languages.supported
export const defaultLocale = site.languages.default

/**
 * The route identifiers the App Router knows, as opposed to the segments a visitor sees.
 *
 * **Route directory names are internal, not URLs**. The directory is
 * `src/app/[locale]/impressum-datenschutz/`, and the configured segment happens
 * to be the same word — on a single-locale site where nothing translates, that
 * is a coincidence the map exists to keep from becoming a convention.
 */
export type AppPathname = '/' | '/impressum-datenschutz'

/**
 * The localized pathname map. The legal page's segments are read from
 * `site.routes.impressum` per locale — the record shape is what a translated
 * site supplies, and the map already accepts it, which is what keeps a second
 * locale a configuration change.
 */
export const localizedPathnames: Record<AppPathname, string | Record<string, string>> = {
  '/': '/',
  '/impressum-datenschutz': site.routes.impressum,
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
