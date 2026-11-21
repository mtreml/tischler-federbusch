import { site } from '@/config/site.config'
import type { LocalizedText } from '@/lib/config/schema/shared'

// validate-config guarantees every configured locale is filled; the default locale is the type-level fallback.
export function localize(text: LocalizedText, locale: string): string {
  return text[locale] ?? text[site.languages.default] ?? ''
}

// The contact block, with `tel:`/`mailto:` hrefs built here so a call site cannot miss the scheme.
export function resolveContact() {
  return {
    name: site.contact.name,
    addressLines: site.contact.addressLines,
    phoneDisplay: site.contact.phoneDisplay,
    telHref: `tel:${site.contact.phoneHref}`,
    email: site.contact.email,
    mailtoHref: `mailto:${site.contact.email}`,
  }
}

export function resolveCopyrightHolder(): string {
  return site.contact.name
}

export function applyTitleTemplate(pageTitle: string): string {
  return site.seo.titleTemplate.replace('%s', pageTitle)
}

export function resolveCanonicalUrl(path: string): string {
  const origin = site.identity.canonicalOrigin
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${origin}${suffix}`
}
