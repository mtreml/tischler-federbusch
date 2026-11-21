'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import { LogoIntro } from '@/components/brand/LogoIntro'
import { NameIntro } from '@/components/brand/NameIntro'
import { NameScroll } from '@/components/layout/NameScroll'
import { LandingVideo } from '@/components/media/LandingVideo'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

// Full-viewport area: the video as backdrop, the lockup centered over it, and the intro (the film's 1.5 s deblur, the lockup drawn step by step);
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
  const t = useTranslations('header')
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
      {/* Decorative inline SVGs, so the intro can draw them; the name link is the one that sticks to the header slot — `NameScroll` makes it
         clickable the frame it sticks. The header's own name link only mounts once the bar is on. */}
      <div className="landing__lockup">
        <LogoIntro className="landing__logo" />
        <NameScroll>
          <Link className="landing__name" href="/" data-transition="landing" aria-label={t('nameLabel')}>
            <NameIntro className="landing__name-image" />
          </Link>
        </NameScroll>
      </div>
    </div>
  )
}
