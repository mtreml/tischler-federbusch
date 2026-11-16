import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { WorksSection } from '@/components/content/WorksSection'
import { site } from '@/config/site.config'
import { media } from '@/config/media.config'
import {
  MANIFEST_VERSION,
  setManifestForTesting,
  type MediaManifest,
} from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORKS SECTION

   The section renders from the central configuration and the committed
   manifest seam: this suite pins the contract a visitor's browser sees —

     • the section is the `#arbeiten` target the menu anchor and the
       transition sequence scroll to;
     • the `<picture>` emits the configured source order (modern first), the
       fallback `src` is the widest rung of the universally supported format,
       and the intrinsic dimensions and the configured text alternative are
       on the image — the box is reserved before the bytes arrive.

   The manifest is a fixture, not the committed file: a test that read the
   real one would assert whichever branch happens to be checked out.
   ══════════════════════════════════════════════════════════════════════════════ */

const LOGICAL = 'arbeiten/signal-2026-07-20-20-14-59-447_003.jpg'
const HASH = '3c9ea7d6'
const WIDTH = 661
const HEIGHT = 435
const SIZES = [320, 480, 640, WIDTH]

/** The one entry the section resolves, as the pipeline would have written it. */
function manifestFixture(): MediaManifest {
  const variant = (width: number, format: 'avif' | 'webp' | 'jpeg') => ({
    file: `${LOGICAL}-${HASH}-${width}.${format}`,
    width,
    format,
    bytes: 1,
  })
  return {
    version: MANIFEST_VERSION,
    basePath: media.basePath,
    imageWidths: SIZES,
    imageFormats: ['avif', 'webp', 'jpeg'],
    entries: {
      [LOGICAL]: {
        hash: HASH,
        width: WIDTH,
        height: HEIGHT,
        role: 'responsive',
        variants: [
          variant(320, 'avif'),
          variant(480, 'avif'),
          variant(640, 'avif'),
          variant(WIDTH, 'avif'),
          variant(320, 'webp'),
          variant(480, 'webp'),
          variant(640, 'webp'),
          variant(WIDTH, 'webp'),
          variant(320, 'jpeg'),
          variant(480, 'jpeg'),
          variant(640, 'jpeg'),
          variant(WIDTH, 'jpeg'),
        ],
      },
    },
  }
}

beforeEach(() => {
  setManifestForTesting(manifestFixture())
})

afterEach(() => {
  /* Back to reading from disk — the suites around this one are not affected
     either way, and the seam must not leak between files. */
  setManifestForTesting(undefined)
})

describe('the section', () => {
  it('is the #arbeiten target the menu anchor and the transition sequence name', () => {
    const { container } = render(<WorksSection />)
    const section = container.querySelector('section')
    expect(section?.id).toBe(site.routes.anchors.arbeiten)
  })

  it('carries the tagline, verbatim from the central configuration', () => {
    render(<WorksSection />)
    expect(screen.getByText(site.identity.tagline)).toBeInTheDocument()
  })
})

describe('the picture', () => {
  function pictureParts() {
    const image = screen.getByRole('img', { name: site.works.imageAlt })
    const picture = image.closest('picture')
    if (picture === null) throw new Error('the image is not inside a picture')
    const sources = Array.from(picture.querySelectorAll('source'))
    return { image, sources }
  }

  it('emits the sources in the configured order, modern first', () => {
    render(<WorksSection />)
    const { sources } = pictureParts()
    expect(sources.map((source) => source.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
      'image/jpeg',
    ])
    for (const source of sources) {
      expect(source.getAttribute('srcset')).not.toBe('')
    }
  })

  it('uses the widest rung of the universally supported format as the fallback src', () => {
    render(<WorksSection />)
    const { image, sources } = pictureParts()
    const jpeg = sources.at(-1)
    expect(jpeg?.getAttribute('type')).toBe('image/jpeg')
    expect(jpeg?.getAttribute('srcset')).toContain(`${LOGICAL}-${HASH}-${WIDTH}.jpeg`)
    expect(image.getAttribute('src')).toBe(`${media.basePath}/${LOGICAL}-${HASH}-${WIDTH}.jpeg`)
  })

  it('carries the intrinsic dimensions and the configured text alternative', () => {
    render(<WorksSection />)
    const { image } = pictureParts()
    expect(image).toHaveAttribute('width', String(WIDTH))
    expect(image).toHaveAttribute('height', String(HEIGHT))
    expect(image).toHaveAttribute('alt', site.works.imageAlt)
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
  })
})
