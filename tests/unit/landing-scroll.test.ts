import { describe, expect, it } from 'vitest'

import { clamp01, travelProgress } from '@/lib/landing-scroll'

/* ══════════════════════════════════════════════════════════════════════════════
   THE NAME-TRAVEL MAPPING (WP-05)

   The pure half of the scroll animation: the offsets the layout measures
   arrive as data, and the mapping between them is the one thing a unit test
   can assert without a browser. The invariants are the plan's:

     • the name does not move before the mark has left the viewport — and not
       one pixel early;
     • the travel reaches its end at exactly the name's own exit;
     • clamped past both ends, so the name rests in the lockup above `s0` and
       stays pinned in the header slot below `s1`;
     • reduced motion is a step at `s1`, not a ramp over `s0`→`s1`.
   ══════════════════════════════════════════════════════════════════════════════ */

const S0 = 400
const S1 = 600

describe('clamp01', () => {
  it('clamps to [0, 1] and leaves the interval alone', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(0)).toBe(0)
    expect(clamp01(0.5)).toBe(0.5)
    expect(clamp01(1)).toBe(1)
    expect(clamp01(2)).toBe(1)
  })
})

describe('travelProgress', () => {
  it('is 0 while the mark is still on screen, and not one pixel early at its exit', () => {
    expect(travelProgress(0, S0, S1, false)).toBe(0)
    expect(travelProgress(S0 - 1, S0, S1, false)).toBe(0)
    expect(travelProgress(S0, S0, S1, false)).toBe(0)
  })

  it('is linear between the mark exit and the name exit', () => {
    expect(travelProgress(S0 + 50, S0, S1, false)).toBe(0.25)
    expect(travelProgress((S0 + S1) / 2, S0, S1, false)).toBe(0.5)
    expect(travelProgress(S1 - 1, S0, S1, false)).toBeGreaterThan(0.99)
  })

  it('reaches 1 at exactly the name exit and stays pinned past it', () => {
    expect(travelProgress(S1, S0, S1, false)).toBe(1)
    expect(travelProgress(S1 + 5000, S0, S1, false)).toBe(1)
  })

  it('is a step at the name exit under reduced motion: no travel', () => {
    expect(travelProgress(0, S0, S1, true)).toBe(0)
    /* The whole point: the name does not start at S0 — it is static until the
       fold has carried it away, then it is in the header. */
    expect(travelProgress(S0, S0, S1, true)).toBe(0)
    expect(travelProgress((S0 + S1) / 2, S0, S1, true)).toBe(0)
    expect(travelProgress(S1, S0, S1, true)).toBe(1)
    expect(travelProgress(S1 + 5000, S0, S1, true)).toBe(1)
  })

  it('degenerates safely when the window collapses (S1 <= S0)', () => {
    /* The mark and the name leave together: nothing to travel, and the name
       is in the header from the instant after they are gone. */
    expect(travelProgress(0, 500, 500, false)).toBe(0)
    expect(travelProgress(500, 500, 500, false)).toBe(0)
    expect(travelProgress(501, 500, 500, false)).toBe(1)
    /* s1 below s0 (a name that sits above the mark — not this layout, but a
       window the mapping must not divide by): the name is in the header from
       the moment past the trigger. */
    expect(travelProgress(601, 600, 400, false)).toBe(1)
  })
})
