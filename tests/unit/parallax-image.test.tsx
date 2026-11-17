import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ParallaxImage, type ParallaxImageProps } from '@/components/content/ParallaxImage'
import { setPrefersReducedMotion } from './match-media'

// The invariants the pointer parallax owes: transform only, the translate capped at the `--parallax-travel` token (mocked here, since jsdom computes no custom properties), `pointerleave` resets, reduced motion never attaches.

const TRAVEL = 8 /* px — the value the mocked computed style answers for the token */
const FRAME = { width: 400, height: 300 }

const props: ParallaxImageProps = {
  sources: [
    { format: 'avif', type: 'image/avif', srcSet: '/x-320.avif 320w, /x-640.avif 640w' },
    { format: 'jpeg', type: 'image/jpeg', srcSet: '/x-320.jpeg 320w, /x-640.jpeg 640w' },
  ],
  src: '/x-640.jpeg',
  sizes: '100vw',
  width: 661,
  height: 435,
  alt: 'the works image',
}

// The two things jsdom cannot give: a frame with a non-zero box (it lays out nothing), and the travel token in the computed style.
function renderReady() {
  const view = render(<ParallaxImage {...props} />)
  const frame = view.container.querySelector('.works__frame')
  if (frame === null) throw new Error('the frame did not render')
  const image = view.container.querySelector('img')
  if (image === null) throw new Error('the image did not render')
  vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: FRAME.width,
    height: FRAME.height,
    x: 0,
    y: 0,
    right: FRAME.width,
    bottom: FRAME.height,
    toJSON: () => ({}),
  } as DOMRect)
  return { frame, image }
}

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (name: string) => (name === '--parallax-travel' ? `${TRAVEL}px` : ''),
  } as unknown as CSSStyleDeclaration)
})

afterEach(() => {
  setPrefersReducedMotion(false)
  vi.restoreAllMocks()
})

describe('the pointer parallax', () => {
  it('maps the cursor offset to an opposite translate, capped at the token', () => {
    const { frame, image } = renderReady()
    fireEvent.pointerMove(frame, { clientX: 0.75 * FRAME.width, clientY: (1 / 3) * FRAME.height })
    expect(image.style.transform).toBe('translate3d(-4px, 2.67px, 0px)')
  })

  it('writes a transform only — no layout property is touched', () => {
    const { frame, image } = renderReady()
    fireEvent.pointerMove(frame, { clientX: 300, clientY: 100 })
    expect(image.style.cssText).toBe('transform: translate3d(-4px, 2.67px, 0px);')
    expect(image.style.width).toBe('')
    expect(image.style.height).toBe('')
    expect(image.style.position).toBe('')
  })

  it('resets the image on pointerleave', () => {
    const { frame, image } = renderReady()
    fireEvent.pointerMove(frame, { clientX: 300, clientY: 100 })
    expect(image.style.transform).not.toBe('')
    fireEvent.pointerLeave(frame)
    expect(image.style.transform).toBe('')
  })

  it('never moves when the frame has no box', () => {
    const { frame, image } = renderReady()
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      right: 0,
      bottom: 0,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent.pointerMove(frame, { clientX: 10, clientY: 10 })
    expect(image.style.transform).toBe('')
  })
})

describe('reduced motion', () => {
  it('never attaches the listeners — the pointer moves nothing', () => {
    setPrefersReducedMotion(true)
    const { frame, image } = renderReady()
    fireEvent.pointerMove(frame, { clientX: 300, clientY: 100 })
    fireEvent.pointerLeave(frame)
    expect(image.style.transform).toBe('')
  })
})
