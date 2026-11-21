import type { CSSProperties, Ref } from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE WORDMARK — THE ONE PLACE ITS PRESENTATION LIVES

   The companion to `Logo`: a thin wrapper over the committed
   `public/federbusch.svg` and `public/tischlermeister.svg`, one ink,
   `<img>`-based, decorative by default. Every surface that shows the name —
   the landing lockup, the name-scroll instance, the menu and the transition
   lockup — renders this component and nothing else, so the wordmark's
   presentation lives in exactly one place.

   The width comes from the caller (the `--name-width` token family); the box
   keeps the original 334.89453 × 86.875 lockup's aspect and each part sits at
   its offset within it, in percent, so the pair scales as one.
   ══════════════════════════════════════════════════════════════════════════════ */

export interface NameProps {
  className?: string
  style?: CSSProperties
  /** Passed through, so a caller that measures the name (the name scroll) can do so by ref. */
  ref?: Ref<HTMLSpanElement>
}

const partStyle: CSSProperties = { position: 'absolute', maxWidth: 'none' }

export function Name({ className, style, ref }: NameProps) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        position: 'relative',
        aspectRatio: '334.89453 / 86.875',
        ...style,
      }}
    >
      {/* eslint-disable @next/next/no-img-element -- tiny same-origin SVGs on the critical path,
          already in their final form. */}
      <img
        src="/federbusch.svg"
        alt=""
        width={335}
        height={87}
        draggable={false}
        style={{
          ...partStyle,
          left: '0.0015%',
          top: '-0.0058%',
          width: '99.9957%',
          height: '99.8446%',
        }}
      />
      <img
        src="/tischlermeister.svg"
        alt=""
        width={170}
        height={16}
        draggable={false}
        style={{
          ...partStyle,
          left: '24.3181%',
          top: '81.6345%',
          width: '50.5876%',
          height: '18.3712%',
        }}
      />
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  )
}
