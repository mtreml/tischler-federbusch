// Media metadata: nothing a camera or phone recorded reaches a visitor.
// Images: no EXIF/XMP/IPTC at all. Video: a denylist of keys disclosing person, place or device, plus no audio stream.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative } from 'node:path'

import sharp from 'sharp'

import { VARIANTS_DIR, holdsMedia, mediaAbsentNotice } from '@mtreml/portfolio-core/media'

const ROOT = process.cwd()

const IMAGE_EXTENSIONS = new Set(['.avif', '.webp', '.jpeg', '.jpg', '.png'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v'])

// QuickTime/iTunes user-data atoms disclosing person, place or device (`©xyz` is an ISO 6709 coordinate).
const DENIED_VIDEO_KEYS = [
  '©xyz', // ISO 6709 location
  'loci', // 3GPP location
  '©mak', // make
  '©mod', // model
  '©day', // capture date
  '©nam', // title, often the device's own filename
  '©ART', // artist
  '©cmt', // comment
  'com.apple.quicktime.location',
  'com.apple.quicktime.make',
  'com.apple.quicktime.model',
  'com.apple.quicktime.creationdate',
  'com.android.version',
  'com.android.capture',
  'GPSCoordinates',
  'location-eng',
]

interface Failure {
  file: string
  what: string
}

function walk(directory: string, out: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else out.push(path)
  }
  return out
}

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot).toLowerCase()
}

// A box walk, not a whole-file string search (which would match codes in the picture data) and not `ffprobe` (the gate would check ffmpeg against itself).
function userDataOf(bytes: Buffer): Buffer[] {
  const found: Buffer[] = []

  const walkBoxes = (start: number, end: number, depth: number): void => {
    let offset = start
    while (offset + 8 <= end) {
      let size = bytes.readUInt32BE(offset)
      const type = bytes.toString('latin1', offset + 4, offset + 8)
      let header = 8

      if (size === 1) {
        if (offset + 16 > end) return  // 64-bit size, box > 4 GiB
        size = Number(bytes.readBigUInt64BE(offset + 8))
        header = 16
      } else if (size === 0) {
        size = end - offset  // "to end of file"
      }

      if (size < header || offset + size > end) return

      if (type === 'udta' || type === 'meta') {
        found.push(bytes.subarray(offset + header, offset + size))
      }

      if (depth < 8 && ['moov', 'trak', 'mdia', 'minf', 'udta', 'meta', 'ilst'].includes(type)) {
        walkBoxes(offset + header, offset + size, depth + 1)
      }

      offset += size
    }
  }

  walkBoxes(0, bytes.length, 0)
  return found
}

function audioStreamCount(file: string): number {
  const output = execFileSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=index',
      '-of',
      'csv=p=0',
      file,
    ],
    { encoding: 'utf8' },
  )
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '').length
}

async function main(): Promise<void> {
  // `holdsMedia` rather than `existsSync`: an empty directory must not pass as "nothing to check".
  const variants = join(ROOT, VARIANTS_DIR)
  if (!holdsMedia(variants)) {
    process.stdout.write(
      mediaAbsentNotice('EXIF/XMP/IPTC in image renditions and metadata in the video master'),
    )
    return
  }
  const served = realpathSync(variants)

  const trees: { label: string; path: string }[] = [{ label: VARIANTS_DIR, path: served }]
  const exported = join(ROOT, 'out', 'media')  // the artifact that ships, checked in its own right
  if (existsSync(exported)) trees.push({ label: 'out/media', path: realpathSync(exported) })

  const failures: Failure[] = []
  let images = 0
  let videos = 0

  for (const tree of trees) {
    for (const file of walk(tree.path)) {
      const extension = extensionOf(file)
      const shown = `${tree.label}/${relative(tree.path, file).replace(/\\/g, '/')}`

      if (IMAGE_EXTENSIONS.has(extension)) {
        images++
        const metadata = await sharp(file).metadata()
        if (metadata.exif !== undefined)
          failures.push({ file: shown, what: `${metadata.exif.length} bytes of EXIF` })
        if (metadata.xmp !== undefined)
          failures.push({ file: shown, what: `${metadata.xmp.length} bytes of XMP` })
        if (metadata.iptc !== undefined)
          failures.push({ file: shown, what: `${metadata.iptc.length} bytes of IPTC` })
        continue
      }

      if (VIDEO_EXTENSIONS.has(extension)) {
        videos++
        const blocks = userDataOf(readFileSync(file))
        for (const block of blocks) {
          const text = block.toString('latin1')
          for (const key of DENIED_VIDEO_KEYS) {
            if (text.includes(key)) failures.push({ file: shown, what: `container key \`${key}\`` })
          }
        }
        const audio = audioStreamCount(file)
        if (audio > 0)
          failures.push({ file: shown, what: `${audio} audio stream(s) — the encode is -an` })
      }
    }
  }

  const scope = trees.map((tree) => tree.label).join(' and ')
  process.stdout.write(
    `media:meta:check — ${images} rendition(s) and ${videos} video(s) in ${scope}\n`,
  )

  if (failures.length > 0) {
    process.stderr.write(
      `\nMedia carrying metadata a visitor would receive:\n\n` +
        failures.map((failure) => `  ${failure.file}\n      ${failure.what}\n`).join('') +
        `\nEvery file here is written by \`npm run media:generate\`, so an original's own\n` +
        `metadata cannot reach a visitor — which makes any finding a defect in the pipeline\n` +
        `rather than in the drop folder, and the fix belongs in the encoder call.\n\n` +
        `Images: sharp emits no metadata unless \`withMetadata()\` was added in the\n` +
        `pipeline — remove it.\n\n` +
        `Video: the core pipeline's ffmpeg call carries \`-an\` and \`-map_metadata -1\`, so a\n` +
        `finding means one of those was dropped. Restore it and re-run \`npm run media:generate\`.\n`,
    )
    process.exitCode = 1
    return
  }

  process.stdout.write(
    'No EXIF, XMP or IPTC, no identifying container metadata, and no audio track.\n',
  )
}

main().catch((error: unknown) => {
  process.stderr.write(
    `\nmedia:meta:check failed\n${error instanceof Error ? error.message : String(error)}\n`,
  )
  process.exitCode = 1
})
