import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The invariants this site cannot survive losing: the face is declared exactly once, the woff2 is committed and is the cut the manifest says it is, the licence is recorded from the source itself.

const REPO_ROOT = join(__dirname, '..', '..')

const SOURCE_FILE = 'font-sources/FontsFree-Net-Biome-W04-Light.ttf'
const WOFF2_FILE = 'public/fonts/biome-light-subset.woff2'
const LICENCE_FILE = 'public/fonts/LICENSE-Biome-W04-Light.txt'
const MANIFEST_FILE = 'public/fonts/subset-manifest.json'
const FONT_FACE_FILE = 'src/config/fonts.css'

function* walk(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(ts|tsx|css)$/.test(entry.name)) yield path
  }
}

function parseFontFace(css: string): { family: string; url: string } {
  const family = css.match(/font-family:\s*([^;]+);/)
  const url = css.match(/src:\s*url\(([^)]+)\)/)
  const familyValue = family?.[1]
  const urlValue = url?.[1]
  if (!familyValue || !urlValue) throw new Error('the font-face declaration has no family or src')
  return { family: familyValue.trim(), url: urlValue.trim().replace(/^["']|["']$/g, '') }
}

describe('the face', () => {
  it('is declared exactly once, in the font-face declaration file', () => {
    const declarations = new Map<string, number>()
    for (const file of walk(join(REPO_ROOT, 'src'))) {
      const count = (readFileSync(file, 'utf8').match(/@font-face\s*\{/g) ?? []).length
      if (count > 0) declarations.set(file.slice(REPO_ROOT.length + 1), count)
    }
    expect(declarations.size).toBe(1)
    expect(declarations.get(FONT_FACE_FILE)).toBe(1)
  })

  it('loads from a committed woff2, and nothing from a provider', () => {
    const css = readFileSync(join(REPO_ROOT, FONT_FACE_FILE), 'utf8')
    const { url } = parseFontFace(css)
    /* A provider would be a host name in the URL; the subset is a path. */
    expect(url).not.toMatch(/^https?:/)
    const target = url.replace(/^\//, 'public/')
    const woff2 = readFileSync(join(REPO_ROOT, target))
    expect(woff2.length).toBeGreaterThan(0)
    expect(woff2.subarray(0, 4).toString('ascii')).toBe('wOF2')
    expect(target).toBe(WOFF2_FILE)
  })

  it('stays a subset: the tripwire on the shipped bytes', () => {
    const woff2 = readFileSync(join(REPO_ROOT, WOFF2_FILE))
    // 344 characters of a static Light cut ship at ~45 KB; far above that is the subsetter taking a range nothing asked for.
    expect(woff2.length).toBeLessThan(64 * 1024)
  })

  it('was generated from the committed, hash-pinned source', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, MANIFEST_FILE), 'utf8')) as {
      source: string
      sourceSha256: string
      output: string
    }
    expect(manifest.source).toBe(SOURCE_FILE)
    expect(manifest.output).toBe(WOFF2_FILE.split('/').pop())

    const source = readFileSync(join(REPO_ROOT, manifest.source))
    const actual = createHash('sha256').update(source).digest('hex')
    expect(actual).toBe(manifest.sourceSha256)
  })

  it('carries the German coverage the site sets', () => {
    const manifest = JSON.parse(readFileSync(join(REPO_ROOT, MANIFEST_FILE), 'utf8')) as {
      coveredRanges: string[][]
    }
    const covered = manifest.coveredRanges
      .map(([start, end]) =>
        start && end ? `${parseInt(start.slice(2), 16)}-${parseInt(end.slice(2), 16)}` : '',
      )
      .join(';')
    // ä ö ü ß sit in the Latin-1 Supplement, the umlauts' neighbours in Basic Latin — the two ranges a German site cannot do without.
    expect(covered).toContain('32-126')
    expect(covered).toContain('160-255')
  })

  it('has its licence recorded beside it, from the source itself', () => {
    const licence = readFileSync(join(REPO_ROOT, LICENCE_FILE), 'utf8')
    expect(licence.trim().length).toBeGreaterThan(0)
    expect(licence).toContain('Monotype')
    expect(licence).toContain('Carl Crossgrove')
  })

  it('is the first family in the body stack, which is a sans genre', () => {
    const css = readFileSync(join(REPO_ROOT, FONT_FACE_FILE), 'utf8')
    const { family } = parseFontFace(css)
    const bodyStack = css.match(/body\s*\{[^}]*font-family:\s*([^;]+);/)
    expect(bodyStack).not.toBeNull()
    if (!bodyStack) return
    const stack = bodyStack[1]
    if (!stack) return
    const first = stack.trim().split(',')[0]?.trim()
    expect(first).toBe(family)
    expect(stack).toContain('sans-serif')
  })
})
