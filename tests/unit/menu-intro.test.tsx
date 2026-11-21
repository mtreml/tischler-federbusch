import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Menu } from '@/components/layout/Menu'
import { Header } from '@/components/layout/Header'
import { site } from '@/config/site.config'
import { MENU_PANEL_ID, MenuProvider } from '@/lib/menu'
import messages from '@/i18n/messages/de.json'
import { setPrefersReducedMotion } from './match-media'

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/de/',
}))

// This suite asserts motion, not the sequence, so the hook is mocked.
vi.mock('@/lib/transition-sequence', () => ({
  useTransitionSequence: () => ({ transitionTo: () => {} }),
}))

// The menu intro/close, asserted on the transforms the motion library writes — the values, not the class names.
// CLOSE is the exact reverse; REDUCED MOTION: zero durations/distances. Tokens are set on the root — the component resolves them from the computed style.

const TOKENS: Record<string, string> = {
  '--menu-item-rise': '1.25rem',
  '--duration-menu': '320ms',
  '--duration-menu-items': '480ms',
  '--ease-quiet': 'cubic-bezier(0.3, 0, 0.2, 1)',
}

function risePixels(): number {
  const rootFont = Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
  return 1.25 * rootFont
}

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

function entriesOf(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>('.menu__entry'))
}

function startOffsets(): number[] {
  const rise = risePixels()
  return site.navigation.items.map((_item, index) => rise * (index + 1))
}

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
      expect(translateYPixels(entry)).toBeCloseTo(expected[index] ?? 0, 5)
      expect(entry.style.opacity).toBe('0')
    })

    for (let index = 1; index < entries.length; index++) {
      expect(translateYPixels(entries[index]!)).toBeGreaterThan(
        translateYPixels(entries[index - 1]!) ?? 0,
      )
    }
    view.unmount()
  })

  it('the language switch rises one step farther than the last entry', () => {
    const view = renderClosed()
    openMenu(view)
    const switcher = panel(view).querySelector<HTMLElement>('.menu__languages')
    expect(switcher).not.toBeNull()
    expect(translateYPixels(switcher!)).toBeCloseTo(
      risePixels() * (site.navigation.items.length + 1),
      5,
    )
    expect(switcher!.style.opacity).toBe('0')
    view.unmount()
  })

  it('the name fades in without moving', () => {
    const view = renderClosed()
    openMenu(view)
    const name = panel(view).querySelector<HTMLElement>('.menu__name')
    expect(name).not.toBeNull()
    if (name === null) return
    expect(name.style.opacity).toBe('0')
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

    await sleep(160)
    const expected = startOffsets()
    const ratios = entries.map((entry, index) => {
      const offset = translateYPixels(entry)
      return offset === null ? 0 : offset / (expected[index] ?? 0)
    })
    ratios.forEach((ratio) => expect(ratio).toBeGreaterThan(0))
    ratios.forEach((ratio) => expect(ratio).toBeLessThan(1))
    ratios.slice(1).forEach((ratio) => expect(ratio).toBeCloseTo(ratios[0]!, 4))

    const settledAt = await settle(view)
    const span = Math.max(...settledAt) - Math.min(...settledAt)
    expect(span).toBeLessThanOrEqual(32)
    view.unmount()
  })
})

describe('the tokens, as the computed style delivers them', () => {
  it('resolve from the `@theme`-resolved form — no leading zero, `s` instead of `ms`', () => {
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

    fireEvent.click(node.querySelector('button[aria-controls="site-menu"]')!)

    await sleep(160)
    const mid = entriesOf(node).map((entry) => translateYPixels(entry))
    mid.forEach((offset) => expect(offset).toBeGreaterThan(0))
    for (let index = 1; index < mid.length; index++) {
      expect(mid[index]).toBeGreaterThan(mid[index - 1] ?? 0)
    }

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2000 })
    observer.disconnect()

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

    entries.forEach((entry) => {
      const offset = translateYPixels(entry)
      expect(offset === null ? 0 : offset).toBeLessThanOrEqual(0)
    })
    expect(name?.style.transform).toBe('')

    await waitFor(() => entries.forEach((entry) => expect(entry.style.opacity).toBe('1')), {
      timeout: 300,
    })

    fireEvent.click(node.querySelector('button[aria-controls="site-menu"]')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 300 })
    view.unmount()
  })
})
