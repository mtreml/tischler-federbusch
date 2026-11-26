import { logoPaths } from './logo-paths'

/* The landing's own mark: `public/logo.svg` inline, so the intro can draw it. The line is a filled outline, so a
   round-capped stroke along its centerline runs in a mask and reveals it; the white rect settles the mask once the
   pen is through, so the resting mark is the file's exact pixels. The bar is the line across the stage that closes
   in on the dot before the pen starts. Timing lives in `landing.css`. */

const MASK_ID = 'logo-intro-line-mask'

export interface LogoIntroProps {
  className?: string
}

export function LogoIntro({ className }: LogoIntroProps) {
  return (
    <span className="logo-intro">
      <svg
        viewBox="0 0 110.96 245.7"
        width={111}
        height={246}
        aria-hidden="true"
        focusable="false"
        className={className}
        fill="#1d1d1b"
      >
        <mask id={MASK_ID} maskUnits="userSpaceOnUse" x="-4" y="-4" width="119" height="254">
          <path
            className="logo-intro__pen"
            d={logoPaths.centerline}
            pathLength={1}
            fill="none"
            stroke="#fff"
            strokeWidth={3.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect className="logo-intro__settle" x="-4" y="-4" width="119" height="254" fill="#fff" />
        </mask>
        <path className="logo-intro__line" d={logoPaths.line} mask={`url(#${MASK_ID})`} />
        <path className="logo-intro__dot" d={logoPaths.dot} />
        <g className="logo-intro__sides">
          {logoPaths.sides.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
      <span className="logo-intro__bar" aria-hidden="true" />
    </span>
  )
}
