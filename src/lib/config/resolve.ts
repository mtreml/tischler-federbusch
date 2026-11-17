import { site } from '@/config/site.config'

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

