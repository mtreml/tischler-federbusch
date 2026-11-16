'use client'

import { MENU_PANEL_ID, useMenu } from '@/lib/menu'
import { useLandingProgress } from '@/lib/landing-scroll'

import { MenuButton } from './MenuButton'

/* ══════════════════════════════════════════════════════════════════════════════
   THE HEADER

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
   The hamburger, top right — the `MenuButton` wired to the menu's
   state: one press, one toggle. The bar itself keeps
   `pointer-events: none`, so it never intercepts the film below it — only
   the actions area re-enables pointer events (the CSS in `landing.css`).
   The name's home position top left is **not** here: it is the name-scroll
   instance and the menu's, both reading the base tokens —
   the header reserves the slot, the name occupies it.

   ── The intro ────────────────────────────────────────────────────────────────
   On the landing, `introPending` mirrors the stage's `data-intro="pending"`:
   while the lockup fades in, the hamburger sits at `opacity: 0` and eases in
   on the same `--duration-intro` / `--ease-quiet` beat (`src/styles/landing.css`),
   so mark, name and button arrive together.
   ══════════════════════════════════════════════════════════════════════════════ */

interface HeaderProps {
  /** The landing intro's pending state, from `LandingIntro`; off everywhere else. */
  introPending?: boolean
}

export function Header({ introPending = false }: HeaderProps) {
  const progress = useLandingProgress()
  const menu = useMenu()

  return (
    <header className="header" data-intro={introPending ? 'pending' : undefined}>
      <div className="header__background" style={{ opacity: progress }} aria-hidden="true" />
      <div className="header__actions">
        <MenuButton
          open={menu.isOpen}
          onToggle={() => (menu.isOpen ? menu.close() : menu.open())}
          controlsId={MENU_PANEL_ID}
        />
      </div>
    </header>
  )
}
