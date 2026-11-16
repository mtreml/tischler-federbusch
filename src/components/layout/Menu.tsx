'use client'

import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Name } from '@/components/brand/Name'
import { MenuButton } from '@/components/layout/MenuButton'
import { site } from '@/config/site.config'
import { Link } from '@/i18n/navigation'
import { resolveContact } from '@/lib/config/resolve'
import { MENU_PANEL_ID, useMenu } from '@/lib/menu'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import { useTransitionSequence } from '@/lib/transition-sequence'
import type { TransitionTarget } from '@/lib/transition'

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
   navigation and `AnimatePresence` can hold the outgoing panel while the exit
   animations run — which is exactly what the close half of the intro (WP-06b3)
   runs on. Without the hold, the panel would unmount the frame it closes and
   the reverse animation would never be seen.

   ── The name is a link at the name-home geometry ─────────────────────────────
   The name reads the same `--name-header-*` / `--name-width*` tokens the
   header slot does (WP-05), so the name on the page and the name in the menu
   are byte-identical: opening or closing the menu never moves the name.

   ── The transition triggers (WP-06d) ─────────────────────────────────────────
   The two, and only two, `data-transition` elements — the name link
   (`"landing"`) and the anchor entry (`"arbeiten"`) — are the entry points
   of the sequence owned by `useTransitionSequence` (`src/lib/transition-sequence.ts`):
     • normal path — the hook's document-level capture-phase `click`
       interception `preventDefault`s first and hands the click to
       `transitionTo` with the element's `data-transition` value;
     • reduced-motion path — the interception is never attached, so each
       trigger keeps exactly one guarded `onClick`: no-op when
       `event.defaultPrevented`, otherwise `transitionTo(target)` — the guard
       is what keeps the two paths from double-firing.
   The plain `href`s stay the no-JS fallback, and the tel and mailto entries
   are native links that are never touched.
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

/* ── The motion, resolved from the tokens (WP-06b3) ─────────────────────────
   The intro and the stagger are driven by the motion library, so their values
   reach the component as numbers — but they may not be literals either (the
   token doctrine). The tokens stay the single source: `--duration-menu`,
   `--duration-menu-items` and `--ease-quiet` (WP-02) plus `--menu-item-rise`
   (WP-06b3), declared in `src/config/tokens.css`, are resolved from the
   computed style — the seam `NameScroll` (WP-05) already runs for the name
   geometry. What the resolution drives:

     • the background and the name fade over `--duration-menu` — the name with
       an opacity only: it never moves on open or close;
     • the entries fade while they rise over `--duration-menu-items` on
       `--ease-quiet`, all on the one shared timeline — the stagger is the
       distance, not the time: entry i travels `--menu-item-rise × (i + 1)`,
       top least, bottom farthest;
     • the close is the exact reverse: the exit targets are the open's initial
       values, so per entry the close's end state equals the open's start
       state, and the `AnimatePresence` above holds the panel while it runs.

   Reduced motion is a skip, not a shortening (invariant 5): the
   `usePrefersReducedMotion` gate drops every duration and every rise distance
   to zero — instant open/close, nothing moves. The CSS side of the collapse
   is the reduced-motion block in `menu.css`.

   The resolution is a lazy state initializer: it runs once, before the panel
   can render (which only ever happens after a client interaction), and it
   owes the server no answer — the initializer is window-guarded, the server
   renders no panel at all, and the values only reach a node when that node
   mounts. Where the tokens are absent, the resolution falls back to the
   instant one — open/close still works, nothing animates. */

/** The four-point curve as motion reads it. */
type Easing = [number, number, number, number]

/** The resolved motion values, or `null` where any of the tokens is absent. */
interface MenuMotion {
  backgroundSeconds: number
  itemsSeconds: number
  risePixels: number
  ease: Easing
}

/** `320ms` → `0.32`, `2s` → `2` — motion takes seconds, the tokens declare ms.
    Tailwind's `@theme` resolves the value on the way out (`.32s` for 320 ms,
    no leading zero), so the number is parsed as it lands, not as declared. */
function parseSeconds(value: string): number | null {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(ms|s)?$/)
  if (match === null) return null
  const amount = Number.parseFloat(match[1] ?? '0')
  return match[2] === 's' ? amount : amount / 1000
}

/** `cubic-bezier(0.3, 0, 0.2, 1)` → `[0.3, 0, 0.2, 1]`, as motion reads it. */
function parseCubicBezier(value: string): Easing | null {
  const match = value.trim().match(/^cubic-bezier\(([^)]+)\)$/)
  if (match === null) return null
  const points = (match[1] ?? '').split(',').map((part) => Number.parseFloat(part.trim()))
  if (points.length !== 4 || points.some((point) => Number.isNaN(point))) return null
  return [points[0]!, points[1]!, points[2]!, points[3]!]
}

/** `1.25rem` → pixels, resolved against the root font size where the tokens live. */
function parseLengthPixels(value: string, rootFontPixels: number): number | null {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(px|rem|em)?$/)
  if (match === null) return null
  const amount = Number.parseFloat(match[1] ?? '0')
  return match[2] === 'px' ? amount : amount * rootFontPixels
}

function resolveMenuMotion(): MenuMotion | null {
  if (typeof window === 'undefined') return null
  const style = getComputedStyle(document.documentElement)
  const rootFontPixels = Number.parseFloat(style.fontSize)
  if (Number.isNaN(rootFontPixels)) return null
  const backgroundSeconds = parseSeconds(style.getPropertyValue('--duration-menu'))
  const itemsSeconds = parseSeconds(style.getPropertyValue('--duration-menu-items'))
  const risePixels = parseLengthPixels(style.getPropertyValue('--menu-item-rise'), rootFontPixels)
  const ease = parseCubicBezier(style.getPropertyValue('--ease-quiet'))
  /* Every value owes to a token: one that does not resolve keeps the whole
     resolution absent rather than mixing a token with a fallback literal. */
  if (backgroundSeconds === null || itemsSeconds === null || risePixels === null || ease === null) {
    return null
  }
  return { backgroundSeconds, itemsSeconds, risePixels, ease }
}

/** Resolves once, in the lazy initializer — the tokens are static, and the
    panel cannot render before the initializer has run. */
function useMenuMotion(): MenuMotion | null {
  const [tokens] = useState<MenuMotion | null>(() => resolveMenuMotion())
  return tokens
}

/* The name keeps next-intl's `Link` — the localized href it owes — with the
   motion props on top. `motion.create` wraps the component rather than
   replacing the anchor, so the markup 06b2 settled stays byte-identical. */
const MotionNameLink = motion.create(Link)

export function Menu() {
  const { isOpen, close } = useMenu()
  const t = useTranslations('menu')
  const contact = resolveContact()

  /* The one sequence with the one owner: the menu closes at t0, the action
     runs on the overlay's beat, the focus returns at the end (WP-06d1). */
  const { transitionTo } = useTransitionSequence()

  /* The motion, resolved from the tokens and gated on the preference (see the
     section above): the background and the name fade over `--duration-menu`,
     the entries travel over `--duration-menu-items`; under reduced motion
     every duration and distance is zero. */
  const reducedMotion = usePrefersReducedMotion()
  const tokens = useMenuMotion()
  const fade: Transition = {
    duration: reducedMotion || tokens === null ? 0 : tokens.backgroundSeconds,
    ease: tokens?.ease,
  }
  const travel: Transition = {
    duration: reducedMotion || tokens === null ? 0 : tokens.itemsSeconds,
    ease: tokens?.ease,
  }
  const risePixels = reducedMotion || tokens === null ? 0 : tokens.risePixels

  const renderEntry = (item: (typeof site.navigation.items)[number], index: number) => {
    /* The intro and its reverse on this row: it fades while it rises, from
       `--menu-item-rise × (index + 1)` — the shared timeline, the distance
       the stagger (see the section above). The exit targets are the initial
       values, which is what makes the close the exact reverse. */
    const entryMotion: HTMLMotionProps<'a'> = {
      initial: { opacity: 0, y: risePixels * (index + 1) },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: risePixels * (index + 1) },
      transition: travel,
    }
    if (item.type === 'anchor') {
      /* The sequence target — the same value the `data-transition` attribute
         carries, so the reduced-motion `onClick` hands the sequence exactly
         what the capture interception would have read off the element. */
      const anchorTarget = (site.routes.anchors[item.anchor] ?? item.anchor) as TransitionTarget
      return (
        <motion.a
          key={item.anchor}
          className="menu__entry"
          href={menuEntryHref(item)}
          data-transition={anchorTarget}
          onClick={(event) => {
            /* The reduced-motion path — the interception is not attached,
               and on the normal path the capture `preventDefault` has already
               taken the click: this guard keeps the two paths exclusive. */
            if (event.defaultPrevented) return
            transitionTo(anchorTarget)
          }}
          {...entryMotion}
        >
          {menuEntryLabel(item)}
        </motion.a>
      )
    }
    if (item.type === 'tel') {
      return (
        <motion.a key="tel" className="menu__entry" href={contact.telHref} {...entryMotion}>
          {contact.phoneDisplay}
        </motion.a>
      )
    }
    return (
      <motion.a key="email" className="menu__entry" href={contact.mailtoHref} {...entryMotion}>
        {contact.email}
      </motion.a>
    )
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          key="panel"
          className="menu"
          id={MENU_PANEL_ID}
          role="dialog"
          aria-modal="true"
          aria-label={t('dialogLabel')}
        >
          {/* The background-color layer: opaque, above the header — a colour,
              not a blur (the spec). It is the node the intro fades in over
              `--duration-menu`, and the close fades it out again. */}
          <motion.div
            className="menu__background"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          {/* The name, top left, at exactly the name-home geometry — the same
              tokens the header slot reads, so it fades in without moving and
              never moves on open/close. */}
          <MotionNameLink
            className="menu__name"
            href="/"
            data-transition="landing"
            onClick={(event) => {
              /* The reduced-motion path — see the anchor entry's guard. */
              if (event.defaultPrevented) return
              transitionTo('landing')
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <Name className="menu__name-image" />
          </MotionNameLink>
          {/* The X: the same `MenuButton` as the header's, with the open state
              fixed — the header's instance stays underneath, one component,
              the two states in sequence. */}
          <div className="menu__close">
            <MenuButton open onToggle={() => close()} controlsId={MENU_PANEL_ID} />
          </div>
          {/* The entries, in configured order — the list and nothing else,
              each row carrying its share of the rise (WP-06b3). */}
          <nav className="menu__entries">
            {site.navigation.items.map((item, index) => renderEntry(item, index))}
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
