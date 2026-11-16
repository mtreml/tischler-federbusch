'use client'

import { useEffect, useState } from 'react'

import { Header } from '@/components/layout/Header'
import { LandingStage } from '@/components/media/LandingStage'
import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING INTRO

   The one owner of the intro's state: the stage's `data-intro` and the
   header's hamburger fade read the same `introDone`, so the mark, the name
   and the button arrive on the same beat. The state is lifted out of the
   stage because its two readers are siblings in different branches of the
   page and neither should be the other's ancestor.

   The flip happens on the second animation frame — the first one paints the
   pending state, the second lets the browser commit it — so the transition
   the flip starts is the one a visitor sees rather than one they miss.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface LandingIntroProps {
  /** Resolved on the render side from the configured logical path. */
  video: ResolvedVideo
  /** `site.landing.videoLabel` — the video's text alternative. */
  label: string
  /** `site.landing.objectFit`. */
  objectFit: 'cover' | 'contain' | 'fill'
  /** `site.landing.introDurationMs` — the JS side of `--duration-intro`. */
  introDurationMs: number
}

export function LandingIntro({ video, label, objectFit, introDurationMs }: LandingIntroProps) {
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setIntroDone(true))
    })

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [])

  return (
    <>
      <Header introPending={!introDone} />
      <LandingStage
        video={video}
        label={label}
        objectFit={objectFit}
        introDurationMs={introDurationMs}
        introDone={introDone}
      />
    </>
  )
}
