import { describe, expect, it } from 'vitest'

import { worksReached } from '@/lib/landing-scroll'

/* ══════════════════════════════════════════════════════════════════════════════
   THE BAR-VISIBILITY MAPPING

   The pure half of the scroll: the offsets the layout measures arrive as
   data, and the mapping between them is the one thing a unit test can
   assert without a browser. The invariants are the plan's:

     • the name handover and the white bar each fire exactly when the works
       section's top reaches their edge (the name's bottom edge, the viewport
       top), and stay past it.
   ══════════════════════════════════════════════════════════════════════════════ */

const NAME_BOTTOM = 96

describe('worksReached', () => {
  it('is false while the works top is below the edge, and not one pixel early', () => {
    expect(worksReached(800, NAME_BOTTOM)).toBe(false)
    expect(worksReached(NAME_BOTTOM + 1, NAME_BOTTOM)).toBe(false)
    expect(worksReached(1, 0)).toBe(false)
  })

  it('is true at exactly the edge and stays past it', () => {
    expect(worksReached(NAME_BOTTOM, NAME_BOTTOM)).toBe(true)
    expect(worksReached(-5000, NAME_BOTTOM)).toBe(true)
    expect(worksReached(0, 0)).toBe(true)
  })

  it('hands the name over before the bar turns white', () => {
    const worksTop = NAME_BOTTOM / 2
    expect(worksReached(worksTop, NAME_BOTTOM)).toBe(true)
    expect(worksReached(worksTop, 0)).toBe(false)
  })
})
