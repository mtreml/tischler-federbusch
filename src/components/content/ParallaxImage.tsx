'use client'

import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import type { ImageSourceSet } from '@mtreml/portfolio-core/media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE PARALLAX IMAGE (WP-07a)

   The small client piece of the works section: a pointer-move parallax over
   the Works image. `pointermove` on the frame maps the cursor's offset from
   the frame's centre to a small **opposite** translate on the image
   (the image drifts away from the cursor), and `pointerleave` resets it.

   ── The invariants this component owes ───────────────────────────────────────
   • **Transform only.** The handler writes `style.transform` and nothing
     else — no layout property is touched, so the CLS ≈ 0 invariant holds and
     the frame's box never moves. The frame clips, so the translate is
     visible as parallax rather than as overflow.
   • **Travel is a design value.** The cap is the `--parallax-travel` token
     in `tokens.css`, resolved from the computed style — the JavaScript never
     re-declares a figure the stylesheet owns (the menu intro's seam).
   • **Reduced motion is a skip.** Under the preference the listeners are
     never attached at all — there is nothing to collapse, because there is
     nothing that ever runs.
   • **Touch devices owe nothing.** A hover `pointermove` never fires on
     touch, so the parallax simply does not exist there; the image is a
     plain responsive `<img>` for everyone.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface ParallaxImageProps {
  /** The `<picture>`'s `<source>`s, in the configured preference order. */
  sources: ImageSourceSet[]
  /** The fallback `src`: the widest rung of the universally supported format. */
  src: string
  /** The rendered width of the image, for the browser's rung selection. */
  sizes: string
  /** Intrinsic dimensions, so the box is reserved before the bytes arrive. */
  width: number
  height: number
  /** The text alternative, from the central configuration. */
  alt: string
}

/**
 * The token as pixels: the computed style of a custom property is its declared
 * value, so `rem` is resolved against the root font size and anything else is
 * taken as-is. Zero when the token is missing or unparseable — the parallax
 * then does not run, which is the safe degenerate.
 */
function tokenToPx(value: string): number {
  const match = /^(-?[\d.]+)(px|rem)?$/u.exec(value.trim())
  if (match === null) return 0
  const number = Number.parseFloat(match[1] ?? '')
  if (Number.isNaN(number)) return 0
  if (match[2] === 'rem') {
    return number * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  }
  return number
}

export function ParallaxImage({ sources, src, sizes, width, height, alt }: ParallaxImageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  /* The travel cap, resolved once when the listener arms — a rem token is not
     a per-event read, and the value cannot change under a mounted frame. */
  const travelRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) return
    const frame = frameRef.current
    if (frame === null) return
    travelRef.current = tokenToPx(getComputedStyle(frame).getPropertyValue('--parallax-travel'))
  }, [reducedMotion])

  /* The opposite translate: the cursor's offset from the centre, mirrored,
     capped at the token's travel. Transform only — see the header. */
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const travel = travelRef.current
    const frame = frameRef.current
    const image = imageRef.current
    if (travel === 0 || frame === null || image === null) return
    const rect = frame.getBoundingClientRect()
    /* A zero box cannot be offset against — nothing is painted, nothing moves. */
    if (rect.width === 0 || rect.height === 0) return
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5
    image.style.transform = `translate3d(${(-offsetX * 2 * travel).toFixed(2)}px, ${(-offsetY * 2 * travel).toFixed(2)}px, 0)`
  }

  const onPointerLeave = () => {
    const image = imageRef.current
    if (image === null) return
    image.style.transform = ''
  }

  return (
    <div
      ref={frameRef}
      className="works__frame"
      onPointerMove={reducedMotion ? undefined : onPointerMove}
      onPointerLeave={reducedMotion ? undefined : onPointerLeave}
    >
      <picture>
        {sources.map((source) => (
          <source key={source.format} type={source.type} srcSet={source.srcSet} sizes={sizes} />
        ))}
        <img
          ref={imageRef}
          className="works__image"
          src={src}
          sizes={sizes}
          width={width}
          height={height}
          alt={alt}
          loading="lazy"
          decoding="async"
        />
      </picture>
    </div>
  )
}
