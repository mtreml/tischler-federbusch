import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Menu } from '@/components/layout/Menu'
import { Header } from '@/components/layout/Header'
import { site } from '@/config/site.config'
import { MENU_PANEL_ID, MenuProvider } from '@/lib/menu'
import messages from '@/i18n/messages/de.json'
import { setPrefersReducedMotion } from './match-media'

/* The sequence owner (WP-06d) reads the raw router and pathname, which need
   the app router mounted — this suite asserts motion, not the sequence, so
   the hook is mocked. */
vi.mock('@/lib/transition-sequence', () => ({
  useTransitionSequence: () => ({ transitionTo: () => {} }),
}))

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU INTRO AND CLOSE (WP-06b3)

   The spec's "Menu intro animation", asserted on the transforms the motion
   library writes to the nodes — the values, not the class names:

     • OPEN: the background fades in, the name fades in **without moving**,
       the entries fade in while they rise from below — entry i starts at
       `--menu-item-rise × (i + 1)`, the top entry travelling the least and
       the bottom the farthest (the distance gradient), all on **one shared
       timeline**: the same duration for every entry, so they settle in the
       same frame. No per-entry delay — the stagger is the distance, not the
       time.
     • CLOSE: the exact reverse — the entries sink back to their start
       state (the close's end state equals the open's start state, per
       entry), the name fades, the background fades out, and the panel
       unmounts only after the reverse has run (`AnimatePresence` holds it).
     • REDUCED MOTION: a skip, not a shortening — zero durations and zero
       rise distances; the panel opens and closes instantly and nothing
       moves.

   The tokens are set on the root per suite — the component resolves them
   from the computed style, never from a literal, so the values the test
   asserts are the values the tokens declare. `--menu-item-rise` is
   `1.25rem`, resolved against the root font size the harness reports.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The tokens the suite declares, as `tokens.css` declares them. */
const TOKENS: Record<string, string> = {
  '--menu-item-rise': '1.25rem',
  '--duration-menu': '320ms',
  '--duration-menu-items': '480ms',
  '--ease-quiet': 'cubic-bezier(0.3, 0, 0.2, 1)',
}

/** The rise in pixels, the way the component resolves the token. */
function risePixels(): number {
  const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return 1.25 * rootFont
}

/** The entry's `translateY` in px, or `null` where it carries no transform. */
function translateYPixels(entry: HTMLElement): number | null {
  const transform = entry.style.transform
  if (transform === '') return null
  const match = transform.match(/translateY\(([-\d.]+)px\)/)
  return match === null ? null : Number.parseFloat(match[1] ?? '0')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function renderClosed() {
  const view = render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <MenuProvider>
        <Header />
        <Menu />
      </MenuProvider>
    </NextIntlClientProvider>,
  )
  return view
}

function openMenu(view: ReturnType<typeof renderClosed>) {
  const trigger = view.container.querySelector('button[aria-controls="site-menu"]')
  expect(trigger).not.toBeNull()
  if (trigger === null) return
  fireEvent.click(trigger)
}

function panel(view: ReturnType<typeof renderClosed>) {
  const node = view.container.querySelector<HTMLElement>(`#${MENU_PANEL_ID}`)
  expect(node).not.toBeNull()
  if (node === null) throw new Error('the panel is not mounted')
  return node
}

/** The rows, in the order the config declares them. */
function entriesOf(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>('.menu__entry'))
}

/** The open start state per entry: the rise, in pixels, in list order. */
function startOffsets(): number[] {
  const rise = risePixels()
  return site.navigation.items.map((_item, index) => rise * (index + 1))
}

/** Waits until every entry has settled into place, and reports when each did. */
async function settle(view: ReturnType<typeof renderClosed>): Promise<number[]> {
  const entries = entriesOf(panel(view))
  const settledAt: (number | null)[] = entries.map(() => null)
  const start = performance.now()
  while (settledAt.some((at) => at === null) && performance.now() - start < 3000) {
    const now = performance.now()
    entries.forEach((entry, index) => {
      if (settledAt[index] === null && entry.style.transform === 'none') {
        settledAt[index] = now
      }
    })
    await sleep(16)
  }
  expect(settledAt.every((at) => at !== null)).toBe(true)
  return settledAt as number[]
}

beforeEach(() => {
  const root = document.documentElement
  for (const [name, value] of Object.entries(TOKENS)) {
    root.style.setProperty(name, value)
  }
})

afterEach(() => {
  const root = document.documentElement
  for (const name of Object.keys(TOKENS)) {
    root.style.removeProperty(name)
  }
  setPrefersReducedMotion(false)
})

describe('open: the intro', () => {
  it('each entry starts at `--menu-item-rise × (index + 1)` — the bottom travels farthest', () => {
    const view = renderClosed()
    openMenu(view)
    const entries = entriesOf(panel(view))
    expect(entries).toHaveLength(site.navigation.items.length)

    const expected = startOffsets()
    entries.forEach((entry, index) => {
      /* The start state, on the node — the token's distance, per index. */
      expect(translateYPixels(entry)).toBeCloseTo(expected[index] ?? 0, 5)
      expect(entry.style.opacity).toBe('0')
    })

    /* The gradient: every lower entry starts farther down than the one
       above it — the bottom travels the farthest, the top the least. */
    for (let index = 1; index < entries.length; index++) {
      expect(translateYPixels(entries[index]!)).toBeGreaterThan(
        translateYPixels(entries[index - 1]!) ?? 0,
      )
    }
    view.unmount()
  })

  it('the name fades in without moving', () => {
    const view = renderClosed()
    openMenu(view)
    const name = panel(view).querySelector<HTMLElement>('.menu__name')
    expect(name).not.toBeNull()
    if (name === null) return
    /* The fade: the opacity starts at the closed value. */
    expect(name.style.opacity).toBe('0')
    /* No transform at all — not a zero one, none. */
    expect(name.style.transform).toBe('')
    view.unmount()
  })

  it('the background fades in to fully opaque', async () => {
    const view = renderClosed()
    openMenu(view)
    const background = panel(view).querySelector<HTMLElement>('.menu__background')
    expect(background).not.toBeNull()
    if (background === null) return
    expect(background.style.opacity).toBe('0')
    await waitFor(() => expect(background.style.opacity).toBe('1'), { timeout: 1000 })
    view.unmount()
  })

  it('all entries travel on one shared timeline — a distance gradient, not a time stagger', async () => {
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)
    const entries = entriesOf(node)

    /* While they travel, every entry is at the same fraction of its own
       distance: one timeline, one duration, the distance the stagger. A time
       stagger would show one entry ahead of the others. */
    await sleep(160)
    const expected = startOffsets()
    const ratios = entries.map((entry, index) => {
      const offset = translateYPixels(entry)
      return offset === null ? 0 : offset / (expected[index] ?? 0)
    })
    ratios.forEach((ratio) => expect(ratio).toBeGreaterThan(0))
    ratios.forEach((ratio) => expect(ratio).toBeLessThan(1))
    ratios.slice(1).forEach((ratio) => expect(ratio).toBeCloseTo(ratios[0]!, 4))

    /* And they settle together: the one shared timeline reaches its end in
       the same frame for every entry. */
    const settledAt = await settle(view)
    const span = Math.max(...settledAt) - Math.min(...settledAt)
    expect(span).toBeLessThanOrEqual(32)
    view.unmount()
  })
})

describe('the tokens, as the computed style delivers them', () => {
  it('resolve from the `@theme`-resolved form — no leading zero, `s` instead of `ms`', () => {
    /* Tailwind's `@theme` resolves the declared values on the way out:
       `320ms` lands as `.32s`, `480ms` as `.48s`. The component resolves the
       tokens from the computed style, so it owes them in the form they land
       in — the start offsets below are the proof the resolution ran at all. */
    const root = document.documentElement
    root.style.setProperty('--duration-menu', '.32s')
    root.style.setProperty('--duration-menu-items', '.48s')

    const view = renderClosed()
    openMenu(view)
    const entries = entriesOf(panel(view))
    const expected = startOffsets()
    entries.forEach((entry, index) => {
      expect(translateYPixels(entry)).toBeCloseTo(expected[index] ?? 0, 5)
    })
    view.unmount()
  })
})

describe('close: the exact reverse', () => {
  it('sinks the entries back to their start state, fades the name and the background, and unmounts after the reverse has run', async () => {
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)
    await settle(view)

    const name = node.querySelector<HTMLElement>('.menu__name')
    const background = node.querySelector<HTMLElement>('.menu__background')
    expect(name).not.toBeNull()
    expect(background).not.toBeNull()

    /* The end state of the close, per node — the last style the reverse
       writes before the panel leaves. */
    interface CloseSnapshot {
      entries: string
      nameOpacity: string
      nameTransform: string
      backgroundOpacity: string
    }
    let lastSnapshot: CloseSnapshot | null = null
    const snapshot = () => ({
      entries: entriesOf(node)
        .map((entry) => entry.style.transform)
        .join('|'),
      nameOpacity: name?.style.opacity ?? '',
      nameTransform: name?.style.transform ?? '',
      backgroundOpacity: background?.style.opacity ?? '',
    })
    const observer = new MutationObserver(() => {
      lastSnapshot = snapshot()
    })
    observer.observe(node, { subtree: true, attributes: true, attributeFilter: ['style'] })

    /* The panel's X closes. */
    fireEvent.click(node.querySelector('button[aria-controls="site-menu"]')!)

    /* Mid-reverse: the entries are sinking — offset again, and the gradient
       intact, the bottom still the farthest. */
    await sleep(160)
    const mid = entriesOf(node).map((entry) => translateYPixels(entry))
    mid.forEach((offset) => expect(offset).toBeGreaterThan(0))
    for (let index = 1; index < mid.length; index++) {
      expect(mid[index]).toBeGreaterThan(mid[index - 1] ?? 0)
    }

    /* The reverse runs to completion before the panel unmounts. */
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2000 })
    observer.disconnect()

    /* Per entry, the close's end state equals the open's start state. Read
       through a function — the assignment happens in the observer's
       callback, and the declared type, not the flow type, is what holds. */
    const readLastSnapshot = () => lastSnapshot
    const endState = readLastSnapshot()
    expect(endState).not.toBeNull()
    if (endState === null) return
    const end = endState.entries.split('|').map((transform) => {
      const match = transform.match(/translateY\(([-\d.]+)px\)/)
      return match === null ? null : Number.parseFloat(match[1] ?? '0')
    })
    const expected = startOffsets()
    end.forEach((offset, index) => expect(offset).toBeCloseTo(expected[index] ?? 0, 5))
    /* The name faded — and still never moved. The background faded out. */
    expect(endState.nameOpacity).toBe('0')
    expect(endState.nameTransform).toBe('')
    expect(endState.backgroundOpacity).toBe('0')
    view.unmount()
  })
})

describe('reduced motion: a skip, not a shortening', () => {
  it('opens and closes instantly, with no rise distance applied', async () => {
    setPrefersReducedMotion(true)
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)
    const entries = entriesOf(node)
    const name = node.querySelector<HTMLElement>('.menu__name')

    /* No rise distance at all — not a small one, none. */
    entries.forEach((entry) => {
      const offset = translateYPixels(entry)
      expect(offset === null ? 0 : offset).toBeLessThanOrEqual(0)
    })
    expect(name?.style.transform).toBe('')

    /* Zero durations: the open settles without the intro's travel. */
    await waitFor(() => entries.forEach((entry) => expect(entry.style.opacity).toBe('1')), {
      timeout: 300,
    })

    /* The close is instant as well. */
    fireEvent.click(node.querySelector('button[aria-controls="site-menu"]')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 300 })
    view.unmount()
  })
})
