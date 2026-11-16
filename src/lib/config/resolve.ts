import { site } from '@/config/site.config'

/* ══════════════════════════════════════════════════════════════════════════════
   RESOLUTION

   The small number of keys that resolve to *another key* rather than to a
   literal, each implemented exactly once here, so no component invents a
   second route to the same value — a value declared in two places is a value
   that drifts, and this site's one rule is that nothing project-specific is
   declared in two places.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Reads one locale out of a per-locale record (`site.routes.impressum`).
 *
 * Returns `undefined` rather than falling back to another language, on
 * purpose: a missing segment renders nothing, never silently the wrong
 * language — and the configuration gate already fails a build in which a
 * configured locale has no segment, so the gap cannot ship.
 */
export function localized(value: Record<string, string>, locale: string): string | undefined {
  const entry = value[locale]
  return entry === undefined || entry.trim() === '' ? undefined : entry
}

/**
 * The contact block, as the menu, the footer and the legal
 * page render it. The hrefs are built here — `tel:` and `mailto:` —
 * so a call site cannot assemble one from the raw value and miss the scheme.
 * Every field reads from `site.contact` and nowhere else.
 */
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

/** The footer's copyright holder: `contact.name`, resolved — never a second copy. */
export function resolveCopyrightHolder(): string {
  return site.contact.name
}

/**
 * The document title, through the one template: the page supplies its own
 * title, the subject's name is appended once, and neither side repeats it.
 */
export function applyTitleTemplate(pageTitle: string): string {
  return site.seo.titleTemplate.replace('%s', pageTitle)
}

/** An absolute URL on the canonical origin — the only origin this site emits. */
export function resolveCanonicalUrl(path: string): string {
  const origin = site.identity.canonicalOrigin
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${origin}${suffix}`
}

/**
 * The works section's heading: the label of the menu entry that points
 * at the `routes.anchors.arbeiten` target. The word is declared exactly once —
 * in `navigation.items`, where the menu reads it — and the section reads the
 * same key here rather than re-declaring it. Throws when no menu entry carries
 * the anchor: a section without its heading is not a state this site renders,
 * so the build fails loudly rather than shipping it.
 */
export function resolveWorksHeading(): string {
  for (const item of site.navigation.items) {
    if (item.type === 'anchor' && item.anchor === 'arbeiten') return item.label
  }
  throw new Error(
    'navigation.items carries no anchor entry for "arbeiten" — the works section has no heading to read',
  )
}
