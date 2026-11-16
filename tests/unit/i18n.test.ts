import { describe, expect, it } from 'vitest'

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
  it('is exactly the German locale, by decision', () => {
    expect(locales).toEqual(['de'])
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
})
