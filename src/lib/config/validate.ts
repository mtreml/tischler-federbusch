import type { z } from 'zod'

import { legalSchema, type LegalConfig } from './schema/legal.schema'
import { mediaSchema, type MediaConfig } from './schema/media.schema'
import { siteSchema, type SiteConfig } from './schema/site.schema'

// Validation entry point: malformed/contradiction are always errors; unfilled is a warning in development, an error in production.

export type Environment = 'development' | 'production'
type FindingKind = 'malformed' | 'contradiction' | 'unfilled'

interface Finding {
  key: string
  kind: FindingKind
  message: string
}

export interface ValidationReport {
  environment: Environment
  errors: Finding[]
  warnings: Finding[]
  ok: boolean
}

export interface Inputs {
  site: SiteConfig
  legal: LegalConfig
  media: MediaConfig
  environment?: Environment
  tokenSource?: string
  declaredMediaPaths?: readonly string[]
}

// `0` and `false` are values, not absences — never treated as "empty".
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value as object).length === 0
  return false
}

class FindingCollector {
  private readonly findings: Finding[] = []

  add(key: string, kind: FindingKind, message: string): void {
    this.findings.push({ key, kind, message })
  }

  unfilled(key: string, message = 'is required and is empty'): void {
    this.add(key, 'unfilled', message)
  }

  contradiction(key: string, message: string): void {
    this.add(key, 'contradiction', message)
  }

  malformed(key: string, message: string): void {
    this.add(key, 'malformed', message)
  }

  require(key: string, value: unknown, message?: string): boolean {
    if (isBlank(value)) {
      this.unfilled(key, message)
      return false
    }
    return true
  }

  all(): Finding[] {
    return this.findings
  }
}

const digits = (value: string) => value.replace(/\D/g, '')

// `0664 410 72 72` and `+436644107272`: domestic `0` trades for the `43` country code.
function phoneFormsAgree(display: string, href: string): boolean {
  const d = digits(display)
  const h = digits(href)
  return h === d || h === d.replace(/^0/, '43')
}

function checkSite(site: SiteConfig, f: FindingCollector): void {
  const locales = site.languages.supported

  if (f.require('languages.supported', locales, 'is required — the site has no locale')) {
    if (new Set(locales).size !== locales.length) {
      f.contradiction('languages.supported', 'lists the same locale more than once')
    }
  }
  if (isBlank(site.languages.default)) {
    f.unfilled('languages.default', 'is required — the export needs a default locale')
  } else if (!locales.includes(site.languages.default)) {
    f.contradiction(
      'languages.default',
      `is "${site.languages.default}", which is not in languages.supported [${locales.join(', ')}]`,
    )
  }

  for (const locale of locales) {
    const segment = site.routes.impressum[locale]
    if (isBlank(segment)) {
      f.unfilled(
        `routes.impressum.${locale}`,
        `has no URL segment for configured locale "${locale}"`,
      )
    }
  }
  for (const declared of Object.keys(site.routes.impressum)) {
    if (!locales.includes(declared)) {
      f.contradiction(
        `routes.impressum.${declared}`,
        `declares a segment for "${declared}", which is not a configured locale`,
      )
    }
  }
  for (const [key, anchor] of Object.entries(site.routes.anchors)) {
    if (isBlank(anchor)) {
      f.unfilled(`routes.anchors.${key}`, 'is required and is empty')
    }
  }

  f.require('contact.name', site.contact.name)
  if (f.require('contact.addressLines', site.contact.addressLines)) {
    site.contact.addressLines.forEach((line, index) => {
      if (isBlank(line)) {
        f.unfilled(`contact.addressLines[${index}]`, 'is an empty address line')
      }
    })
  }
  f.require('contact.phoneDisplay', site.contact.phoneDisplay)
  f.require('contact.phoneHref', site.contact.phoneHref)
  f.require('contact.email', site.contact.email)

  if (!isBlank(site.contact.phoneDisplay) && !isBlank(site.contact.phoneHref)) {
    if (!phoneFormsAgree(site.contact.phoneDisplay, site.contact.phoneHref)) {
      const message =
        `contact.phoneDisplay "${site.contact.phoneDisplay}" and contact.phoneHref ` +
        `"${site.contact.phoneHref}" do not name the same number — the domestic 0-prefix ` +
        'and the +43 country code must agree'
      f.contradiction('contact.phoneDisplay', message)
      f.contradiction('contact.phoneHref', message)
    }
  }

  f.require('identity.displayName', site.identity.displayName)
  f.require('identity.tagline', site.identity.tagline)
  f.require('identity.domain', site.identity.domain)
  f.require('identity.canonicalOrigin', site.identity.canonicalOrigin)

  f.require('footer.legalLabel', site.footer.legalLabel)
  f.require('footer.credit', site.footer.credit)
  f.require('footer.creditUrl', site.footer.creditUrl)

  f.require('seo.title', site.seo.title)

  if (
    f.require('seo.titleTemplate', site.seo.titleTemplate) &&
    !site.seo.titleTemplate.includes('%s')
  ) {
    f.malformed('seo.titleTemplate', 'must carry the %s placeholder the page titles replace')
  }
  f.require('seo.defaultDescription', site.seo.defaultDescription)
  f.require('seo.ogImage', site.seo.ogImage)

  f.require('landing.video', site.landing.video)
  f.require('landing.videoLabel', site.landing.videoLabel)

  if (f.require('works.images', site.works.images)) {
    site.works.images.forEach((entry, index) => {
      if (isBlank(entry.image)) {
        f.unfilled(`works.images[${index}].image`, 'is required and is empty')
      }
      if (isBlank(entry.imageAlt)) {
        f.unfilled(`works.images[${index}].imageAlt`, 'is required and is empty')
      }
    })
    const imageSet = new Set(site.works.images.map((entry) => entry.image))
    if (!isBlank(site.seo.ogImage) && !imageSet.has(site.seo.ogImage)) {
      f.contradiction(
        'seo.ogImage',
        `names "${site.seo.ogImage}", which is not one of the works images — ` +
          'the share image is a work the page shows',
      )
    }
  }

  if (f.require('navigation.items', site.navigation.items, 'is required — the menu is empty')) {
    site.navigation.items.forEach((item, index) => {
      if (item.type === 'anchor') {
        if (isBlank(item.label)) {
          f.unfilled(`navigation.items[${index}].label`, 'is required and is empty')
        }
        if (item.anchor === '' || site.routes.anchors[item.anchor] === undefined) {
          f.contradiction(
            `navigation.items[${index}].anchor`,
            `"${item.anchor}" names no key in routes.anchors — the menu would carry a dead entry`,
          )
        }
      }
    })
  }
}

function checkLegal(legal: LegalConfig, f: FindingCollector): void {
  f.require('legal.lastChanged', legal.lastChanged)

  f.require('legal.datenschutz.protocolText', legal.datenschutz.protocolText)

  f.require('legal.urheberrecht', legal.urheberrecht)
}

function checkMedia(media: MediaConfig, f: FindingCollector): void {
  f.require('media.basePath', media.basePath)

  if (f.require('media.imageWidths', media.imageWidths)) {
    for (let i = 1; i < media.imageWidths.length; i++) {
      const previous = media.imageWidths[i - 1]
      const current = media.imageWidths[i]
      if (previous !== undefined && current !== undefined && current <= previous) {
        f.contradiction(
          `media.imageWidths[${i}]`,
          `must be strictly increasing — ${current} follows ${previous}`,
        )
        break
      }
    }
  }

  if (f.require('media.imageFormats', media.imageFormats)) {
    if (
      media.imageFormats.length > 1 &&
      media.imageFormats[media.imageFormats.length - 1] !== 'jpeg'
    ) {
      f.contradiction(
        'media.imageFormats',
        'must end with jpeg — the last rung of a <picture> is the one that has to work everywhere',
      )
    }
  }
}

function toDeclaredPath(value: string, basePath: string): string | undefined {
  const prefix = `${basePath}/`
  return value.startsWith(prefix) ? value.slice(prefix.length) : undefined
}

function checkConfiguredMedia(
  site: SiteConfig,
  media: MediaConfig,
  declared: readonly string[],
  f: FindingCollector,
): void {
  const declaredSet = new Set(declared)
  const configured: ReadonlyArray<readonly [key: string, value: string]> = [
    ['landing.video', site.landing.video],
    ['seo.ogImage', site.seo.ogImage],
    ...site.works.images.map((entry, index): [string, string] => [
      `works.images[${index}].image`,
      entry.image,
    ]),
  ]
  for (const [key, value] of configured) {
    const logical = toDeclaredPath(value, media.basePath)
    if (logical === undefined) {
      f.contradiction(
        key,
        `is "${value}", which does not sit under media.basePath "${media.basePath}" — ` +
          'the declared media cannot be matched against it',
      )
    } else if (!declaredSet.has(logical)) {
      f.contradiction(
        key,
        `is "${value}", which the declared media set does not carry — ` +
          'the page would render a path nothing is generated for',
      )
    }
  }
}

function checkTokens(tokenSource: string, f: FindingCollector): void {
  const backgroundDefinitions = tokenSource.match(/^\s*--color-background\s*:/gm) ?? []
  if (backgroundDefinitions.length === 0) {
    f.unfilled('tokens.css --color-background', 'is not declared — every surface reads it')
  } else if (backgroundDefinitions.length > 1) {
    f.contradiction(
      'tokens.css --color-background',
      `is defined ${backgroundDefinitions.length} times — the background has exactly one definition, in this file`,
    )
  }
}

function runSchema(name: string, schema: z.ZodType, value: unknown, f: FindingCollector): void {
  const result = schema.safeParse(value)
  if (result.success) return
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? `${name}.${issue.path.join('.')}` : name
    f.malformed(path, issue.message)
  }
}

export function validateConfiguration(inputs: Inputs): ValidationReport {
  const environment = inputs.environment ?? 'development'
  const f = new FindingCollector()

  runSchema('site', siteSchema, inputs.site, f)
  runSchema('legal', legalSchema, inputs.legal, f)
  runSchema('media', mediaSchema, inputs.media, f)

  if (inputs.tokenSource !== undefined) {
    checkTokens(inputs.tokenSource, f)
  }

  checkSite(inputs.site, f)
  checkLegal(inputs.legal, f)
  checkMedia(inputs.media, f)

  if (inputs.declaredMediaPaths !== undefined) {
    checkConfiguredMedia(inputs.site, inputs.media, inputs.declaredMediaPaths, f)
  }

  const errors: Finding[] = []
  const warnings: Finding[] = []
  for (const finding of f.all()) {
    const isUnfilledInDevelopment = finding.kind === 'unfilled' && environment === 'development'
    if (isUnfilledInDevelopment) warnings.push(finding)
    else errors.push(finding)
  }

  return { environment, errors, warnings, ok: errors.length === 0 }
}

export function formatReport(report: ValidationReport): string {
  const lines: string[] = []
  const label = `environment = ${report.environment}`

  if (report.errors.length > 0) {
    lines.push(`Configuration validation failed (${label}):`)
    lines.push('')
    for (const finding of report.errors) {
      lines.push(`  ✗ [${finding.kind}] ${finding.key} — ${finding.message}`)
    }
  }

  if (report.warnings.length > 0) {
    if (lines.length > 0) lines.push('')
    lines.push(
      `Configuration is incomplete (${label}). This list is the outstanding-data checklist —`,
      'the production build will fail until every entry is resolved.',
      '',
    )
    for (const finding of report.warnings) {
      lines.push(`  ! [${finding.kind}] ${finding.key} — ${finding.message}`)
    }
  }

  if (lines.length === 0) {
    lines.push(`Configuration valid (${label}): no unfilled field, no contradiction.`)
  }

  return lines.join('\n')
}
