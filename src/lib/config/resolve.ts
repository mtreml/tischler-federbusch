import { site } from '@/config/site.config'

// The keys that resolve to *another key* rather than a literal, each once here: a value declared in two places drifts.

// No language fallback on purpose: a missing segment renders nothing, never the wrong language.
export function localized(value: Record<string, string>, locale: string): string | undefined {
  const entry = value[locale]
  return entry === undefined || entry.trim() === '' ? undefined : entry
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

