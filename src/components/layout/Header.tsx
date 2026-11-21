'use client'

import { Logo } from '@/components/brand/Logo'
import { Name } from '@/components/brand/Name'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { MENU_PANEL_ID, useMenu } from '@/lib/menu'
import { useHeaderScrollState } from '@/lib/landing-scroll'

import { MenuButton } from './MenuButton'

// Fixed, transparent over the landing fold — the video runs across the full first screenful, so there is no solid bar.
// Two moments from the shared store (`src/lib/landing-scroll.ts`): the header's name mounts the frame the works
// section's top reaches the pinned name's bottom edge — the landing's clip starts to cut that name, so it must live
// here, not in the landing. The landing's white bar is `.header-backdrop`, sticky in the page itself; the `page`
// variant (impressum) has name and background from the start. The bar keeps `pointer-events: none`. `introPending` mirrors
// the stage's `data-intro`: name and button arrive together.

interface HeaderProps {
  variant?: 'landing' | 'page'
  /** The landing intro's pending state, from `LandingIntro`; off everywhere else. */
  introPending?: boolean
}

export function Header({ variant = 'landing', introPending = false }: HeaderProps) {
  const t = useTranslations('header')
  const { nameHandedOver } = useHeaderScrollState()
  const menu = useMenu()
  const isPage = variant === 'page'

  return (
    <header className="header" data-intro={introPending ? 'pending' : undefined}>
      {isPage ? <div className="header__background" aria-hidden="true" /> : null}
      {isPage || nameHandedOver ? (
        <Logo className={isPage ? 'header__logo' : 'header__logo header__logo--fade'} />
      ) : null}
      {isPage || nameHandedOver ? (
        <Link
          className="header__name"
          href="/"
          data-transition="landing"
          aria-label={t('nameLabel')}
        >
          <Name className="header__name-image" />
        </Link>
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
