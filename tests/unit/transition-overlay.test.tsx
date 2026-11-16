import { act, render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TransitionOverlay } from '@/components/layout/TransitionOverlay'
import { TransitionLockup } from '@/components/layout/TransitionLockup'
import * as transition from '@/lib/transition'
import messages from '@/i18n/messages/de.json'
import { setPrefersReducedMotion } from './match-media'

/* ══════════════════════════════════════════════════════════════════════════════
   THE PAGE TRANSITION OVERLAY

   The spec's "Page transition", asserted on the state the overlay exposes —
   the `data-transition-*` attributes, the inline opacity the motion library
   writes, the spinner's progressbar contract — and on the beats:

     • COVER: the overlay mounts at opacity 0 and animates to 1 over
       `--duration-transition-cover`; the action — and only the action —
       runs at cover completion. Nothing navigates before the cover is
       opaque: the action is observed to fire while the overlay reads
       fully opaque.
     • REVEAL: the overlay animates back to 0 over
       `--duration-transition-reveal`, is unmounted only after the reverse
       has run (`AnimatePresence` holds it), and the reveal count lands.
     • THE SPINNER: `role="progressbar"`, `aria-valuemax={1}`,
       `aria-valuenow` 0 while the cover runs and 1 once the reveal has
       started, labelled `common.loading`.
     • REDUCED MOTION: a skip, not a shortening — the overlay never mounts,
       `beginTransition` finds no subscriber and degrades to a no-op.

   `beginTransition` is called outside a React event, so the calls run in
   `act`; the beats themselves run in real time (as the menu intro suite's
   do) and are awaited, not faked. The tokens are set on the root per suite,
   as `tokens.css` declares them, because the component resolves them from
   the computed style and never from a literal.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The tokens the suite declares, as `tokens.css` declares them. */
const TOKENS: Record<string, string> = {
  '--color-background': '#faf7f1',
  '--duration-transition-cover': '360ms',
  '--duration-transition-reveal': '420ms',
  '--ease-quiet': 'cubic-bezier(0.3, 0, 0.2, 1)',
  '--spinner-size': '2rem',
}

/** The inline opacity the motion library writes to the overlay, or `null`. */
function overlayOpacity(): number | null {
  const node = document.querySelector<HTMLElement>('.transition-overlay')
  if (node === null) return null
  const opacity = Number.parseFloat(node.style.opacity)
  return Number.isNaN(opacity) ? null : opacity
}

/** Waits until `condition` holds (the beats run in real time). */
async function until(condition: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = performance.now()
  while (!condition() && performance.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 16))
  }
  expect(condition()).toBe(true)
}

function host(): HTMLElement {
  const node = document.querySelector<HTMLElement>('[data-transition-host]')
  expect(node).not.toBeNull()
  if (node === null) throw new Error('the transition host is not mounted')
  return node
}

function renderOverlay() {
  const view = render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <TransitionOverlay />
    </NextIntlClientProvider>,
  )
  return view
}

/** Starts a transition, in `act` (the call is not a React event). */
function begin(options: transition.BeginTransitionOptions) {
  act(() => {
    transition.beginTransition(options)
  })
}

beforeEach(() => {
  const root = document.documentElement
  for (const [name, value] of Object.entries(TOKENS)) root.style.setProperty(name, value)
  setPrefersReducedMotion(false)
  vi.resetAllMocks()
})

afterEach(() => {
  setPrefersReducedMotion(false)
  transition.setTransitionAction(null)
})

describe('the cover', () => {
  it('mounts at opacity 0, animates to opaque, and reports the cover beat', async () => {
    renderOverlay()
    expect(overlayOpacity()).toBeNull()

    begin({ from: '/de/', to: 'landing' })

    const node = document.querySelector<HTMLElement>('.transition-overlay')
    expect(node).not.toBeNull()
    /* The one background, as a token — the overlay reads
       `--color-background`, it does not define it. */
    expect(node?.style.backgroundColor).toBe('var(--color-background)')
    expect(host().dataset.transitionPhase).toBe('cover')
    expect(host().dataset.transitionCoverId).toBe('1')
    expect(host().dataset.transitionFrom).toBe('/de/')

    /* Opaque at the end of the cover — and still up when the beat lands. */
    await until(() => (overlayOpacity() ?? 0) >= 0.99)
    await until(() => host().dataset.transitionCovers === '1')
  })

  it('runs the action only at cover completion — nothing navigates before the cover is opaque', async () => {
    /* The opacity at the exact moment the action fires — the beat the
       interception exists to protect, captured rather than sampled after. */
    let opacityAtAction: number | null = null
    transition.setTransitionAction(() => {
      opacityAtAction = overlayOpacity()
    })
    renderOverlay()

    begin({ from: '/de/', to: 'arbeiten' })

    await until(() => opacityAtAction !== null)
    expect(opacityAtAction).toBe(1)
  })
})

describe('the reveal', () => {
  it('fades the overlay back out, unmounts it only after the reverse has run, and lands the count', async () => {
    const action = vi.fn()
    transition.setTransitionAction(action)
    renderOverlay()

    begin({ from: '/de/', to: 'landing' })
    await until(() => (overlayOpacity() ?? 0) >= 0.99)
    await until(() => action.mock.calls.length === 1)

    /* The reveal: the opacity falls back toward 0 — one rise, one fall. */
    await until(() => (overlayOpacity() ?? 1) < 0.05)

    /* Unmounted only after the exit half has run — the count lands with it. */
    await until(() => document.querySelector('.transition-overlay') === null)
    expect(host().dataset.transitionReveals).toBe('1')
    expect(host().dataset.transitionPhase).toBe('idle')
  })
})

describe('the spinner', () => {
  it('is a progressbar: the loading label, max 1, and the 0 → 1 flip at the reveal', async () => {
    const action = vi.fn()
    transition.setTransitionAction(action)
    renderOverlay()

    begin({ from: '/de/', to: 'arbeiten' })

    const spinner = screen.getByRole('progressbar')
    expect(spinner).toHaveAccessibleName(messages.common.loading)
    expect(spinner).toHaveAttribute('aria-valuemax', '1')
    expect(spinner).toHaveAttribute('aria-valuenow', '0')

    /* The flip: 1 from the cover beat on, through the whole reveal. */
    await until(() => spinner.getAttribute('aria-valuenow') === '1')
    expect(action).toHaveBeenCalledTimes(1)
  })
})

describe('the lockup', () => {
  it('stacks the mark on the wordmark, both through the shared wrappers', () => {
    const { container } = render(<TransitionLockup />)
    const lockup = container.querySelector<HTMLElement>('.transition-lockup')
    expect(lockup).not.toBeNull()
    if (lockup === null) return
    const images = Array.from(lockup.querySelectorAll('img'))
    expect(images.map((image) => image.getAttribute('src'))).toEqual(['/logo.svg', '/name.svg'])
  })

  it('renders mark and wordmark inside the overlay, above which the spinner rests', () => {
    renderOverlay()
    begin({ from: '/de/', to: 'landing' })

    const overlay = document.querySelector<HTMLElement>('.transition-overlay')
    expect(overlay).not.toBeNull()
    if (overlay === null) return
    const images = Array.from(overlay.querySelectorAll('img'))
    expect(images.map((image) => image.getAttribute('src'))).toEqual(['/logo.svg', '/name.svg'])
    expect(within(overlay as HTMLElement).getByRole('progressbar')).not.toBeNull()
    /* Both decorative: the lockup is a picture, the spinner carries the label. */
    images.forEach((image) => {
      expect(image).toHaveAttribute('alt', '')
    })
  })
})

describe('the imperative entry', () => {
  it('tells the caller when the cover is opaque and when the reveal has completed', async () => {
    const onCoverOpaque = vi.fn()
    const onRevealComplete = vi.fn()
    renderOverlay()

    begin({
      from: '/de/impressum-datenschutz/',
      to: 'landing',
      onCoverOpaque,
      onRevealComplete,
    })

    /* Opaque at the cover's end, not before. */
    await until(() => onCoverOpaque.mock.calls.length === 1)
    expect(overlayOpacity() ?? 0).toBeGreaterThanOrEqual(0.99)

    /* And retired only once the reveal has run over the destination. */
    await until(() => onRevealComplete.mock.calls.length === 1)
    expect(onRevealComplete).toHaveBeenCalledTimes(1)
    await until(() => document.querySelector('.transition-overlay') === null)
    expect(host().dataset.transitionReveals).toBe('1')
  })
})

describe('reduced motion', () => {
  it('renders nothing and degrades the entry to a no-op — a skip, not a shortening', () => {
    setPrefersReducedMotion(true)
    renderOverlay()

    /* The overlay never mounts, so there is nothing on screen to be instant. */
    expect(document.querySelector('.transition-overlay')).toBeNull()

    const action = vi.fn()
    transition.setTransitionAction(action)
    const onCoverOpaque = vi.fn()
    begin({ from: '/de/', to: 'arbeiten', onCoverOpaque })
    expect(action).not.toHaveBeenCalled()
    expect(onCoverOpaque).not.toHaveBeenCalled()

    setPrefersReducedMotion(false)
    expect(overlayOpacity()).toBeNull()
  })
})

describe('the seam', () => {
  it('degrades to a no-op once the overlay is unmounted', async () => {
    const action = vi.fn()
    transition.setTransitionAction(action)
    const view = renderOverlay()

    begin({ from: '/de/', to: 'landing' })
    await until(() => action.mock.calls.length === 1)
    await until(() => document.querySelector('.transition-overlay') === null)

    view.unmount()
    const callsAfterUnmount = action.mock.calls.length
    begin({ from: '/de/', to: 'landing' })
    expect(action.mock.calls.length).toBe(callsAfterUnmount)
  })
})
