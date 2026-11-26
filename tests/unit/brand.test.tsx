import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'
import { LogoIntro } from '@/components/brand/LogoIntro'
import { NameIntro } from '@/components/brand/NameIntro'

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
  it('renders the committed parts, decorative, in a box with the lockup aspect', () => {
    const { container } = render(<Name className="landing__name" />)
    const box = container.firstElementChild as HTMLElement
    expect(box).toHaveAttribute('aria-hidden', 'true')
    expect(box.style.aspectRatio).toMatch(/^334\.89\d* \/ 86\.875$/)
    const images = Array.from(box.querySelectorAll('img'))
    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      '/federbusch.svg',
      '/tischlermeister.svg',
    ])
    images.forEach((image) => expect(image.getAttribute('alt')).toBe(''))
  })
})

describe('the landing intro', () => {
  it('draws the mark inline, decorative, the line revealed by a unit-length pen', () => {
    const { container } = render(<LogoIntro className="landing__logo" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.getAttribute('width')).toBe('111')
    expect(svg?.getAttribute('height')).toBe('246')
    const pen = container.querySelector('mask .logo-intro__pen')
    expect(pen?.getAttribute('pathLength')).toBe('1')
    const maskId = pen?.closest('mask')?.id
    expect(container.querySelector('.logo-intro__line')?.getAttribute('mask')).toBe(
      `url(#${maskId})`,
    )
    expect(container.querySelectorAll('.logo-intro__sides path')).toHaveLength(4)
  })

  it('draws the wordmark inline, federbusch under a wipe mask, TISCHLERMEISTER as its own group', () => {
    const { container } = render(<NameIntro className="landing__name-image" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.getAttribute('width')).toBe('335')
    expect(svg?.getAttribute('height')).toBe('87')
    const masked = Array.from(container.querySelectorAll('svg > g[mask]'))
    expect(masked).toHaveLength(1)
    const id = /url\(#(.+)\)/.exec(masked[0]?.getAttribute('mask') ?? '')?.[1]
    expect(container.querySelector(`mask[id="${id}"] .name-intro__wipe--federbusch`)).not.toBeNull()
    expect(container.querySelector('svg > g.name-intro__tischlermeister')).not.toBeNull()
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
