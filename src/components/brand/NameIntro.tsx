import { namePaths } from './name-paths'

/* The landing's own wordmark, inline, so each word can be wiped in by a sliding gradient mask —
   federbusch left to right, TISCHLERMEISTER top to bottom. Each mask rect rests with its white run over the word and
   its soft edge past it; the intro starts it one rect-length back. Timing lives in `landing.css`. */

const FEDER_MASK_ID = 'name-intro-federbusch-mask'
const TISCHLER_MASK_ID = 'name-intro-tischlermeister-mask'

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
        <linearGradient id={`${TISCHLER_MASK_ID}-fade`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0.68" stopColor="#fff" />
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
      <mask id={TISCHLER_MASK_ID} maskUnits="userSpaceOnUse" x="-2" y="-2" width="339" height="91">
        <rect
          className="name-intro__wipe name-intro__wipe--tischlermeister"
          x="-2"
          y="70"
          width="339"
          height="25"
          fill={`url(#${TISCHLER_MASK_ID}-fade)`}
          stroke="none"
        />
      </mask>
      <g mask={`url(#${FEDER_MASK_ID})`} strokeWidth={0.75}>
        {namePaths.federbusch.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g mask={`url(#${TISCHLER_MASK_ID})`}>
        {namePaths.tischlermeister.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}
