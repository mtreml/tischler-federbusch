'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

import { setLandingProgress, travelProgress } from '@/lib/landing-scroll'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'

// The name's travel: transform-driven, no layout shift. The mark triggers it (s0: the
// mark's bottom edge crosses the viewport top); it ends at s1 (the name scrolled out of
// the landing fold) and then stays pinned in the header slot. Final position/size read
// the base tokens, so the menu's name slot and the overlay's never move when the menu toggles.
// One passive rAF-throttled scroll listener; `will-change` only while travelling.

interface TravelMetrics {
  s0: number
  s1: number
  dx: number
  /** Constant part of the y translate; `+ s` is added per update, pinning the name to the header slot after the travel. */
  dyBase: number
}

function cssLengthPx(value: string): number {
  const match = value.trim().match(/^(-?\d*\.?\d+)(px|rem|em)?$/)
  if (match === null) return 0
  const amount = Number.parseFloat(match[1] ?? '0')
  const unit = match[2] ?? 'px'
  if (unit === 'px') return amount
  return amount * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
}

export interface NameScrollProps {
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
    // Clear the transform for the read: a re-measure mid-travel must read the resting position.
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
      s0: scroll + logoRect.bottom,
      s1: scroll + nameRect.top,
      dx: gutter + nameRect.width / 2 - nameCxDoc,
      dyBase: headerTop + nameRect.height / 2 - nameCyDoc,
    })
  }, [logoRef])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure, { passive: true })
    return () => window.removeEventListener('resize', measure)
  }, [measure])

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
        nameEl.style.willChange = p < 1 ? 'transform' : 'auto'
      }
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
