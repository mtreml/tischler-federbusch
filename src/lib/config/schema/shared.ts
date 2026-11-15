import { z } from 'zod'

/* ══════════════════════════════════════════════════════════════════════════════
   SCHEMA BUILDING BLOCKS

   ── The division of labour, which is the whole design here ──────────────────────
   Configuration failures come in two kinds, and the split only works if the schema
   layer and the required-field layer stay on their own side of it:

     • The **schema** (this directory) checks *shape and format*: is this an object,
       is that an enum member, is a non-empty URL actually a URL. A malformed value
       fails in development and in production alike, because it is wrong rather than
       incomplete.

     • The **required-field layer** (`../validate.ts`) checks *emptiness* and every
       cross-key rule. An empty required value fails the production build
       (`config:validate:strict`) and warns in development (`config:validate`).

   That is why the predicates below run only on a non-empty value: a string a
   project has not filled in yet is on its way, and the gate that names it is the
   one that can explain the severity.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * A string that must be well-formed *when present*. The predicate runs only on a
 * non-empty value, so emptiness stays the required-field layer's business while a
 * value that is present but wrong fails immediately, in every environment.
 */
export function checkedString(
  predicate: (value: string) => boolean,
  message: string,
): z.ZodType<string> {
  return z.string().refine((value) => value === '' || predicate(value), { message })
}

/** A URL-safe id: lowercase, digits and single hyphens or underscores. */
export function isAnchorId(value: string): boolean {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value)
}

/** A URL-safe path segment: lowercase, digits and single hyphens. */
export function isRouteSegment(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

/** A BCP 47 language subtag as the locale set uses them (`de`, `en`, `de-AT`). */
export function isLocaleCode(value: string): boolean {
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value)
}

/** A repository-relative asset path, always rooted so it resolves from any page. */
export function isAssetPath(value: string): boolean {
  return value.startsWith('/') && !value.includes('..')
}

/** An absolute origin with no path, query or fragment — `identity.canonicalOrigin`. */
export function isAbsoluteOrigin(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    !value.endsWith('/')
  )
}

/** An `https://` URL that may carry a path — external links such as the footer credit. */
export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/** An email address, checked only for the shape a contact line needs to be usable. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

/**
 * An E.164 telephone number — the form a `tel:` link must carry, without the
 * domestic `0` prefix. The display form (`contact.phoneDisplay`) is checked for
 * consistency against this in `../validate.ts`, not here.
 */
export function isTelHref(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value)
}
