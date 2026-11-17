'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'

import { TransitionLockup } from '@/components/layout/TransitionLockup'
import {
  registerBeginTransition,
  runTransitionAction,
  setTransitionCommit,
  type BeginTransitionOptions,
  type TransitionTarget,
} from '@/lib/transition'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

// Cover, then reveal: in over the outgoing page, the route/anchor swap beneath the opaque cover, and the cover lifts
// only once the swap has committed — revealing the outgoing page would leak its header through the fade.
// Never takes the pointer; `data-transition-*` attributes are e2e instrumentation. Reduced motion: skipped, not shortened.

interface OverlayMotion {
  coverSeconds: number
  revealSeconds: number
  ease: [number, number, number, number]
}

function parseSeconds(value: string): number | null {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(ms|s)?$/)
  if (match === null) return null
  const amount = Number.parseFloat(match[1] ?? '0')
  return match[2] === 's' ? amount : amount / 1000
}

function parseCubicBezier(value: string): [number, number, number, number] | null {
  const match = value.trim().match(/^cubic-bezier\(([^)]+)\)$/)
  if (match === null) return null
  const points = (match[1] ?? '').split(',').map((part) => Number.parseFloat(part.trim()))
  if (points.length !== 4 || points.some((point) => Number.isNaN(point))) return null
  return [points[0]!, points[1]!, points[2]!, points[3]!]
}

interface Cover {
  id: number
  from: string
  to: TransitionTarget
  /** Set at cover completion; the spinner reads it: 0 while the cover runs, 1 once the reveal has started. */
  coverFinished: boolean
  onCoverOpaque?: () => void
  onRevealComplete?: () => void
}

function resolveOverlayMotion(): OverlayMotion | null {
  if (typeof window === 'undefined') return null
  const style = getComputedStyle(document.documentElement)
  const coverSeconds = parseSeconds(style.getPropertyValue('--duration-transition-cover'))
  const revealSeconds = parseSeconds(style.getPropertyValue('--duration-transition-reveal'))
  const ease = parseCubicBezier(style.getPropertyValue('--ease-quiet'))
  if (coverSeconds === null || revealSeconds === null || ease === null) return null
  return { coverSeconds, revealSeconds, ease }
}

export function TransitionOverlay() {
  const t = useTranslations('common')
  const reducedMotion = usePrefersReducedMotion()
  const enabled = !reducedMotion

  const [cover, setCover] = useState<Cover | null>(null)
  // The reveal half in flight: its own state because `cover` is gone by the time the reveal runs.
  const [revealing, setRevealing] = useState(false)
  const [coverCount, setCoverCount] = useState(0)
  const [revealCount, setRevealCount] = useState(0)
  const [startedFrom, setStartedFrom] = useState('')

  // Ids never restart, so a deduplicating reader cannot mistake a later transition for an earlier one.
  const sequence = useRef(0)
  const revealingRef = useRef<Cover | null>(null)
  // The cover awaiting its reveal: the action's route change commits async, so the reveal starts on the commit, not on the next task.
  const pendingRevealRef = useRef<Cover | null>(null)

  const beginReveal = useCallback((pending: Cover) => {
    revealingRef.current = pending
    setRevealing(true)
    setCover((current) =>
      current !== null && current.id === pending.id && current.coverFinished ? null : current,
    )
  }, [])

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
    return true
  }, [])

  useEffect(() => {
    if (!enabled) return
    registerBeginTransition(begin)
    return () => registerBeginTransition(null)
  }, [enabled, begin])

  useEffect(() => {
    if (!enabled) return
    setTransitionCommit(() => {
      const pending = pendingRevealRef.current
      if (pending === null || pending.id !== sequence.current) return
      pendingRevealRef.current = null
      beginReveal(pending)
    })
    return () => setTransitionCommit(null)
  }, [enabled, beginReveal])

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
          setRevealCount((count) => count + 1)
          setRevealing(false)
          revealingRef.current?.onRevealComplete?.()
          revealingRef.current = null
        }}
      >
        {cover !== null && (
          <motion.div
            key={cover.id} // without a key the library animates nothing
            className="transition-overlay"
            style={{ backgroundColor: 'var(--color-background)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: coverTransition }}
            exit={{ opacity: 0, transition: revealTransition }}
            onAnimationComplete={(definition) => {
              const isCover =
                typeof definition === 'object' &&
                definition !== null &&
                'opacity' in definition &&
                definition.opacity === 1
              if (!isCover) return
              if (cover.id !== sequence.current) return // a replaced cover reporting late
              setCoverCount((count) => count + 1)
              cover.onCoverOpaque?.()
              runTransitionAction(cover.to)
              setCover((current) =>
                current === null || current.id !== cover.id
                  ? current
                  : { ...current, coverFinished: true },
              )
              // The commit seam releases the reveal once the action has committed; `coverFinished` was already painted, so `beginReveal` may drop the child straight away.
              pendingRevealRef.current = cover
            }}
          >
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
