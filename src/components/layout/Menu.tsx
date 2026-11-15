'use client'

import { AnimatePresence } from 'motion/react'
import { useLocale, useTranslations } from 'next-intl'
import type { MouseEvent } from 'react'

import { Name } from '@/components/brand/Name'
import { MenuButton } from '@/components/layout/MenuButton'
import { site } from '@/config/site.config'
import { Link } from '@/i18n/navigation'
import { pathFor } from '@/i18n/paths'
import { resolveContact } from '@/lib/config/resolve'
import { MENU_PANEL_ID, useMenu } from '@/lib/menu'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU PANEL (WP-06b2)

   The full-page overlay: the background-color layer, the name top left at
   exactly the name-home geometry, the X top right, the three entries stacked
   in `site.navigation.items` order — the menu renders this list and nothing
   else. The state (open/close, Escape, the scroll lock, the focus management)
   is the provider's (`src/lib/menu.tsx`, WP-06b1); this component is the
   surface: it renders, and it reports.

   ── Why `AnimatePresence` ────────────────────────────────────────────────────
   The panel mounts in the persistent `[locale]` layout — never a `template.tsx`
   (see the layout's header comment) — so the layout is not remounted across
   navigation and `AnimatePresence` can hold the outgoing panel while an exit
   animation runs. WP-06b3 puts the intro and the stagger on exactly this
   markup; open/close is instant in this work package.

   ── The name is a link at the name-home geometry ─────────────────────────────
   The name reads the same `--name-header-*` / `--name-width*` tokens the
   header slot does (WP-05), so the name on the page and the name in the menu
   are byte-identical: opening or closing the menu never moves the name.

   ── The fallback actions (WP-06d replaces them) ──────────────────────────────
   Plain navigation, no transition overlay:
     • the name link — `close()`, then the landing plus the top of the page;
     • the anchor entry — `close()`, then a jump to the anchor (the landing is
       navigated first when the menu was opened elsewhere).
   Both read the *finished, localized* URL off `window.location` (the raw
   read `src/i18n/navigation.ts` sanctions), and the landing path is built
   through `pathFor` — never a second copy of a route. The tel and mailto
   entries are native links and are never touched.
   ══════════════════════════════════════════════════════════════════════════════ */

/** One row of the entry list, in the order `site.navigation.items` declares it. */
function menuEntryHref(item: (typeof site.navigation.items)[number]): string {
  const contact = resolveContact()
  if (item.type === 'anchor') {
    /* The item names the key; the target id lives in `routes.anchors` — the
       one place on-page targets exist. */
    const target = site.routes.anchors[item.anchor] ?? item.anchor
    return `#${target}`
  }
  if (item.type === 'tel') return contact.telHref
  return contact.mailtoHref
}

function menuEntryLabel(item: (typeof site.navigation.items)[number]): string {
  const contact = resolveContact()
  if (item.type === 'anchor') return item.label
  if (item.type === 'tel') return contact.phoneDisplay
  return contact.email
}

export function Menu() {
  const { isOpen, close } = useMenu()
  const locale = useLocale()
  const t = useTranslations('menu')
  const contact = resolveContact()

  /* The landing, as the export writes it — `pathFor` carries the trailing
     slash a plain static host needs. */
  const landingPath = pathFor({ href: '/', locale })

  /* The fallback navigation: a plain read of where the visitor actually is —
     never a re-localization. WP-06d removes both handlers; the markup they
     carry (`data-transition`) stays. */
  const isOnLanding = () => window.location.pathname === landingPath

  const handleLanding = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    close()
    if (isOnLanding()) {
      /* The scroll lock is released by the provider's close effect, which
         runs before the next frame — the top of the page is reached after
         the page can move again. */
      requestAnimationFrame(() => window.scrollTo(0, 0))
    } else {
      window.location.assign(landingPath)
    }
  }

  const handleAnchor = (event: MouseEvent<HTMLAnchorElement>, anchorId: string) => {
    event.preventDefault()
    close()
    if (isOnLanding()) {
      requestAnimationFrame(() => document.getElementById(anchorId)?.scrollIntoView())
    } else {
      /* Navigating home first: the browser loads the landing and lands on
         the anchor in one plain navigation. */
      window.location.assign(`${landingPath}#${anchorId}`)
    }
  }

  const renderEntry = (item: (typeof site.navigation.items)[number]) => {
    if (item.type === 'anchor') {
      return (
        <a
          key={item.anchor}
          className="menu__entry"
          href={menuEntryHref(item)}
          data-transition={site.routes.anchors[item.anchor] ?? item.anchor}
          onClick={(event) => handleAnchor(event, site.routes.anchors[item.anchor] ?? item.anchor)}
        >
          {menuEntryLabel(item)}
        </a>
      )
    }
    if (item.type === 'tel') {
      return (
        <a key="tel" className="menu__entry" href={contact.telHref}>
          {contact.phoneDisplay}
        </a>
      )
    }
    return (
      <a key="email" className="menu__entry" href={contact.mailtoHref}>
        {contact.email}
      </a>
    )
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          key="panel"
          className="menu"
          id={MENU_PANEL_ID}
          role="dialog"
          aria-modal="true"
          aria-label={t('dialogLabel')}
        >
          {/* The background-color layer: opaque, above the header — a colour,
              not a blur (the spec). WP-06b3 animates this one node. */}
          <div className="menu__background" aria-hidden="true" />
          {/* The name, top left, at exactly the name-home geometry — the same
              tokens the header slot reads, so it never moves on open/close. */}
          <Link className="menu__name" href="/" data-transition="landing" onClick={handleLanding}>
            <Name className="menu__name-image" />
          </Link>
          {/* The X: the same `MenuButton` as the header's, with the open state
              fixed — the header's instance stays underneath, one component,
              the two states in sequence. */}
          <div className="menu__close">
            <MenuButton open onToggle={() => close()} controlsId={MENU_PANEL_ID} />
          </div>
          {/* The entries, in configured order — the list and nothing else. */}
          <nav className="menu__entries">{site.navigation.items.map(renderEntry)}</nav>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
