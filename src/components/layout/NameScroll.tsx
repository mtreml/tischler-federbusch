'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { setLandingProgress, travelProgress } from '@/lib/landing-scroll'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

/* ══════════════════════════════════════════════════════════════════════════════
   THE NAME'S TRAVEL

   One `Name` instance, in flow inside the landing lockup, transform-driven —
   no layout shift, ever. It rests at the lockup's position and translates to
   the header slot:

     • the trigger is the **mark**, not the name. The mark is portrait and on
       top, so it leaves the viewport first; the travel starts at exactly the
       offset where the mark's bottom edge crosses the top of the viewport
       (`s0`) and not before. Before `s0` the transform is empty and the
       name is byte-identical to the lockup it belongs to.
     • the end is the name's own exit: the travel reaches the header slot at
       exactly the offset where the name's top edge has scrolled out of the
       landing fold (`s1`). From then on the name stays pinned in its header
       slot while the page scrolls on — which the mapping gets for free,
       because the slot's stage-relative position moves with the scroll and
       the clamped progress keeps tracking it.
     • the final position and size read the base tokens (`--name-header-top`,
       `--spacing-gutter`, the shared `--name-width`), so they are identical
       to the menu's name slot and the transition overlay's: the four
       surfaces read one token set, and opening or closing the menu never
       moves the name.

   ── Measurement ─────────────────────────────────────────────────────────────
   Both offsets and the translate delta are measured from the real layout —
   the mark's and the name's own boxes, plus the tokens' computed values —
   and re-measured on resize. The name is measured with its transform
   cleared for the duration of the read, so a re-measure mid-travel reads the
   resting position rather than the travelled one. The mark is tall and the
   name narrow, so on a phone the `s0`→`s1` window is short; the mapping is
   the plain linear one from `travelProgress`, which stays smooth over it.

   ── Cost ────────────────────────────────────────────────────────────────────
   One passive `scroll` listener, rAF-throttled, transform-only, with
   `will-change` scoped to the interval where the name is actually travelling.
   When the page is not scrolling, nothing here runs.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The offsets and the translate constants, measured once per layout. */
interface TravelMetrics {
  /** The mark-exit offset: the travel starts here. */
  s0: number
  /** The name-exit offset: the travel reaches its end here. */
  s1: number
  /** Constant part of the x translate, in px: natural center → header-slot center. */
  dx: number
  /** Constant part of the y translate; the `+ s` term is added per update, which is what
   *  keeps the name pinned to the header slot after the travel has ended. */
  dyBase: number
}

/** A computed CSS length (`1.25rem`, `8px`, …) as px, resolved against the root. */
function cssLengthPx(value: string): number {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (match === null) return 0
  const amount = Number.parseFloat(match[1] ?? '0')
  const unit = match[2] ?? 'px'
  if (unit === 'px') return amount
  /* `rem` (and `em` at the root, where the tokens live) resolve against the
     root font size. */
  return amount * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export interface NameScrollProps {
  /** The mark's element: `s0` is measured from its box. */
  logoRef: RefObject<HTMLImageElement | null>
  children: ReactNode
}

export function NameScroll({ logoRef, children }: NameScrollProps) {
  const nameRef = useRef<HTMLSpanElement>(null)
  const [metrics, setMetrics] = useState<TravelMetrics | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const measure = useCallback(() => {
    const nameEl = nameRef.current
    const logoEl = logoRef.current
    if (nameEl === null || logoEl === null) return

    const scroll = window.scrollY
    /* Read the resting position: the transform is what this component writes,
       so a re-measure mid-travel has to clear it first and hand it back. */
    const previous = nameEl.style.transform
    nameEl.style.transform = 'none'
    const nameRect = nameEl.getBoundingClientRect()
    const logoRect = logoEl.getBoundingClientRect()
    nameEl.style.transform = previous

    const rootStyle = getComputedStyle(document.documentElement)
    const gutter = cssLengthPx(rootStyle.getPropertyValue('--spacing-gutter'))
    const headerTop = cssLengthPx(rootStyle.getPropertyValue('--name-header-top'))

    const nameCxDoc = nameRect.left + nameRect.width / 2
    const nameCyDoc = scroll + nameRect.top + nameRect.height / 2

    setMetrics({
      /* The mark's bottom edge at the top of the viewport. */
      s0: scroll + logoRect.bottom,
      /* The name's top edge at the top of the viewport. */
      s1: scroll + nameRect.top,
      /* The header slot, in viewport space, as a delta from the name's natural center. */
      dx: gutter + nameRect.width / 2 - nameCxDoc,
      dyBase: headerTop + nameRect.height / 2 - nameCyDoc,
    })
  }, [logoRef])

  /* Measure on mount and on every layout change. */
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure, { passive: true })
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  /* Apply. Re-runs when the metrics or the preference change; between runs it
     is pure scroll work — one passive listener, one rAF, transform-only. */
  useEffect(() => {
    const nameEl = nameRef.current
    if (nameEl === null || metrics === null) return

    let ticking = false

    const update = () => {
      ticking = false
      const s = window.scrollY
      const p = travelProgress(s, metrics.s0, metrics.s1, reducedMotion)
      if (p === 0) {
        nameEl.style.transform = ''
        nameEl.style.willChange = 'auto'
      } else {
        nameEl.style.transform = `translate(${metrics.dx * p}px, ${(metrics.dyBase + s) * p}px)`
        /* Scoping: the hint is owed while the name travels, not while it rests
           or stays pinned. */
        nameEl.style.willChange = p < 1 ? 'transform' : 'auto'
      }
      /* The header's background reads the same progress — one movement, two readers. */
      setLandingProgress(p)
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
    }
  }, [metrics, reducedMotion])

  return (
    <span ref={nameRef} className="landing__name-scroll">
      {children}
    </span>
  )
}
