import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'

/* ══════════════════════════════════════════════════════════════════════════════
   THE BRAND LOCKUP AND THE FAVICON SET (WP-05)

   The invariants the wrappers exist to hold:

     • The mark and the wordmark render as the committed public files,
       decorative — `alt=""` + `aria-hidden` — with the viewBox as their
       `width`/`height`, so the box holds its aspect before any CSS arrives
       and the name's travel owes no layout shift.
     • The apple-touch icon resolves: it is the one file the minimal favicon
       set adds beyond the SVG, and the layout's `icons` points at it — a
       PNG that does not exist in `public/` would 404 on every phone's home
       screen.
   ══════════════════════════════════════════════════════════════════════════════ */

describe('the mark', () => {
  it('renders the committed file, decorative, with its viewBox as the box', () => {
    const { container } = render(<Logo className="landing__logo" />)
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    if (image === null) return
    expect(image.getAttribute('src')).toBe('/logo.svg')
    expect(image.getAttribute('alt')).toBe('')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    /* 110.96094 × 245.70312 pt, rounded up: the aspect is the file's own. */
    expect(image.getAttribute('width')).toBe('111')
    expect(image.getAttribute('height')).toBe('246')
  })
})

describe('the wordmark', () => {
  it('renders the committed file, decorative, with its viewBox as the box', () => {
    const { container } = render(<Name className="landing__name" />)
    const image = container.querySelector('img')
    expect(image).not.toBeNull()
    if (image === null) return
    expect(image.getAttribute('src')).toBe('/name.svg')
    expect(image.getAttribute('alt')).toBe('')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    /* 334.89453 × 86.875 pt, rounded up: the aspect is the file's own. */
    expect(image.getAttribute('width')).toBe('335')
    expect(image.getAttribute('height')).toBe('87')
  })
})

describe('the apple-touch icon', () => {
  it('exists in public/ at 180×180, as a PNG', async () => {
    const metadata = await sharp(join(process.cwd(), 'public', 'apple-touch-icon.png')).metadata()
    expect(metadata.format).toBe('png')
    expect(metadata.width).toBe(180)
    expect(metadata.height).toBe(180)
  })

  it('is wired into the layout metadata the layout emits', () => {
    /* The layout is a server component with i18n in its tree, so the invariant
       is read off the source rather than rendered: the `icons` entry and the
       file it names must agree. */
    const layout = readFileSync(join(process.cwd(), 'src', 'app', '[locale]', 'layout.tsx'), 'utf8')
    /* Both entries, named: the SVG the layout has carried since WP-04, and the
       PNG this WP adds. Tolerant of formatting, strict on the two hrefs. */
    expect(layout).toMatch(/icon:\s*'\/tab-icon\.svg'/)
    expect(layout).toMatch(/apple:\s*'\/apple-touch-icon\.png'/)
  })
})
