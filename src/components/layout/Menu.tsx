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

// The full-page menu. State (open/close, Escape, scroll lock, focus) is the provider's
// (`src/lib/menu.tsx`); this is the surface. Mounted in the persistent `[locale]` layout
// so `AnimatePresence` can hold the outgoing panel while the exit animations run.
// The name reads the same tokens the header slot does, so it never moves on open/close.
// The two `data-transition` elements (name → `landing`, anchor → `arbeiten`) feed
// `useTransitionSequence`; the `href`s are the no-JS fallback; tel/mailto are native links.

function menuEntryHref(item: (typeof site.navigation.items)[number]): string {
  const contact = resolveContact()
  if (item.type === 'anchor') {
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

// Motion values are resolved from the tokens (never literals): background/name fade over
// `--duration-menu`, entries rise over `--duration-menu-items`; the stagger is distance, not
// time (entry i travels `--menu-item-rise × (i+1)`). The close is the exact reverse of the
// open (exit targets = initial values). Reduced motion drops every duration and distance to zero.
// Resolution is a lazy state initializer: it runs once, before the panel can render, and
// owes the server no answer (window-guarded; absent tokens → the instant one).

type Easing = [number, number, number, number]

interface MenuMotion {
  backgroundSeconds: number
  itemsSeconds: number
  risePixels: number
  ease: Easing
}

function parseSeconds(value: string): number | null {
  const match = value.trim().match(/^(-?(?:\d+|\d*\.\d+))(ms|s)?$/)
  if (match === null) return null
  const amount = Number.parseFloat(match[1] ?? '0')
  return match[2] === 's' ? amount : amount / 1000
}

function parseCubicBezier(value: string): Easing | null {
  const match = value.trim().match(/^cubic-bezier\(([^)]+)\)$/)
  if (match === null) return null
  const points = (match[1] ?? '').split(',').map((part) => Number.parseFloat(part.trim()))
  if (points.length !== 4 || points.some((point) => Number.isNaN(point))) return null
  return [points[0]!, points[1]!, points[2]!, points[3]!]
}

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
  if (backgroundSeconds === null || itemsSeconds === null || risePixels === null || ease === null) {
    return null
  }
  return { backgroundSeconds, itemsSeconds, risePixels, ease }
}

function useMenuMotion(): MenuMotion | null {
  const [tokens] = useState<MenuMotion | null>(() => resolveMenuMotion())
  return tokens
}

const MotionNameLink = motion.create(Link)

export function Menu() {
  const { isOpen, close } = useMenu()
  const t = useTranslations('menu')
  const contact = resolveContact()

  const { transitionTo } = useTransitionSequence()

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
    const entryMotion: HTMLMotionProps<'a'> = {
      initial: { opacity: 0, y: risePixels * (index + 1) },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: risePixels * (index + 1) },
      transition: travel,
    }
    if (item.type === 'anchor') {
      const anchorTarget = (site.routes.anchors[item.anchor] ?? item.anchor) as TransitionTarget
      return (
        <motion.a
          key={item.anchor}
          className="menu__entry"
          href={menuEntryHref(item)}
          data-transition={anchorTarget}
          onClick={(event) => {
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
          <motion.div
            className="menu__background"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          />
          <MotionNameLink
            className="menu__name"
            href="/"
            data-transition="landing"
            onClick={(event) => {
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
          <div className="menu__close">
            <MenuButton open onToggle={() => close()} controlsId={MENU_PANEL_ID} />
          </div>
          <nav className="menu__entries">
            {site.navigation.items.map((item, index) => renderEntry(item, index))}
          </nav>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
