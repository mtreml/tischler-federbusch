import { describe, expect, it } from 'vitest'

import de from '@/i18n/messages/de.json'
import en from '@/i18n/messages/en.json'

import { pathFor } from '@/i18n/paths'
import { defaultLocale, locales, routing } from '@/i18n/routing'

/* ══════════════════════════════════════════════════════════════════════════════
   THE i18n SEAM

   The two things a wrong path 404s on a plain static host, and the one locale set
   the site is configured with. Both stay stable as later work replaces their
   inputs: the locales are derived from the central configuration, and every new
   route joins the map rather than bypassing it.
   ══════════════════════════════════════════════════════════════════════════════ */

describe('the locale set', () => {
  it('is German by default, with English beside it', () => {
    expect(locales).toEqual(['de', 'en'])
    expect(defaultLocale).toBe('de')
  })

  it('always prefixes the locale, never detects it', () => {
    expect(routing.localePrefix).toBe('always')
    expect(routing.localeDetection).toBe(false)
  })
})

describe('pathFor', () => {
  it('returns the localized landing path with the trailing slash the export writes', () => {
    expect(pathFor({ href: '/', locale: defaultLocale })).toBe('/de/')
  })

  it('returns the legal page path with the trailing slash the export writes', () => {
    expect(pathFor({ href: '/impressum-datenschutz', locale: defaultLocale })).toBe(
      '/de/impressum-datenschutz/',
    )
  })

  // The export writes the route directory's name; a translated segment would 404 without a rewrite.
  it('keeps the legal page segment untranslated for English', () => {
    expect(pathFor({ href: '/impressum-datenschutz', locale: 'en' })).toBe(
      '/en/impressum-datenschutz/',
    )
  })
})

describe('the message files', () => {
  function keys(messages: object, prefix = ''): string[] {
    return Object.entries(messages).flatMap(([key, value]) =>
      typeof value === 'object' && value !== null
        ? keys(value, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
  }

  it('carry the same keys in every locale', () => {
    expect(keys(en).sort()).toEqual(keys(de).sort())
  })
})
