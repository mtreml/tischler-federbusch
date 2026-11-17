import { defineRouting } from 'next-intl/routing'

import { site } from '@/config/site.config'

// Locales and route segments are read from the central config — never re-declared here; adding a locale is a config change.

export const locales = site.languages.supported
export const defaultLocale = site.languages.default

/** Route directory names are internal, not URLs — the map keeps that from becoming a convention. */
export type AppPathname = '/' | '/impressum-datenschutz'

const localizedPathnames: Record<AppPathname, string | Record<string, string>> = {
  '/': '/',
  '/impressum-datenschutz': site.routes.impressum,
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  pathnames: localizedPathnames,

  // Bare domain is handled by an explicit redirect, not negotiation (static export).
  localePrefix: 'always',

  localeCookie: false,
  localeDetection: false,
  alternateLinks: false,
})
