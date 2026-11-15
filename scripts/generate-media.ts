/* ══════════════════════════════════════════════════════════════════════════════
   MEDIA VARIANT GENERATION — THE SITE HALF OF THE SEAM

   The engine is `runMediaPipeline` from `@mtreml/portfolio-core/pipeline`; this file is
   what the site owes it. The engine assumes nothing about a site's shape, so the site
   knowledge it needs comes in as arguments:

   - `declared`  — `declaredMedia()` from `src/lib/media/declared.ts`. This site has no
     content model, so that walk is a fixed list: the landing master (role `video`, held to
     the `landing` profile) and the Works image (role `responsive`, the full ladder).
   - `basePath`, `imageWidths`, `imageFormats`, `videoProfiles` — this site's media
     configuration, `src/config/media.config.ts`.
   - `severity`  — `reference`, fixed: this site ships a fixed, complete media set with no
     modes to flip and no intake phase to be lenient through, so a declared original that
     does not exist is a defect of the run, not a state of it.

   Everything else — the ladder, the skip rules, the pruning, the manifest, the reporting
   split — is the engine's.

     npm run media:generate              the resolved key (MEDIA_KEY → .media/key → branch)
     npm run media:generate -- --clean   throw the library and the manifest away first

   `media-originals/…` is not in git, so this is not in `prebuild`: a clean clone has
   no originals to read, and the committed manifest (`.media/manifest.json`) is what
   keeps one building and exporting.
   ══════════════════════════════════════════════════════════════════════════════ */

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

/**
 * The key whose library is written.
 *
 * `undefined` when none of MEDIA_KEY, the committed `.media/key` file, or the git branch
 * yields one — a detached HEAD in a checkout with no git, a state a CI runner can
 * legitimately be in. There is nothing to generate then, and `main()` says so and exits 0
 * rather than treating it as an error.
 */
const KEY = resolveMediaKey({ root: ROOT })

async function main(): Promise<void> {
  if (KEY === undefined) {
    process.stdout.write(
      'media:generate — no media key (no MEDIA_KEY, no .media/key, and git reports no branch). Nothing to do.\n',
    )
    return
  }

  /* The declared set, in the shape the engine takes. The only field that moves is the
     video's profile name: the site names it `videoProfile` in `declared.ts` already, so
     here the list passes through unchanged. */
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
