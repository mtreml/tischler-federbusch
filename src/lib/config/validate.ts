import type { z } from 'zod'

import { legalSchema, type LegalConfig } from './schema/legal.schema'
import { mediaSchema, type MediaConfig } from './schema/media.schema'
import { siteSchema, type SiteConfig } from './schema/site.schema'

/* ══════════════════════════════════════════════════════════════════════════════
   THE CONFIGURATION VALIDATION ENTRY POINT

   One entry point covering all three configuration modules plus the token
   file's one invariant (the single background definition). Run by
   `scripts/validate-config.ts` as gate 1:

     config:validate            development severity — warns and lists
     config:validate:strict     production severity — fails and names (re-run by prebuild)

   Findings carry a *kind*, and the kind decides the severity through the single
   matrix at the bottom of this file. Nothing here decides severity for itself:

     malformed      wrong shape or format — an error in every environment,
                    because it is wrong rather than incomplete.
     contradiction  two values cannot both hold — an error in every environment,
                    because waiting does not fix it.
     unfilled       a required value is empty — a warning in development, an
                    error in production.
   ══════════════════════════════════════════════════════════════════════════════ */

export type Environment = 'development' | 'production'
export type FindingKind = 'malformed' | 'contradiction' | 'unfilled'

export interface Finding {
  /** Dotted key path, exactly as the configuration names it. */
  key: string
  kind: FindingKind
  message: string
}

export interface ValidationReport {
  environment: Environment
  errors: Finding[]
  warnings: Finding[]
  /** False when any finding resolved to `error`. */
  ok: boolean
}

export interface Inputs {
  site: SiteConfig
  legal: LegalConfig
  media: MediaConfig
  environment?: Environment
  /**
   * The text of `src/config/tokens.css`, supplied by the caller rather than read
   * here: a CSS file is not a module, and the token invariant is checked only
   * when the text is present rather than reporting the file as missing.
   */
  tokenSource?: string
}

/* ─────────────────────────────────────────────────────────────────────────
   Emptiness — what counts as unfilled, in one place. `0` and `false` are
   values, not absences: `retentionDays: 0` is a real retention policy and a
   `false` flag is a real answer, so neither is swept up as "empty".
   ───────────────────────────────────────────────────────────────────────── */

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

  /** A required value is empty. Warning in development, error in production. */
  unfilled(key: string, message = 'is required and is empty'): void {
    this.add(key, 'unfilled', message)
  }

  /** Two values cannot both hold. Always an error, in every environment. */
  contradiction(key: string, message: string): void {
    this.add(key, 'contradiction', message)
  }

  malformed(key: string, message: string): void {
    this.add(key, 'malformed', message)
  }

  /** Reports `key` as unfilled when blank. Returns whether it was present. */
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

/* ─────────────────────────────────────────────────────────────────────────
   Site cross-key rules
   ───────────────────────────────────────────────────────────────────────── */

const digits = (value: string) => value.replace(/\D/g, '')

/**
 * The display form and the `tel:` target must name one number. The domestic
 * form trades the leading `0` for the `43` country code — `0664 410 72 72` is
 * `+436644107272` — so the two digit strings differ by exactly that exchange.
 */
function phoneFormsAgree(display: string, href: string): boolean {
  const d = digits(display)
  const h = digits(href)
  return h === d || h === d.replace(/^0/, '43')
}

function checkSite(site: SiteConfig, f: FindingCollector): void {
  const locales = site.languages.supported

  /* ── Languages — the locale set is the single source of truth ─────────────── */
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

  /* ── Routes — every per-locale key must carry a segment for every locale ─────
     A segment missing for one locale 404s in exactly that locale, and an entry
     for a locale the site does not configure is a value nothing renders. */
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

  /* ── Contact — the one place contact details exist ─────────────────────────── */
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

  /* The display form and the href are one fact stated twice, and the pair is
     checked as a whole: a menu that dials a different number than it prints is
     a defect, not an incomplete field, so it fails in development as well. */
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

  /* ── Identity, footer, seo, landing ─────────────────────────────────────────── */
  f.require('identity.displayName', site.identity.displayName)
  f.require('identity.tagline', site.identity.tagline)
  f.require('identity.domain', site.identity.domain)
  f.require('identity.canonicalOrigin', site.identity.canonicalOrigin)

  f.require('footer.legalLabel', site.footer.legalLabel)
  f.require('footer.credit', site.footer.credit)
  f.require('footer.creditUrl', site.footer.creditUrl)

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

  /* ── Navigation ─────────────────────────────────────────────────────────────────
     The menu renders this list and nothing else, so an empty list is an empty
     menu, and an anchor item whose key names no configured anchor is a dead
     entry — both are contradictions of what the menu is for. */
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

/* ─────────────────────────────────────────────────────────────────────────
   Legal cross-key rules
   ───────────────────────────────────────────────────────────────────────── */

function checkLegal(legal: LegalConfig, f: FindingCollector): void {
  f.require('legal.lastChanged', legal.lastChanged)

  f.require('legal.datenschutz.processedData', legal.datenschutz.processedData)

  const { hosting } = legal.datenschutz
  f.require('legal.datenschutz.hosting.provider', hosting.provider)
  f.require('legal.datenschutz.hosting.country', hosting.country)
  f.require('legal.datenschutz.hosting.note', hosting.note)

  /* The sentence and the fields are one fact in two copies, and the sentence
     is the one that reaches the reader — so the pair is checked against each
     other rather than trusted. */
  if (!isBlank(hosting.note)) {
    if (!isBlank(hosting.provider) && !hosting.note.includes(hosting.provider)) {
      f.contradiction(
        'legal.datenschutz.hosting.note',
        `does not name the configured provider "${hosting.provider}"`,
      )
    }
    if (!isBlank(hosting.country) && !hosting.note.includes(hosting.country)) {
      f.contradiction(
        'legal.datenschutz.hosting.note',
        `does not name the configured country "${hosting.country}"`,
      )
    }
  }

  if (f.require('legal.datenschutz.rights', legal.datenschutz.rights)) {
    legal.datenschutz.rights.forEach((right, index) => {
      const at = `legal.datenschutz.rights[${index}]`
      if (isBlank(right.id)) f.unfilled(`${at}.id`)
      if (isBlank(right.label)) f.unfilled(`${at}.label`)
      if (isBlank(right.text)) f.unfilled(`${at}.text`)
    })
  }

  f.require('legal.urheberrecht', legal.urheberrecht)
}

/* ─────────────────────────────────────────────────────────────────────────
   Media cross-key rules
   ───────────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────────
   The token file's one invariant
   ───────────────────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────────────────
   Schema pass
   ───────────────────────────────────────────────────────────────────────── */

function runSchema(name: string, schema: z.ZodType, value: unknown, f: FindingCollector): void {
  const result = schema.safeParse(value)
  if (result.success) return
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? `${name}.${issue.path.join('.')}` : name
    f.malformed(path, issue.message)
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   The entry point
   ───────────────────────────────────────────────────────────────────────── */

export function validateConfiguration(inputs: Inputs): ValidationReport {
  const environment = inputs.environment ?? 'development'
  const f = new FindingCollector()

  /* Shape and format first: a malformed value fails everywhere, so there is no
     reason to defer it, and the cross-key rules below can then trust the shape. */
  runSchema('site', siteSchema, inputs.site, f)
  runSchema('legal', legalSchema, inputs.legal, f)
  runSchema('media', mediaSchema, inputs.media, f)

  if (inputs.tokenSource !== undefined) {
    checkTokens(inputs.tokenSource, f)
  }

  checkSite(inputs.site, f)
  checkLegal(inputs.legal, f)
  checkMedia(inputs.media, f)

  /* The single severity matrix. Nothing above knows which environment it runs
     in; the kind alone decides. */
  const errors: Finding[] = []
  const warnings: Finding[] = []
  for (const finding of f.all()) {
    const isUnfilledInDevelopment = finding.kind === 'unfilled' && environment === 'development'
    if (isUnfilledInDevelopment) warnings.push(finding)
    else errors.push(finding)
  }

  return { environment, errors, warnings, ok: errors.length === 0 }
}

/** Human-readable report. Used by the gate. */
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
