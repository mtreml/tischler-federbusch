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
     • one `<picture>` per configured works image, each emitting the
       configured source order (modern first), the fallback `src` as the
       widest rung of the universally supported format, and the intrinsic
       dimensions and the configured text alternative on the image — the box
       is reserved before the bytes arrive.

   The manifest is a fixture, not the committed file: a test that read the
   real one would assert whichever branch happens to be checked out.
   ══════════════════════════════════════════════════════════════════════════════ */

const LOGICAL = 'arbeiten/9ezd7rz08i9h1.jpg'
const HASH = 'aa11bb22'
const WIDTH = 3664
const HEIGHT = 5496
const SIZES = [320, 480, 640, WIDTH]

/** One entry per configured works image, as the pipeline would have written them. */
function responsiveEntry(logical: string, hash: string, width: number, height: number) {
  const variant = (variantWidth: number, format: 'avif' | 'webp' | 'jpeg') => ({
    file: `${logical}-${hash}-${variantWidth}.${format}`,
    width: variantWidth,
    format,
    bytes: 1,
  })
  const widths = [320, 480, 640, width]
  const variants = ['avif', 'webp', 'jpeg'].flatMap((format) =>
    widths.map((variantWidth) => variant(variantWidth, format as 'avif' | 'webp' | 'jpeg')),
  )
  return {
    hash,
    width,
    height,
    role: 'responsive' as const,
    variants,
  }
}

function manifestFixture(): MediaManifest {
  return {
    version: MANIFEST_VERSION,
    basePath: media.basePath,
    imageWidths: SIZES,
    imageFormats: ['avif', 'webp', 'jpeg'],
    entries: {
      [LOGICAL]: responsiveEntry(LOGICAL, HASH, WIDTH, HEIGHT),
      ['arbeiten/signal-2026-07-20-20-14-59-447_003.jpg']: responsiveEntry(
        'arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
        '3c9ea7d6',
        661,
        435,
      ),
      ['arbeiten/yz50v4rlf8be1.jpg']: responsiveEntry(
        'arbeiten/yz50v4rlf8be1.jpg',
        'cc33dd44',
        2604,
        2602,
      ),
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

describe('the pictures', () => {
  function pictureParts() {
    const picture = document.querySelector('section.works picture')
    if (picture === null) throw new Error('no works picture rendered')
    const image = picture.querySelector('img')
    if (image === null) throw new Error('the picture carries no image')
    const sources = Array.from(picture.querySelectorAll('source'))
    return { image, sources }
  }

  it('renders one picture per configured works image', () => {
    render(<WorksSection />)
    expect(screen.getAllByRole('img')).toHaveLength(site.works.images.length)
  })

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
    expect(image).toHaveAttribute('alt', site.works.images[0]?.imageAlt)
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('decoding', 'async')
  })
})
