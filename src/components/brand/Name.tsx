import type { CSSProperties, Ref } from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORDMARK — THE ONE PLACE ITS PRESENTATION LIVES

   The companion to `Logo`: a thin wrapper over the committed `public/name.svg`
  , one ink, `<img>`-based, decorative by default. Every surface that
   shows the name — the landing lockup, the name-scroll instance, the menu
   and the transition lockup — renders this component and nothing else, so the
   wordmark's presentation lives in exactly one place.

   The width comes from the caller (the `--name-width` token family); the
   `width`/`height` attributes are the viewBox in px, rounded up, which is what
   gives the box its aspect before any CSS arrives and keeps the name animation
   free of layout shift.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface NameProps {
  className?: string
  style?: CSSProperties
  /** Passed through, so a caller that measures the name (the name scroll) can do so by ref. */
  ref?: Ref<HTMLImageElement>
}

export function Name({ className, style, ref }: NameProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a tiny same-origin SVG on the
       critical path; next/image would add an optimisation pass over a file that is
       already in its final form, and the ref below has to reach the element directly. */
    <img
      ref={ref}
      src="/name.svg"
      alt=""
      aria-hidden="true"
      width={335}
      height={87}
      draggable={false}
      className={className}
      style={style}
    />
  )
}
