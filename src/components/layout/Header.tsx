'use client'

import { Name } from '@/components/brand/Name'
import { MENU_PANEL_ID, useMenu } from '@/lib/menu'
import { useBarVisible } from '@/lib/landing-scroll'

import { MenuButton } from './MenuButton'

// Fixed, transparent over the landing fold — the video runs across the full first screenful, so there is no solid bar.
// The background is 0/1 from the shared store (`src/lib/landing-scroll.ts`): the white bar appears the frame the
// works section's top reaches the name's bottom edge and stays — the frame the landing's clip starts to cut the
// pinned name, so the bar's name never has a gap — the bar keeps `pointer-events: none`. `introPending` mirrors
// the stage's `data-intro`: name and button arrive together.
// The centered name renders in the bar once it appears (landing) or always (`page` variant, impressum) — it must
// live here, not in the landing, because the landing clips its descendants the frame the bar appears.

interface HeaderProps {
  variant?: 'landing' | 'page'
  /** The landing intro's pending state, from `LandingIntro`; off everywhere else. */
  introPending?: boolean
}

export function Header({ variant = 'landing', introPending = false }: HeaderProps) {
  const barVisible = useBarVisible()
  const menu = useMenu()

  return (
    <header className="header" data-intro={introPending ? 'pending' : undefined}>
      <div
        className="header__background"
        style={{ opacity: variant === 'page' || barVisible ? 1 : 0 }}
        aria-hidden="true"
      />
      {variant === 'page' || barVisible ? (
        <div className="header__name" aria-hidden="true">
          <Name className="header__name-image" />
        </div>
      ) : null}
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
