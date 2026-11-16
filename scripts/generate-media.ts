/* Media variant generation: the engine is `runMediaPipeline` from `@mtreml/portfolio-core/pipeline`;
   this file is the site half — the declared set and the media config as arguments.

   Key resolution: MEDIA_KEY → `.media/key` → git branch. `-- --clean` throws the library and the
   manifest away first. Not in `prebuild`: `media-originals/…` is not in git, so a clean clone has no
   originals, and the committed manifest keeps one building and exporting. */

import { media } from '@/config/media.config'
import { declaredMedia } from '@/lib/media/declared'
import { resolveMediaKey } from '@mtreml/portfolio-core/media'
import {
  MediaOriginalsMissingError,
  missingOriginalsNotice,
  runMediaPipeline,
} from '@mtreml/portfolio-core/pipeline'

const ROOT = process.cwd()
const CLEAN = process.argv.includes('--clean')

// The key whose library is written; `undefined` (detached HEAD, no git) is a legitimate CI state — `main()` says so and exits 0.
const KEY = resolveMediaKey({ root: ROOT })

async function main(): Promise<void> {
  if (KEY === undefined) {
    process.stdout.write(
      'media:generate — no media key (no MEDIA_KEY, no .media/key, and git reports no branch). Nothing to do.\n',
    )
    return
  }

  // The declared set in the shape the engine takes; the list passes through unchanged.
  const declared = declaredMedia(ROOT).map((entry) => ({
    logicalPath: entry.logicalPath,
    originalPath: entry.originalPath,
    role: entry.role,
    targetWidth: entry.targetWidth,
    videoProfile: entry.videoProfile,
    derivedFrom: entry.derivedFrom,
    declaredBy: entry.declaredBy,
    active: entry.active,
  }))

  process.stdout.write(
    `media:generate — deriving media/${KEY}/media from media-originals/.\n\n` +
      `  Ladder:  ${media.imageWidths.join(', ')}\n` +
      `  Formats: ${media.imageFormats.join(', ')} (last rung is the universal fallback)\n` +
      `  Video:   maxWidth ${media.videoEncode.landing.maxWidth}, crf ${media.videoEncode.landing.crf}\n`,
  )

  try {
    const report = await runMediaPipeline({
      key: KEY,
      declared,
      basePath: media.basePath,
      imageWidths: media.imageWidths,
      imageFormats: media.imageFormats,
      videoProfiles: media.videoEncode,
      severity: 'reference',
      root: ROOT,
      clean: CLEAN,
    })

    const largest = report.largestVariantBytes

    process.stdout.write(
      `\n  ${report.generated} generated, ${report.skipped} unchanged` +
        (report.pruned > 0 ? `, ${report.pruned} pruned` : '') +
        `.\n  ${(report.bytes / 1024 / 1024).toFixed(1)} MB of variants; ` +
        `largest single variant ${(largest / 1024).toFixed(0)} kB.\n`,
    )

    if (report.missing.length > 0) {
      process.stdout.write(`\n${missingOriginalsNotice(report.missing)}`)
    }
  } catch (error) {
    if (error instanceof MediaOriginalsMissingError) {
      const report =
        error.missing
          .map((entry) => `    · ${entry.originalPath}\n      declared by ${entry.declaredBy}\n`)
          .join('') + '\n'

      process.stderr.write(
        `media:generate — FAILED. ${error.missing.length} declared original(s) do not exist.\n\n` +
          report +
          '  Under severity "reference" this is a build failure, not a warning: this site\n' +
          '  ships a fixed, complete media set, and a page that would render a placeholder\n' +
          '  is defective, not in intake.\n' +
          '  Restore the original in media-originals/ and re-run.\n',
      )
      process.exit(1)
    }
    throw error
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`media:generate — FAILED.\n  ${String(error)}\n`)
  process.exit(1)
})
