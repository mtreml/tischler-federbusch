import type { Ref } from 'react'

import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING VIDEO (WP-05)

   The muted, looping, audio-stripped master (WP-03) as a plain `<video>`:
   everything it owes is an attribute, and the attributes are the doctrine —

     • **no user controls, no audio.** The encode has no audio track and the
       spec owes no bar over this film: `controls` is never rendered here. The
       reference's `MediaVideoPlayer` keeps the browser's bar because its video
       *carries content* — a browser that declines the autoplay still owes the
       visitor the film. Here the video is a backdrop behind the lockup, and
       the poster (the master's own opening frame) is what a visitor sees if
       playback never happens: the content is not lost, only the movement is.
     • **`muted` is forced.** It is set here and nowhere else, because no
       audio may play without visitor action — the configuration cannot
       switch it off.
     • **`preload="metadata"`.** Enough for duration and dimensions, not the
       file: the master is several megabytes and the poster is what a visitor
       is looking at for the first 1.5 s.
     • **no `autoplay`.** The intro owns playback: the element exists from the
       start (metadata + poster loaded) but `play()` is called by the stage
       only after the 1.5 s intro — "after that, the video starts to play".
       What a no-script visitor gets is the poster, a still of the very frame
       playback opens on, which is the honest fallback for a backdrop.

   ── Accessibility ────────────────────────────────────────────────────────────
   `role="img"` + the `aria-label` the audio-stripped video owes (from
   `landing.videoLabel`): the text alternative of a video that has no audio
   and no captions, in the one place it is owed. `role="img"` also takes the
   element out of the tree the caption rules read, which is correct rather
   than a dodge — a silent, ambient backdrop has nothing to caption. The
   element is not focusable: there is no control to reach, and the keyboard
   must land on the content below, not on the film.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface LandingVideoProps {
  /** Resolved through the media manifest by the render side (WP-03 seam). */
  sources: ResolvedVideo['sources']
  /** The master's own opening frame, `posterPathFor`-derived. `undefined` only when the
   *  manifest lacks it — a clean clone has the committed manifest, so this is the
   *  no-manifest degenerate, and the `<video>` then owes its box to nothing. */
  poster?: string
  /** The a11y text alternative for the audio-stripped video. */
  label: string
  /** `site.landing.objectFit`, applied rather than re-declared. */
  objectFit: 'cover' | 'contain' | 'fill'
  /** The stage's handle on the element: the intro's `play()` goes through it. */
  videoRef: Ref<HTMLVideoElement>
}

export function LandingVideo({ sources, poster, label, objectFit, videoRef }: LandingVideoProps) {
  return (
    <video
      ref={videoRef}
      className="landing__video"
      role="img"
      aria-label={label}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      style={{ objectFit }}
    >
      {sources.map((source) => (
        <source key={source.url} src={source.url} type={source.type} />
      ))}
    </video>
  )
}
