import { describe, expect, it } from 'vitest'

import { barVisibleAt, stickOffset } from '@/lib/landing-scroll'

/* ══════════════════════════════════════════════════════════════════════════════
   THE NAME-STICK AND BAR-VISIBILITY MAPPING

   The pure half of the scroll: the offsets the layout measures arrive as
   data, and the mapping between them is the one thing a unit test can
   assert without a browser. The invariants are the plan's:

     • the name does not move before its top edge reaches the header slot —
       and not one pixel early;
     • past the stick point the translate tracks the scroll exactly, so the
       name rests in the header slot at every further position;
     • the bar is hidden while the fold is on screen, appears exactly at the
       handover scroll (works top at the name's bottom edge), and stays.
   ══════════════════════════════════════════════════════════════════════════════ */

const S_STICK = 600
const BAR_ON_AT = 900

describe('stickOffset', () => {
  it('is 0 before the stick point, and not one pixel early', () => {
    expect(stickOffset(0, S_STICK)).toBe(0)
    expect(stickOffset(S_STICK - 1, S_STICK)).toBe(0)
    expect(stickOffset(S_STICK, S_STICK)).toBe(0)
  })

  it('tracks the scroll exactly past the stick point', () => {
    expect(stickOffset(S_STICK + 50, S_STICK)).toBe(50)
    expect(stickOffset(S_STICK + 5000, S_STICK)).toBe(5000)
  })
})

describe('barVisibleAt', () => {
  it('is hidden before the handover scroll, and not one pixel early', () => {
    expect(barVisibleAt(0, BAR_ON_AT)).toBe(false)
    expect(barVisibleAt(BAR_ON_AT - 1, BAR_ON_AT)).toBe(false)
  })

  it('appears at exactly the handover scroll and stays', () => {
    expect(barVisibleAt(BAR_ON_AT, BAR_ON_AT)).toBe(true)
    expect(barVisibleAt(BAR_ON_AT + 5000, BAR_ON_AT)).toBe(true)
  })
})
