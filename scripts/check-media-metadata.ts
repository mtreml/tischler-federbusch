/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA METADATA — nothing a camera or phone recorded reaches a visitor.

     npm run media:meta:check

   `scripts/check-metadata.ts` is about the metadata a page *declares* — titles, canonical
   URLs, the social block. This is the opposite direction: the metadata a media file
   *carries*, which no page declares and nobody would notice.

   ── Why this is a gate and not a note in a README ──────────────────────────────
   Today it would pass for two reasons, and neither is a decision this repository made
   enforceable:

   1. sharp emits no metadata unless asked to. So every rendition `media:generate`
      writes is clean **by default** — not by policy. One `withMetadata()` added for a
      colour-profile reason, and 65 kB of EXIF per rendition ships with it. That is a
      plausible edit with an invisible consequence, which is the kind this project turns
      into a build failure rather than a review comment.

   2. The video is re-encoded by the core pipeline's ffmpeg call, which passes
      `-an` (no audio track: the master autoplays muted, so a track nobody may hear is
      bytes on every visit and a caption obligation on top) and `-map_metadata -1`.
      Both are flags in a command rather than a library's behaviour, and the originals
      they strip are exactly the ones that carry the worst of it. A phone master carries
      `com.android.version` or an ISO 6709 GPS string in `©xyz`; the drop folder is full
      of such files by design. This gate is the check that both flags are still there —
      and that the encode carries no audio stream at all, which the box walk below
      cannot see.

   ── A denylist, not an allowlist ───────────────────────────────────────────────
   For images the rule is absolute: no EXIF, XMP or IPTC block at all, because a
   rendition has no legitimate use for one. For video it cannot be, because an mp4 must
   carry structural boxes (`hdlr` handler names, `ftyp` brands) and an encoder identifier
   is neither identifying nor removable in every muxer. So video is checked against the
   keys that carry information about a *person, place or device* and those are named
   below. A denylist can miss a novel key, which is why it is written to be added to.
   ══════════════════════════════════════════════════════════════════════════════ */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs'
import { join, relative } from 'node:path'

import sharp from 'sharp'

import { VARIANTS_DIR, holdsMedia, mediaAbsentNotice } from '@mtreml/portfolio-core/media'

const ROOT = process.cwd()

/** Renditions carry no metadata block of any kind. */
const IMAGE_EXTENSIONS = new Set(['.avif', '.webp', '.jpeg', '.jpg', '.png'])
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v'])

/**
 * Container keys that disclose a person, a place or a device.
 *
 * The four-character codes are the QuickTime/iTunes user-data atoms, which is where a camera
 * or phone writes what it knows. `©xyz` is the one that matters most: it is an ISO 6709
 * coordinate string, so a single unremoved atom is the shooting location of the work.
 */
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

/**
 * Collect the bytes of every `udta` and `meta` box in an ISO base media file.
 *
 * A box walk rather than a whole-file string search: a search over 32 MB of compressed video
 * finds these four-character codes in the picture data by coincidence and reports a location
 * tag on a file that has none.
 *
 * And rather than `ffprobe` for the keys, which this machine has — because a gate that asked
 * ffmpeg whether ffmpeg's own `-map_metadata -1` had worked would be checking a tool against
 * itself. The point of this gate is to read the shipped bytes with something that was not
 * involved in writing them. (The one property the box walk cannot see — whether an audio
 * *stream* exists at all — is asked of ffprobe below, because a stream's absence is a fact
 * about the bytes rather than about the encoder's flags.)
 */
function userDataOf(bytes: Buffer): Buffer[] {
  const found: Buffer[] = []

  const walkBoxes = (start: number, end: number, depth: number): void => {
    let offset = start
    /* Eight bytes is the smallest well-formed box: a 32-bit size and a four-character type. */
    while (offset + 8 <= end) {
      let size = bytes.readUInt32BE(offset)
      const type = bytes.toString('latin1', offset + 4, offset + 8)
      let header = 8

      if (size === 1) {
        /* 64-bit size, for a box larger than 4 GiB. */
        if (offset + 16 > end) return
        size = Number(bytes.readBigUInt64BE(offset + 8))
        header = 16
      } else if (size === 0) {
        /* "to end of file" */
        size = end - offset
      }

      if (size < header || offset + size > end) return

      if (type === 'udta' || type === 'meta') {
        found.push(bytes.subarray(offset + header, offset + size))
      }

      /* Only containers are descended into, so the walk never reads sample data as boxes. */
      if (depth < 8 && ['moov', 'trak', 'mdia', 'minf', 'udta', 'meta', 'ilst'].includes(type)) {
        walkBoxes(offset + header, offset + size, depth + 1)
      }

      offset += size
    }
  }

  walkBoxes(0, bytes.length, 0)
  return found
}

/**
 * How many audio streams a video carries.
 *
 * The landing master autoplays muted, so the encode is `-an`: a track nobody may hear is
 * bytes on every visit *and* a caption obligation (WCAG 1.2.2) on top. The box walk above
 * cannot see streams, only metadata, so this is asked of the demuxer — ffprobe is a
 * prerequisite of the pipeline already, and reading "how many streams are in these bytes"
 * is a fact the encoder's flags cannot lie about.
 */
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
  /* The served tree. `public/media` is a link to `media/<key>/media` under the default
     filesystem source, so it is resolved rather than followed blindly.

     `holdsMedia` rather than `existsSync`, and the distinction is the whole check: the
     directory can exist without holding a single media file, and asked with `existsSync`
     this gate would walk that empty tree, report "0 rendition(s) and 0 video(s)" and
     pass, which is the failure mode `lib/media/staged.ts` in the core was written to
     prevent and the other media gates already avoid. */
  const variants = join(ROOT, VARIANTS_DIR)
  if (!holdsMedia(variants)) {
    process.stdout.write(
      mediaAbsentNotice('EXIF/XMP/IPTC in image renditions and metadata in the video master'),
    )
    return
  }
  const served = realpathSync(variants)

  const trees: { label: string; path: string }[] = [{ label: VARIANTS_DIR, path: served }]
  /* The export, when one has been built: it is the artifact that actually ships, and
     `export:media` copies media into it, so it is checked in its own right rather than
     trusted to match. */
  const exported = join(ROOT, 'out', 'media')
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
