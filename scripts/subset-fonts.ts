// Font subsetting — an **authoring** step, not a build step: it writes `public/fonts/*`,
// those files are committed, and the gate chain never runs this script (a clean clone
// builds without network or this tool). Re-run when the source font or languages change.
// One face (Biome W04 Light), committed under `font-sources/` and pinned by content hash.
// The licence is extracted from the font's own `name` table, not recalled.

import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import subsetFont from 'subset-font'

const REPO_ROOT = process.cwd()
const FONT_DIR = join(REPO_ROOT, 'public', 'fonts')

const SOURCE_FILE = 'font-sources/FontsFree-Net-Biome-W04-Light.ttf'
const SOURCE_SHA256 = 'ad9ebf7686be9203d46966247624aaf9d4df154b19f4e0ccf5900e4070cbf040'

const OUTPUT = 'biome-light-subset.woff2'
const LICENCE_OUTPUT = 'LICENSE-Biome-W04-Light.txt'
const MANIFEST_OUTPUT = 'subset-manifest.json'

const RANGES: Array<[number, number]> = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ff], // Latin-1 Supplement — ä ö ü ß é à …
  [0x0100, 0x017f], // Latin Extended-A — ā ć ę ł ő š ž …
  [0x2010, 0x2027], // dashes, quotes, ellipsis
  [0x20ac, 0x20ac], // €
]

function coveredCharacters(): string {
  let characters = ''
  for (const [start, end] of RANGES) {
    for (let code = start; code <= end; code += 1) characters += String.fromCodePoint(code)
  }
  return characters
}

function toUtf16(raw: Buffer, bigEndian: boolean): string {
  let out = ''
  for (let index = 0; index + 1 < raw.length; index += 2) {
    const high = raw[index] ?? 0
    const low = raw[index + 1] ?? 0
    out += String.fromCharCode(bigEndian ? (high << 8) | low : high | (low << 8))
  }
  return out
}

function nameTableString(font: Buffer, nameId: number): string {
  const numTables = font.readUInt16BE(4)
  let nameOffset = -1
  for (let index = 0; index < numTables; index += 1) {
    const record = 12 + index * 16
    if (font.toString('ascii', record, record + 4) === 'name') {
      nameOffset = font.readUInt32BE(record + 8)
      break
    }
  }
  if (nameOffset === -1) {
    throw new Error(`${SOURCE_FILE}: no name table — the source is not a font file.`)
  }

  const count = font.readUInt16BE(nameOffset + 2)
  const stringOffsetBase = nameOffset + font.readUInt16BE(nameOffset + 4)
  for (let index = 0; index < count; index += 1) {
    const record = nameOffset + 6 + index * 12
    const [platformId, encodingId, languageId, id, length, stringOffset] = [
      font.readUInt16BE(record),
      font.readUInt16BE(record + 2),
      font.readUInt16BE(record + 4),
      font.readUInt16BE(record + 6),
      font.readUInt16BE(record + 8),
      font.readUInt16BE(record + 10),
    ]
    // The Windows/English record (language 0x0409) is the one this build trusts.
    // Vendors still deviate (some store UTF-16BE under the Windows platform), so the bytes
    // decide the decoding: ASCII as-is; a UTF-16 payload's order is the one with nulls in even positions.
    if (id !== nameId) continue
    if (platformId === 3 && (encodingId === 1 || encodingId === 10) && languageId === 0x0409) {
      const raw = font.subarray(
        stringOffsetBase + stringOffset,
        stringOffsetBase + stringOffset + length,
      )
      if (raw.length === 0) return ''
      const ascii = [...raw].every(
        (byte) => byte >= 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d,
      )
      if (ascii) return raw.toString('latin1').trim()
      if (raw.length % 2 === 0) {
        let evenNulls = 0
        let oddNulls = 0
        for (let index = 0; index < raw.length; index += 2) {
          if (raw[index] === 0) evenNulls += 1
          if (raw[index + 1] === 0) oddNulls += 1
        }
        if (evenNulls > 0) return toUtf16(raw, true).trim()
        if (oddNulls > 0) return toUtf16(raw, false).trim()
      }
      return raw.toString('latin1').trim()
    }
  }
  return ''
}

function licenceText(font: Buffer): string {
  const copyright = nameTableString(font, 0)
  const description = nameTableString(font, 13)
  const url = nameTableString(font, 14)

  if (description === '' && url === '') {
    throw new Error(
      `${SOURCE_FILE}: the name table carries no license description or URL, so the licence ` +
        'cannot be recorded from the file. Record it by hand rather than shipping a woff2 ' +
        'whose terms this repository does not state.',
    )
  }

  const lines: string[] = ['Biome W04 Light', 'Design: Carl Crossgrove', '']
  if (copyright !== '') lines.push(copyright, '')
  if (description !== '') lines.push(description, '')
  if (url !== '') lines.push(`License terms and usage rights: ${url}`, '')
  lines.push('Recorded from the font file itself by `npm run fonts:subset`.')
  return lines.join('\n')
}

async function main(): Promise<void> {
  await mkdir(FONT_DIR, { recursive: true })
  process.stdout.write('Subsetting fonts\n\n')

  let source: Buffer
  try {
    source = await readFile(join(REPO_ROOT, SOURCE_FILE))
  } catch {
    throw new Error(
      `${SOURCE_FILE} is not in the repository. A committed source is what makes this step ` +
        'work without network access; add the file.',
    )
  }
  const actual = createHash('sha256').update(source).digest('hex')
  if (actual !== SOURCE_SHA256) {
    throw new Error(
      `${SOURCE_FILE}: content hash does not match the pin.\n` +
        `  expected ${SOURCE_SHA256}\n  received ${actual}\n` +
        'The letterforms would change without the repository recording it. Review the source, ' +
        'then update the pin in scripts/subset-fonts.ts deliberately.',
    )
  }

  const licence = licenceText(source)

  const characters = coveredCharacters()
  const woff2 = await subsetFont(source, characters, { targetFormat: 'woff2' })

  if (woff2.subarray(0, 4).toString('ascii') !== 'wOF2') {
    throw new Error('the subsetter did not produce a woff2 payload.')
  }

  await writeFile(join(FONT_DIR, OUTPUT), woff2)
  await writeFile(join(FONT_DIR, LICENCE_OUTPUT), licence)

  await writeFile(  // the manifest `tests/unit/fonts.test.ts` reads; no timestamp — the export must stay reproducible
    join(FONT_DIR, MANIFEST_OUTPUT),
    `${JSON.stringify(
      {
        $comment:
          'Written by npm run fonts:subset. Read by tests/unit/fonts.test.ts. Do not edit by ' +
          'hand: re-run the script.',
        source: SOURCE_FILE,
        sourceSha256: SOURCE_SHA256,
        output: OUTPUT,
        coveredRanges: RANGES.map(([start, end]) => [
          `U+${start.toString(16).toUpperCase()}`,
          `U+${end.toString(16).toUpperCase()}`,
        ]),
      },
      null,
      2,
    )}\n`,
  )

  process.stdout.write(
    `  ${OUTPUT}  ${(woff2.length / 1024).toFixed(1)} KB — ` +
      `${characters.length} characters (Basic Latin, Latin-1 Supplement, Latin Extended-A, ` +
      'punctuation)\n' +
      `  ${LICENCE_OUTPUT}\n\n` +
      'Licence text written beside the font, recorded from the source file itself.\n' +
      'All files are committed; the build never runs this script.\n',
  )
}

main().catch((error: unknown) => {
  process.stderr.write(
    `\nfonts:subset failed\n${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
})
