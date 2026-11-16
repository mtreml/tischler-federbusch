import { join } from 'node:path'

import { posterPathFor } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   WHAT MEDIA THIS BUILD DECLARES

   One list, and it is the only place that knows where an original lives. The
   generation script (`scripts/generate-media.ts`) consumes it; so will the render
   side once the landing and the works section mount the video and the Works image. Two
   separate walks of the same two assets would eventually disagree about which
   files matter, and the symptom would be a missing image on one page rather than
   a failure anyone could trace.

   This site has no content model, so the walk is a fixed list rather than a
   derivation over content: the site carries exactly one video (the landing
   master, with its poster) and one responsive image (the Works image), and
   adding a third asset is an edit here.

   ── Logical path ──────────────────────────────────────────────────────────────
   The key everything else is stated in terms of: the served path with
   `media.basePath` removed, extension kept.

     /media/landing/VID_20261114_082951.mp4  →  landing/VID_20261114_082951.mp4

   ── Where the original lives ──────────────────────────────────────────────────
   `media-originals/<logical path>`, uniformly, for every declaration in this
   file: an original's path on disk is its served path, so there is no table to
   consult and no second convention to keep in step.

   Note the drop folder carries no key level — the user's layout is
   `media-originals/{landing,arbeiten}/…`, and that layout is the contract. The
   media *key* (`.media/key` / the branch) still scopes the derived library at
   `media/<key>/media`; it does not rename the originals.
   ══════════════════════════════════════════════════════════════════════════════ */

export type MediaRole = 'responsive' | 'single' | 'video'

export interface DeclaredMedia {
  /** The key every other module states this asset in terms of. */
  logicalPath: string
  /** Absolute path to the original. */
  originalPath: string
  /**
   * - `responsive` — the full ladder × every configured format.
   * - `single` — one rendition, in the universally supported format, at `targetWidth`.
   * - `video` — re-encoded by ffmpeg to one web master, and a poster from its first frame.
   */
  role: MediaRole
  /** For `single`: the one width to emit. Ignored otherwise. */
  targetWidth?: number
  /** For `video`: which profile in `media.videoEncode` applies. */
  videoProfile?: string
  /**
   * For a poster: the `video` logical path whose opening frame *is* this asset. A poster
   * has no original of its own on disk; `originalPath` is the master's, so the poster is
   * keyed to the master's content and a re-encoded master regenerates its poster without
   * anything having to say so.
   */
  derivedFrom?: string
  /** Which declaration put it in this list, verbatim, so a failure names the thing to edit. */
  declaredBy: string
  /** Whether the active configuration renders it. Every asset this site declares is rendered. */
  active: boolean
}

/** Every asset this build declares, in a stable order — the manifest is written from it. */
export function declaredMedia(root: string): DeclaredMedia[] {
  /** Every original, uniformly: `media-originals/<logical path>`. */
  const original = (logicalPath: string): string => join(root, 'media-originals', logicalPath)

  const master = 'landing/VID_20261114_082951.mp4'

  return [
    /* ── The landing master ────────────────────────────────────────────────────
       The 4K phone original (11 s, h264 + aac) re-encoded to one 1920-capped web
       master: audio stripped, container keys stripped, faststart — the encode is
       held to `media.videoEncode.landing` and its CRF carries its measurement in
       that file. The landing renders it. */
    {
      logicalPath: master,
      originalPath: original(master),
      role: 'video',
      videoProfile: 'landing',
      declaredBy: 'the landing master (rendered by the landing)',
      active: true,
    },
    /* ── Its poster, derived from the master's own opening frame ───────────────
       Named by `posterPathFor`, the same convention the render side resolves
       with — a poster that had to be named somewhere else could be named
       wrongly, and a `<video>` with no poster cannot reserve its box.

       1280 is the one width, and it is short of no viewport by more than a
       factor of two: the poster is the largest contentful paint of the landing
       in the interval before the master replaces it, so it shares the
       critical path with the master on every first visit. Never wider than
       the original: the engine caps `single` renditions at the intrinsic
       width regardless. */
    {
      logicalPath: posterPathFor(master),
      originalPath: original(master),
      role: 'single',
      targetWidth: 1280,
      derivedFrom: master,
      declaredBy: 'the landing master — poster, derived from its opening frame',
      active: true,
    },
    /* ── The Works image ───────────────────────────────────────────────────────
       The one `responsive` asset the site carries: full ladder × every
       configured format, so the `<picture>` the works section renders has every rung a
       viewport asks for. */
    {
      logicalPath: 'arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
      originalPath: original('arbeiten/signal-2026-07-20-20-14-59-447_003.jpg'),
      role: 'responsive',
      declaredBy: 'the Works image (rendered by the Arbeiten section)',
      active: true,
    },
  ]
}
