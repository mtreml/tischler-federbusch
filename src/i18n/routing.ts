import { defineRouting } from 'next-intl/routing'

import { site } from '@/config/site.config'

// Locales and route segments are read from the central config — never re-declared here.
// German only: one locale, no switching, no detection. Adding a locale later is a config change.

/** Configured locale set, in configured order. */
export const locales = site.languages.supported
export const defaultLocale = site.languages.default

/** Route directory names are internal, not URLs — the map keeps that from becoming a convention. */
export type AppPathname = '/' | '/impressum-datenschutz'

/** Legal segments come from `site.routes.impressum` per locale; the record shape already supports translation. */
export const localizedPathnames: Record<AppPathname, string | Record<string, string>> = {
  '/': '/',
  '/impressum-datenschutz': site.routes.impressum,
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames: localizedPathnames,

  // Bare domain is handled by an explicit redirect, not negotiation (static export).
  localePrefix: 'always',

  // Locale lives in the URL — nothing to store.
  localeCookie: false,

  // Language is fixed; never detected from browser signals.
  localeDetection: false,
  alternateLinks: false,
})
