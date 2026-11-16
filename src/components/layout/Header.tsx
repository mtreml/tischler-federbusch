'use client'

import { MENU_PANEL_ID, useMenu } from '@/lib/menu'
import { useLandingProgress } from '@/lib/landing-scroll'

import { MenuButton } from './MenuButton'

// Fixed, transparent over the landing fold — the video runs across the full first screenful, so there is no solid bar.
// The background's opacity is the name-travel progress, read from the shared store (one progress, two readers, `src/lib/landing-scroll.ts`);
// the bar keeps `pointer-events: none`. `introPending` mirrors the stage's `data-intro`: mark, name and button arrive together.


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
