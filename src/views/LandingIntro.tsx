'use client'

import { useEffect, useState } from 'react'

import { Header } from '@/components/layout/Header'
import { LandingStage } from '@/components/media/LandingStage'
import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

// The one owner of the intro's state: the stage's `data-intro` and the header's hamburger fade read the same `introDone`.
// The flip happens on the second animation frame — the first paints the pending state, the second lets the browser commit it.

export interface LandingIntroProps {
  video: ResolvedVideo
  label: string
  objectFit: 'cover' | 'contain' | 'fill'
  // The JS side of `--duration-intro` (kept in step by review).
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
