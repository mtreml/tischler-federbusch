import type { CSSProperties, Ref } from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MARK — THE ONE PLACE ITS PRESENTATION LIVES (WP-05)

   A thin wrapper over the committed `public/logo.svg` (WP-04): one file, one
   ink (`#1d1d1b`, from the logo sources), so no `currentColor` handling is
   owed and an `<img>` is the whole of the component. The landing lockup, the
   name-scroll's lockup half and WP-06's menu name / transition lockup all
   consume this component and the raw file never, so the mark's presentation
   cannot be re-declared in a second place.

   Decorative by default: `alt=""` + `aria-hidden`, with the section owning the
   accessible name — the wordmark next to it spells the name out, and the a11y
   text of the page is not the SVG's business.

   Sizing is the caller's, through `className`: the width is the one figure a
   layout decides (tokens) and the height stays derived from the viewBox the
   `width`/`height` attributes declare, so the box never shifts while the file
   loads. The attributes are the viewBox in px, rounded up.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface LogoProps {
  className?: string
  style?: CSSProperties
  /** Passed through, so a caller that measures the mark (the name scroll) can do so by ref. */
  ref?: Ref<HTMLImageElement>
}

export function Logo({ className, style, ref }: LogoProps) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- a tiny same-origin SVG on the
       critical path; next/image would add an optimisation pass over a file that is
       already in its final form, and the ref below has to reach the element directly. */
    <img
      ref={ref}
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      width={111}
      height={246}
      draggable={false}
      className={className}
      style={style}
    />
  )
}
