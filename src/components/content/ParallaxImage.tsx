'use client'

import { useEffect, useRef } from 'react'
import type { PointerEvent } from 'react'

import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import type { ImageSourceSet } from '@mtreml/portfolio-core/media'

// Pointer-move parallax: the cursor's offset from the frame centre maps to a small opposite
// translate on the image (`pointerleave` resets). Transform only (CLS ≈ 0). The travel cap
// is the `--parallax-travel` token, resolved from the computed style. Reduced motion → the
// listeners are never attached. Touch never fires a hover `pointermove`, so it is a plain `<img>`.

export interface ParallaxImageProps {
  sources: ImageSourceSet[]
  src: string
  sizes: string
  width: number
  height: number
  alt: string
}

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
  const travelRef = useRef(0)

  useEffect(() => {
    if (reducedMotion) return
    const frame = frameRef.current
    if (frame === null) return
    travelRef.current = tokenToPx(getComputedStyle(frame).getPropertyValue('--parallax-travel'))
  }, [reducedMotion])

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const travel = travelRef.current
    const frame = frameRef.current
    const image = imageRef.current
    if (travel === 0 || frame === null || image === null) return
    const rect = frame.getBoundingClientRect()
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
