'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { site } from '@/config/site.config'
import { setHeaderScrollState, worksReached } from '@/lib/landing-scroll'

// The name's stick is CSS (`position: sticky` in `.landing__name-scroll`), so the compositor moves it with the
// scroll and it never lags a frame behind. This only writes the switches: the name is clickable once stuck, and
// the header's state — the bar's name takes over the moment the works section's top reaches the pinned name's
// bottom edge (the frame sticky lets go and the landing's clip starts to bite). The works section is read live each
// frame, so a phone's toolbar, zoom or a late layout shift never leave a stale threshold.

interface StickMetrics {
  /** The header slot's top, px from the viewport top. */
  headerTop: number
  /** The pinned name's bottom edge, px from the viewport top. */
  nameBottom: number
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

    const headerTop = cssLengthPx(
      getComputedStyle(document.documentElement).getPropertyValue('--name-header-top') ?? '',
    )

    setMetrics({ headerTop, nameBottom: headerTop + nameEl.getBoundingClientRect().height })
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure, { passive: true })
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    const nameEl = nameRef.current
    if (nameEl === null || metrics === null) return

    const worksEl = document.getElementById(site.routes.anchors.arbeiten!)
    let ticking = false

    const update = () => {
      ticking = false
      const worksTop = worksEl?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY
      // Half a pixel of slack: sticky can rest a subpixel off the slot at fractional scroll positions.
      const stuck = nameEl.getBoundingClientRect().top <= metrics.headerTop + 0.5
      nameEl.toggleAttribute('data-stuck', stuck)
      const nameHandedOver = worksReached(worksTop, metrics.nameBottom)
      setHeaderScrollState({ nameHandedOver })
      // The header's name takes over the same slot; hide this one in the same frame.
      nameEl.style.visibility = nameHandedOver ? 'hidden' : ''
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
