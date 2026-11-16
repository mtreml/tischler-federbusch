'use client'

import { useEffect, useRef, useState } from 'react'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'
import { NameScroll } from '@/components/layout/NameScroll'
import { LandingVideo } from '@/components/media/LandingVideo'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import type { ResolvedVideo } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE LANDING STAGE

   The full-viewport area: the video as backdrop, the lockup (mark stacked on
   the wordmark) centered over it, and the 1.5 s intro that deblurs the first
   frame while the lockup fades in — one shared timeline, one quiet easing,
   after which playback starts and runs on repeat.

   ── The intro, and why it is CSS-driven ──────────────────────────────────────
   The stage starts with `data-intro="pending"`: the video carries
   `filter: blur(var(--intro-blur))` and the lockup `opacity: 0` (see
   `styles/landing.css`). The effect below flips the attribute on the second
   animation frame — the first one paints the pending state, the second lets
   the browser commit it, so the transition the flip starts is the one a
   visitor sees rather than one they miss. Both properties transition on
   `--duration-intro` with `--ease-quiet`, which is the shared timeline and
   the shared easing: one figure, one curve, two properties.

   The JavaScript side is `site.landing.introDurationMs` (the same 1500 ms,
   kept in step by review — the boundary note in `tokens.css`): the timer
   schedules `play()` on the beat the deblur lands, so the film starts
   playing exactly when it is sharp. The `<video>` itself never carries
   `autoplay` — see `LandingVideo` for why the intro, not the browser, owns
   the first `play()`.

   ── Once per load ────────────────────────────────────────────────────────────
   The stage is persistent in the page (there is no `template.tsx` in this
   tree), so a menu round-trip back to the landing does not remount
   it and does not replay the intro: the attribute is already `done`.

   ── Reduced motion ───────────────────────────────────────────────────────────
   The choice, recorded here per the plan: under the preference the
   blur/fade is skipped (the CSS media query shows the final state
   immediately — no pending state at all) and playback starts at once. The
   film still plays, muted and ambient; what is removed is the *movement* of
   the intro, not the backdrop itself.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface LandingStageProps {
  /** Resolved on the render side from the configured logical path. */
  video: ResolvedVideo
  /** `site.landing.videoLabel` — the video's text alternative. */
  label: string
  /** `site.landing.objectFit`. */
  objectFit: 'cover' | 'contain' | 'fill'
  /** `site.landing.introDurationMs` — the JS side of `--duration-intro`. */
  introDurationMs: number
}

export function LandingStage({ video, label, objectFit, introDurationMs }: LandingStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const logoRef = useRef<HTMLImageElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    /* The poster is what a no-script visitor keeps, so the pending state must
       paint before it flips: frame one paints it, frame two commits it. */
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setIntroDone(true))
    })

    /* `play()` on the beat the deblur lands. Reduced motion: at once. A
       rejected `play()` (a policy refusal, a device under load) is not a
       defect: the poster is the master's own opening frame, and the backdrop
       is still there without its movement. */
    const playTimer = setTimeout(
      () => {
        const attempt: unknown = videoRef.current?.play()
        if (attempt instanceof Promise) attempt.catch(() => {})
      },
      reducedMotion ? 0 : introDurationMs,
    )

    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
      clearTimeout(playTimer)
    }
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
      {/* Decorative: the section owns the accessible name, and the wordmark
          next door is the name. The name inside is the one the scroll
          animation travels — it is in flow here, and the transform is what
          moves it. */}
      <div className="landing__lockup" aria-hidden="true">
        <Logo ref={logoRef} className="landing__logo" />
        <NameScroll logoRef={logoRef}>
          <Name className="landing__name" />
        </NameScroll>
      </div>
    </div>
  )
}
