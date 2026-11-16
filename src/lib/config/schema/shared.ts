import { z } from 'zod'

// The schema layer checks shape and format; emptiness and cross-key rules are
// the required-field layer's (`../validate.ts`) business. That's why the
// predicates below only run on a non-empty value.
export function checkedString(
  predicate: (value: string) => boolean,
  message: string,
): z.ZodType<string> {
  return z.string().refine((value) => value === '' || predicate(value), { message })
}

export function isAnchorId(value: string): boolean {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value)
}

export function isRouteSegment(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function isLocaleCode(value: string): boolean {
  return /^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(value)
}

export function isAssetPath(value: string): boolean {
  return value.startsWith('/') && !value.includes('..')
}

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

export function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
}

// E.164, without the domestic `0` prefix; consistency with phoneDisplay is checked in `../validate.ts`.
export function isTelHref(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value)
}
