import type { Ref } from 'react'

import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

// The muted, looping, audio-stripped master as a plain `<video>`: `preload="metadata"`, and no `autoplay` — the stage calls `play()` only after the 1.5 s intro.
// `role="img"` + `aria-label` is the text alternative of a video that has no audio; the element is not focusable — there is no control to reach.

export interface LandingVideoProps {
  sources: ResolvedVideo['sources']
  poster?: string
  label: string
  objectFit: 'cover' | 'contain' | 'fill'
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
