'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { TransitionLockup } from '@/components/layout/TransitionLockup'
import {
  registerBeginTransition,
  runTransitionAction,
  type BeginTransitionOptions,
  type TransitionTarget,
} from '@/lib/transition'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

/* ══════════════════════════════════════════════════════════════════════════════
   THE PAGE TRANSITION OVERLAY (WP-06c)

   Cover, then reveal: the overlay animates in over the outgoing page, and
   once it is opaque the route/anchor swap happens beneath it — invisible —
   and the overlay animates out over the incoming page. The overlay itself
   never takes the pointer (`pointer-events: none` in `transition.css`), so
   reaching content never depends on an animation completing.

   ── The beats ────────────────────────────────────────────────────────────────
   One animation per transition, in two halves, both resolved from the
   tokens (`--duration-transition-cover` / `--duration-transition-reveal`,
   `--ease-quiet`, `--color-background` — declared in `tokens.css`, read from
   the computed style exactly as `Menu` (WP-06b3) reads its own):

     • COVER  — opacity 0 → 1 over the cover duration. `onAnimationComplete`
       fires for both halves; only the cover's definition resolves to a fully
       opaque overlay, and that is the beat the action runs on. Nothing
       navigates before it — the unit test pins the ordering.
     • REVEAL — opacity 1 → 0 over the reveal duration, held by
       `AnimatePresence` (the component mounts in the persistent `[locale]`
       layout, never a `template.tsx`, so the exit half can run at all).
       `AnimatePresence`'s `onExitComplete` is the one callback that fires
       only when the exit animation has actually run — the reveal count and
       the cover's retirement live there.

   The action itself is the swappable handler from `src/lib/transition.ts`:
   the overlay owns the timing, the sequence owner (WP-06d) owns what the
   cover completion does, and the seam is what makes the ordering
   unit-testable in jsdom (the tests drive the beats rather than waiting for
   frames the harness would still animate in real time).

   ── The spinner ──────────────────────────────────────────────────────────────
   `role="progressbar"`, `aria-valuemax={1}`, `aria-valuenow` 0 while the
   cover runs and 1 once the reveal has started, with the `common.loading`
   label — the one meaningful node on the overlay; the lockup is decorative.
   The ring's rotation is pure CSS, infinite until the overlay unmounts.

   ── Instrumentation ──────────────────────────────────────────────────────────
   The host carries the `data-transition-*` attributes the e2e suite reads:
   `enabled`, `phase`, the cover and reveal **counts** (each incremented only
   when its animation has actually run to completion — the enter half passing
   proves nothing about the exit half), and `coverId`, from a ref counter
   rather than `previous?.id + 1`: a retired transition leaves no state to
   count from, and a restart at 1 would let a deduplicating reader mistake
   the second transition of the visit for one it had already seen.

   ── Reduced motion: skipped, not shortened ───────────────────────────────────
   Under the preference the host renders nothing, `beginTransition` finds no
   subscriber and degrades to a no-op, and nothing on this side of the tree
   animates. A shortened overlay is still motion. The preference is read
   through `usePrefersReducedMotion` (not Motion's own hook — see that
   module's header on why).
   ══════════════════════════════════════════════════════════════════════════════ */

/** The resolved motion values, or `null` where any of the tokens is absent. */
interface OverlayMotion {
  coverSeconds: number
  revealSeconds: number
  ease: [number, number, number, number]
}

/** `360ms` → `0.36` — motion takes seconds, the tokens declare ms (the same
    tailwind-resolved parsing `Menu` runs for its own tokens). */
function parseSeconds(value: string): number | null {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(ms|s)?$/)
  if (match === null) return null
  const amount = Number.parseFloat(match[1] ?? '0')
  return match[2] === 's' ? amount : amount / 1000
}

/** `cubic-bezier(0.3, 0, 0.2, 1)` → `[0.3, 0, 0.2, 1]`, as motion reads it. */
function parseCubicBezier(value: string): [number, number, number, number] | null {
  const match = value.trim().match(/^cubic-bezier\(([^)]+)\)$/)
  if (match === null) return null
  const points = (match[1] ?? '').split(',').map((part) => Number.parseFloat(part.trim()))
  if (points.length !== 4 || points.some((point) => Number.isNaN(point))) return null
  return [points[0]!, points[1]!, points[2]!, points[3]!]
}

/** One transition in flight: where it started from and where it is going. */
interface Cover {
  id: number
  from: string
  to: TransitionTarget
  /**
   * Set at cover completion — the beat the action runs on. The spinner reads
   * it: 0 while the cover runs, 1 once the reveal has started. Per cover
   * rather than on the counts, so a later transition starts at 0 again.
   */
  coverFinished: boolean
  /** The beats the caller of `beginTransition` asked to be told. */
  onCoverOpaque?: () => void
  onRevealComplete?: () => void
}

function resolveOverlayMotion(): OverlayMotion | null {
  if (typeof window === 'undefined') return null
  const style = getComputedStyle(document.documentElement)
  const coverSeconds = parseSeconds(style.getPropertyValue('--duration-transition-cover'))
  const revealSeconds = parseSeconds(style.getPropertyValue('--duration-transition-reveal'))
  const ease = parseCubicBezier(style.getPropertyValue('--ease-quiet'))
  /* Every value owes to a token: one that does not resolve keeps the whole
     resolution absent rather than mixing a token with a fallback literal —
     the same rule the menu's resolution runs on. */
  if (coverSeconds === null || revealSeconds === null || ease === null) return null
  return { coverSeconds, revealSeconds, ease }
}

export function TransitionOverlay() {
  const t = useTranslations('common')
  const reducedMotion = usePrefersReducedMotion()
  const enabled = !reducedMotion

  const [cover, setCover] = useState<Cover | null>(null)
  /* The reveal half in flight: true between the cover beat and the
     reveal's completion. It is its own state because by the time the reveal
     runs, `cover` is already gone — removing the child is what starts the
     exit — and the phase still has to read `cover` for the whole time the
     overlay is up. */
  const [revealing, setRevealing] = useState(false)
  /* Both halves, counted. The overlay is gone by the time the reveal
     completes, so the count lives on the host, which is as persistent as
     the layout, and each is incremented only when its animation has
     actually run. */
  const [coverCount, setCoverCount] = useState(0)
  const [revealCount, setRevealCount] = useState(0)
  /* The address the last transition started from, kept after that
     transition is retired — the instrumentation's "the overlay went up
     before the route changed" answer. */
  const [startedFrom, setStartedFrom] = useState('')

  /* The id counter. A ref that outlives the state it labels: the ids never
     restart, so a deduplicating reader cannot mistake a later transition
     for an earlier one. */
  const sequence = useRef(0)
  /* The cover whose reveal is running — the one whose callback the exit's
     completion calls. A ref: the exiting child is frozen, and the callback
     has to be the right one even if a new transition has begun meanwhile. */
  const revealingRef = useRef<Cover | null>(null)

  /* The motion, resolved from the tokens once — they are static, and the
     overlay cannot render before the resolution has run. */
  const [motionTokens] = useState<OverlayMotion | null>(() => resolveOverlayMotion())

  const begin = useCallback((options: BeginTransitionOptions) => {
    sequence.current += 1
    revealingRef.current = null
    setStartedFrom(options.from)
    setRevealing(false)
    setCover({
      id: sequence.current,
      from: options.from,
      to: options.to,
      coverFinished: false,
      onCoverOpaque: options.onCoverOpaque,
      onRevealComplete: options.onRevealComplete,
    })
  }, [])

  /* The imperative entry: the sequence owner (WP-06d) calls
     `beginTransition`, this component answers. Unmounted or reduced motion
     → no subscriber, the call degrades — the registration effect is the
     whole of the seam. */
  useEffect(() => {
    if (!enabled) return
    registerBeginTransition(begin)
    return () => registerBeginTransition(null)
  }, [enabled, begin])

  /* Named transitions: the cover runs on the `animate` half, the reveal on
     the `exit` half — one duration per half, both from the tokens. */
  const coverTransition = {
    duration: motionTokens?.coverSeconds ?? 0,
    ease: motionTokens?.ease,
  }
  const revealTransition = {
    duration: motionTokens?.revealSeconds ?? 0,
    ease: motionTokens?.ease,
  }

  return (
    <div
      data-transition-host=""
      data-transition-enabled={enabled ? 'true' : 'false'}
      data-transition-phase={cover === null && !revealing ? 'idle' : 'cover'}
      data-transition-cover-id={cover === null ? undefined : String(cover.id)}
      data-transition-covers={String(coverCount)}
      data-transition-reveals={String(revealCount)}
      data-transition-from={startedFrom}
    >
      <AnimatePresence
        onExitComplete={() => {
          /* Fires only when the reveal has actually run over the destination —
             the one callback that is the exit half itself. */
          setRevealCount((count) => count + 1)
          setRevealing(false)
          revealingRef.current?.onRevealComplete?.()
          revealingRef.current = null
        }}
      >
        {cover !== null && (
          <motion.div
            /* Mandatory. Without a key the library sees the same element
               across transitions and animates nothing. */
            key={cover.id}
            className="transition-overlay"
            /* The one surface colour, as a token — the overlay is a reader
               of `--color-background`, never a second definition of it. */
            style={{ backgroundColor: 'var(--color-background)' }}
            initial={{ opacity: 0 }}
            /* Each half carries its own transition — the cover on
               `animate`, the reveal on `exit`, one token duration each. */
            animate={{ opacity: 1, transition: coverTransition }}
            exit={{ opacity: 0, transition: revealTransition }}
            onAnimationComplete={(definition) => {
              /* Fires for both halves; only the cover's definition resolves
                 to the fully opaque overlay. Checked against the definition
                 rather than against state, which has already moved on by the
                 time the exit half completes. */
              const isCover =
                typeof definition === 'object' &&
                definition !== null &&
                'opacity' in definition &&
                definition.opacity === 1
              if (!isCover) return
              /* An animation of an earlier, replaced cover reports late and is
                 ignored: the current cover's beat owns the timing. */
              if (cover.id !== sequence.current) return
              /* Opaque at last, so the swap beneath it cannot be seen: this is
                 the beat the action runs on — and the only one. The callbacks
                 fire here, in the event. */
              setCoverCount((count) => count + 1)
              cover.onCoverOpaque?.()
              runTransitionAction(cover.to)
              /* Two stages, because the reveal's child is frozen: stage one
                 marks the cover finished (the spinner's 0 → 1 flip) and
                 commits it; stage two — the next task, after that commit —
                 removes the child, which is what runs the reveal, with the
                 flipped spinner in its frozen props. `AnimatePresence` holds
                 the element while the exit animates. */
              setCover((current) =>
                current === null || current.id !== cover.id
                  ? current
                  : { ...current, coverFinished: true },
              )
              window.setTimeout(() => {
                revealingRef.current = cover
                setRevealing(true)
                setCover((current) =>
                  current !== null && current.id === cover.id && current.coverFinished
                    ? null
                    : current,
                )
              }, 0)
            }}
          >
            {/* The positioned wrapper is what the `--name-landing-*` pair
                anchors: it holds the lockup's box and nothing else — the
                spinner is out of flow, above it — so the lockup rests in
                exactly the spot the landing lockup occupies. */}
            <div className="transition-overlay__lockup">
              <span
                className="transition-overlay__spinner"
                role="progressbar"
                aria-label={t('loading')}
                aria-valuemax={1}
                aria-valuenow={cover.coverFinished ? 1 : 0}
              />
              <TransitionLockup />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
