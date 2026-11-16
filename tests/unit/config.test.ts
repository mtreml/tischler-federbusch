import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { legal } from '@/config/legal.config'
import { media } from '@/config/media.config'
import { site } from '@/config/site.config'
import { defaultLocale, locales } from '@/i18n/routing'
import { siteSchema, type SiteConfig } from '@/lib/config/schema/site.schema'
import { validateConfiguration } from '@/lib/config/validate'

/* ══════════════════════════════════════════════════════════════════════════════
   THE CENTRAL CONFIGURATION

   Two invariants the site cannot survive losing:

     • A missing required value fails the production validation **by name** —
       the gate must name the key, because the fix is an edit in exactly one
       file.
     • The locale set is declared once, in the configuration. `i18n/routing.ts`
       derives it, and a second literal is what this suite keeps out.
   ══════════════════════════════════════════════════════════════════════════════ */

/** A copy of the committed configuration with one contact field removed. */
function withoutEmail(): SiteConfig {
  const contact = { ...site.contact }
  delete (contact as { email?: string }).email
  return { ...site, contact }
}

describe('the schema', () => {
  it('accepts the committed configuration', () => {
    expect(siteSchema.safeParse(site).success).toBe(true)
  })

  it('rejects a missing contact field, naming it', () => {
    const result = siteSchema.safeParse(withoutEmail())
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toContain('contact.email')
  })
})

describe('the production gate', () => {
  it('fails by name when contact.email is missing', () => {
    const report = validateConfiguration({
      site: withoutEmail(),
      legal,
      media,
      environment: 'production',
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('contact.email')
  })
})

describe('the works group', () => {
  it('names seo.ogImage among its images', () => {
    expect(site.works.images.map((entry) => entry.image)).toContain(site.seo.ogImage)
  })

  it('fails by name when seo.ogImage names no works image', () => {
    const broken = { ...site, seo: { ...site.seo, ogImage: '/media/arbeiten/other.jpg' } }
    const report = validateConfiguration({
      site: broken,
      legal,
      media,
      environment: 'production',
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('seo.ogImage')
  })

  it('fails by name when a works imageAlt is missing', () => {
    const images = site.works.images.map((entry, index) =>
      index === 1 ? { ...entry, imageAlt: '' } : entry,
    )
    const broken = { ...site, works: { ...site.works, images } }
    const report = validateConfiguration({
      site: broken,
      legal,
      media,
      environment: 'production',
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('works.images[1].imageAlt')
  })
})

describe('the locale set', () => {
  it('is derived from the configuration, not re-declared', () => {
    expect(locales).toEqual(site.languages.supported)
    expect(defaultLocale).toBe(site.languages.default)
  })

  it('declares no locale literal of its own in routing.ts', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'i18n', 'routing.ts'), 'utf8')
    /* A quoted `de` anywhere in the module is a second declaration. */
    expect(source).not.toMatch(/['"]de['"]/)
  })
})
