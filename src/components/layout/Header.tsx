'use client'

import { useLandingProgress } from '@/lib/landing-scroll'

/* ══════════════════════════════════════════════════════════════════════════════
   THE HEADER (WP-05)

   Fixed, and **transparent over the landing fold**: the video runs across the
   full first screenful (decided — open question 19), so there is no solid bar
   to sit above it. The header floats over the film, and the warm background
   fades in as the landing scrolls away.

   ── The fade is the name's travel ────────────────────────────────────────────
   The background's opacity is the name-travel progress, read from the shared
   store rather than measured a second time: the name starts moving when the
   mark leaves the viewport and lands in its header slot when the name has
   scrolled out of the fold — and the background reaches full `--color-background`
   on exactly that beat, so the name arrives into an already-warm corner. One
   progress, two readers (`src/lib/landing-scroll.ts`); neither component
   knows the other. Transform/opacity only — the header itself does not move,
   and the opacity is what animates.

   ── What it carries ─────────────────────────────────────────────────────────
   The hamburger, top right — which is WP-06's, so this file is the bar and
   the mount point, not the control: `pointer-events: none` until the button
   lands, because a bar with no control must not intercept the film below it.
   The name's home position top left is **not** here: it is the name-scroll
   instance (WP-05) and the menu's (WP-06), both reading the WP-02 tokens —
   the header reserves the slot, the name occupies it.
   ══════════════════════════════════════════════════════════════════════════════ */

export function Header() {
  const progress = useLandingProgress()

  return (
    <header className="header">
      <div className="header__background" style={{ opacity: progress }} aria-hidden="true" />
      {/* The hamburger (WP-06) mounts here, top right. */}
    </header>
  )
}
