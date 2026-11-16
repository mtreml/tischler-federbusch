import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'

// The invariants the wrappers hold: the mark and the wordmark render the committed public files, decorative, with
// the viewBox as `width`/`height`; the apple-touch icon resolves — a missing PNG would 404 on every phone's home screen.

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
    // The layout is a server component with i18n in its tree, so the invariant is read off the source, not rendered.
    const layout = readFileSync(join(process.cwd(), 'src', 'app', '[locale]', 'layout.tsx'), 'utf8')
    expect(layout).toMatch(/icon:\s*'\/tab-icon\.svg'/)
    expect(layout).toMatch(/apple:\s*'\/apple-touch-icon\.png'/)
  })
})
