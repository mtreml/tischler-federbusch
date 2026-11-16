'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { site } from '@/config/site.config'
import { barVisibleAt, setBarVisible, stickOffset } from '@/lib/landing-scroll'

// The name's stick: transform-driven, no layout shift. The name scrolls up with the page and, the frame its
// natural top edge reaches `--name-header-top`, pins there — no horizontal travel, it stays centered, so the
// pinned name is the bar's centered name. The same handler writes the bar's visibility: the bar's name takes
// over the moment the works section's top reaches the name's bottom edge — the frame the landing's clip starts
// to bite the pinned name — so the name is never absent. Final position/size read the base tokens, so the menu's
// and the overlay's name slots never move when the menu toggles.

interface StickMetrics {
  /** The scrollY at which the name's natural top edge reaches the header slot. */
  sStick: number
  /** The scrollY at which the works section's top reaches the name's bottom edge; the bar is visible at and below it. */
  barOnAt: number | null
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
  children: ReactNode
}

export function NameScroll({ children }: NameScrollProps) {
  const nameRef = useRef<HTMLSpanElement>(null)
  const [metrics, setMetrics] = useState<StickMetrics | null>(null)

  const measure = useCallback(() => {
    const nameEl = nameRef.current
    if (nameEl === null) return

    const scroll = window.scrollY
    // Clear the transform for the read: a re-measure mid-stick must read the resting position.
    const previous = nameEl.style.transform
    nameEl.style.transform = 'none'
    const nameRect = nameEl.getBoundingClientRect()
    const worksEl = document.getElementById(site.routes.anchors.arbeiten!)
    const worksRect = worksEl?.getBoundingClientRect()
    nameEl.style.transform = previous

    const headerTop = cssLengthPx(
      getComputedStyle(document.documentElement).getPropertyValue('--name-header-top') ?? '',
    )

    const nameBottom = headerTop + nameRect.height

    setMetrics({
      sStick: scroll + nameRect.top - headerTop,
      barOnAt: worksRect === undefined ? null : scroll + worksRect.top - nameBottom,
    })
  }, [])

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
      const ty = stickOffset(s, metrics.sStick)
      if (ty === 0) {
        nameEl.style.transform = ''
        nameEl.style.willChange = 'auto'
      } else {
        nameEl.style.transform = `translateY(${ty}px)`
        nameEl.style.willChange = 'transform'
      }
      const barOn = metrics.barOnAt !== null && barVisibleAt(s, metrics.barOnAt)
      setBarVisible(barOn)
      // The bar's name (the header's) takes over the same slot; hide this one in the same frame. `visibility`
      // keeps the layout and the re-measure read intact.
      nameEl.style.visibility = barOn ? 'hidden' : ''
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
  }, [metrics])

  return (
    <span ref={nameRef} className="landing__name-scroll">
      {children}
    </span>
  )
}
