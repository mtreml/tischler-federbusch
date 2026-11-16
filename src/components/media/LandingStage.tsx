'use client'

import { useEffect, useRef } from 'react'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'
import { NameScroll } from '@/components/layout/NameScroll'
import { LandingVideo } from '@/components/media/LandingVideo'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

// Full-viewport area: the video as backdrop, the lockup centered over it, and the 1.5 s intro (deblur + fade) on one shared timeline;
// `play()` lands on the beat the deblur lands. `data-intro` flips to `done` on the second animation frame, from `LandingIntro`; reduced motion: playback starts at once.

export interface LandingStageProps {
  video: ResolvedVideo
  label: string
  objectFit: 'cover' | 'contain' | 'fill'
  // The JS side of `--duration-intro` (kept in step by review).
  introDurationMs: number
  // The intro's state, owned by `LandingIntro` — shared with the header's hamburger.
  introDone: boolean
}

export function LandingStage({ video, label, objectFit, introDurationMs, introDone }: LandingStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    // `play()` on the beat the deblur lands; a rejected `play()` is not a defect — the poster is still there.
    const playTimer = setTimeout(
      () => {
        const attempt: unknown = videoRef.current?.play()
        if (attempt instanceof Promise) attempt.catch(() => {})
      },
      reducedMotion ? 0 : introDurationMs,
    )

    return () => clearTimeout(playTimer)
  }, [reducedMotion, introDurationMs])

  return (
    <div className="landing__stage" data-intro={introDone ? 'done' : 'pending'}>
      <LandingVideo
        videoRef={videoRef}
        sources={video.sources}
        poster={video.poster}
        label={label}
        objectFit={objectFit}
      />
      {/* Decorative: the wordmark is the name; the name inside is the one that sticks to the header slot. */}
      <div className="landing__lockup" aria-hidden="true">
        <Logo className="landing__logo" />
        <NameScroll>
          <Name className="landing__name" />
        </NameScroll>
      </div>
    </div>
  )
}
