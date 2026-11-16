import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { legal } from '@/config/legal.config'
import { media } from '@/config/media.config'
import { site } from '@/config/site.config'
import { declaredMedia, type DeclaredMedia } from '@/lib/media/declared'
import { validateConfiguration } from '@/lib/config/validate'
import { posterPathFor } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE DECLARED MEDIA SET

   The set is static and small — one master, its poster, three Works images — so
   the invariants are structural rather than statistical:

     • A logical path is a served path with `media.basePath` removed: relative,
       well-formed, with an extension. A defect here surfaces as a variant the
       render side cannot resolve, on one page.
     • The poster is the master's own, by `posterPathFor` — the same convention the
       render side resolves with. A second naming is what this suite keeps out.
     • Every `video` declaration names a profile that exists in `media.videoEncode`.
     • Every non-derived declaration names a file at
       `media-originals/<logical path>`: an original's path on disk is its served
       path, and there is no table to consult.

   The suite never touches the filesystem: a clean clone has no originals (they are
   behind a local-only symlink), and a unit test that read the drop folder would pass
   on this machine and fail on a runner.
   ══════════════════════════════════════════════════════════════════════════════ */

const ROOT = process.cwd()
const declared = declaredMedia(ROOT)

describe('the declared media set', () => {
  it('declares exactly the landing master, its poster, and the Works images', () => {
    expect(declared.map((entry) => entry.logicalPath)).toEqual([
      'landing/VID_20261114_082951.mp4',
      'landing/VID_20261114_082951-poster.jpg',
      'arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
      'arbeiten/9ezd7rz08i9h1.jpg',
      'arbeiten/yz50v4rlf8be1.jpg',
    ])
  })

  it('states every logical path as a served path with media.basePath removed', () => {
    for (const entry of declared) {
      expect(entry.logicalPath.startsWith('/')).toBe(false)
      expect(entry.logicalPath).not.toContain('..')
      expect(entry.logicalPath).toMatch(/^[a-z0-9-]+(?:\/[a-z0-9-._]+)*\.[a-z0-9]+$/i)
    }
  })

  it('is stable-ordered: the same inputs declare the same set, in the same order', () => {
    expect(declaredMedia(ROOT)).toEqual(declared)
  })

  it('declares the master as a video held to the landing profile', () => {
    const master = declared[0] as DeclaredMedia
    expect(master.role).toBe('video')
    expect(master.videoProfile).toBe('landing')
    expect(media.videoEncode.landing).toBeDefined()
    expect(master.derivedFrom).toBeUndefined()
    expect(master.active).toBe(true)
  })

  it('names the poster by posterPathFor, derived from the master', () => {
    const master = declared[0] as DeclaredMedia
    const poster = declared[1] as DeclaredMedia
    expect(poster.logicalPath).toBe(posterPathFor(master.logicalPath))
    expect(poster.role).toBe('single')
    expect(poster.derivedFrom).toBe(master.logicalPath)
    /* A poster is a single rendition of the universally supported format, and 1280 is the
       rung at which the largest contentful paint of the landing is held. */
    expect(poster.targetWidth).toBe(1280)
  })

  it('declares every Works image responsive, with no per-asset width', () => {
    for (const works of declared.slice(2)) {
      expect(works.role).toBe('responsive')
      expect(works.targetWidth).toBeUndefined()
      expect(works.videoProfile).toBeUndefined()
      expect(works.active).toBe(true)
    }
  })

  it('points every non-derived original at media-originals/<logical path>', () => {
    for (const entry of declared) {
      if (entry.derivedFrom !== undefined) continue
      expect(entry.originalPath).toBe(join(ROOT, 'media-originals', entry.logicalPath))
    }
  })

  it('points the derived poster at the master original, so a re-encoded master regenerates it', () => {
    expect(declared[1]?.originalPath).toBe(declared[0]?.originalPath)
  })

  it('names the thing to edit in every declaredBy', () => {
    for (const entry of declared) {
      expect(entry.declaredBy.trim().length).toBeGreaterThan(0)
    }
  })

  it('declares the landing master exactly once and the poster exactly once', () => {
    const paths = declared.map((entry: DeclaredMedia) => entry.logicalPath)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

/* ══════════════════════════════════════════════════════════════════════════════
   CONFIG ↔ DECLARED MEDIA (the cross-check the validation closes)

   A latent bug: `site.landing.video` named a path the pipeline never
   generated for, and nothing said. The check lives in `validate.ts`; this
   suite pins it — the committed configuration must resolve, and a value the
   declared set does not carry must fail **by name**, in every environment,
   because the two disagreeing is a contradiction rather than an absence.
   ══════════════════════════════════════════════════════════════════════════════ */

describe('the config ↔ declared media cross-check', () => {
  const declaredPaths = declared.map((entry) => entry.logicalPath)

  it('resolves every configured media path in the declared set', () => {
    const report = validateConfiguration({
      site,
      legal,
      media,
      environment: 'production',
      declaredMediaPaths: declaredPaths,
    })
    expect(report.ok).toBe(true)
  })

  it('fails by name when landing.video names no declared media', () => {
    const broken = {
      ...site,
      landing: { ...site.landing, video: '/media/landing/master.mp4' },
    }
    const report = validateConfiguration({
      site: broken,
      legal,
      media,
      environment: 'production',
      declaredMediaPaths: declaredPaths,
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('landing.video')
  })

  it('fails by name when seo.ogImage names no declared media', () => {
    const broken = {
      ...site,
      seo: { ...site.seo, ogImage: '/media/arbeiten/works.jpg' },
    }
    const report = validateConfiguration({
      site: broken,
      legal,
      media,
      environment: 'production',
      declaredMediaPaths: declaredPaths,
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('seo.ogImage')
  })

  it('fails by name when a configured path does not sit under media.basePath', () => {
    const broken = {
      ...site,
      landing: { ...site.landing, video: '/assets/landing/VID_20261114_082951.mp4' },
    }
    const report = validateConfiguration({
      site: broken,
      legal,
      media,
      environment: 'production',
      declaredMediaPaths: declaredPaths,
    })
    expect(report.ok).toBe(false)
    expect(report.errors.map((finding) => finding.key)).toContain('landing.video')
  })
})
