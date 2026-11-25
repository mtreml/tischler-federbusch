import { namePaths } from './name-paths'

/* The landing's own wordmark, inline, so federbusch can be wiped in left to right by a sliding gradient mask and
   TISCHLERMEISTER faded in with the mark's sides. The mask rect rests with its white run over the word and its soft
   edge past it; the intro starts it one rect-length back. Timing lives in `landing.css`. */

const FEDER_MASK_ID = 'name-intro-federbusch-mask'

export interface NameIntroProps {
  className?: string
}

export function NameIntro({ className }: NameIntroProps) {
  return (
    <svg
      viewBox="0 0 334.89 86.88"
      width={335}
      height={87}
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="#1d1d1b"
      stroke="#1d1d1b"
      strokeMiterlimit={10}
    >
      <defs>
        <linearGradient id={`${FEDER_MASK_ID}-fade`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.85" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
      </defs>
      <mask id={FEDER_MASK_ID} maskUnits="userSpaceOnUse" x="-2" y="-2" width="339" height="91">
        <rect
          className="name-intro__wipe name-intro__wipe--federbusch"
          x="-2"
          y="-2"
          width="400"
          height="91"
          fill={`url(#${FEDER_MASK_ID}-fade)`}
          stroke="none"
        />
      </mask>
      <g mask={`url(#${FEDER_MASK_ID})`} strokeWidth={0.75}>
        {namePaths.federbusch.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g className="name-intro__tischlermeister">
        {namePaths.tischlermeister.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
