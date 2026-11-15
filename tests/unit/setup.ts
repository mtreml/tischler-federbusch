import '@testing-library/jest-dom'

/* jsdom has no `window.matchMedia`; the reduced-motion hook reads it (see the
   stub's header). */
import './match-media'
