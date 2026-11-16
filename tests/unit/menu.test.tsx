import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MENU_PANEL_ID, MenuProvider, useMenu } from '@/lib/menu'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU STATE

   The provider ships unmounted — the menu panel wires it into the `[locale]` layout.
   These tests mount it around a minimal jsdom harness built to the resolution
   contract: a trigger stub (`<button aria-controls="site-menu">`, the header's
   `MenuButton` before the panel, in document order) and a panel stub
   (`<div id="site-menu">`) holding its focusables — the close button matching
   the same selector, the name link, and the three entries. One variant drops
   the trigger for the no-trigger path (a page without a `Header`).
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * Exposes the context to the tests through plain buttons, and records every
 * render the context causes — the `open()`-while-open no-op is proven by the
 * absence of one.
 */
const openRenders: boolean[] = []

function MenuProbe() {
  const menu = useMenu()
  openRenders.push(menu.isOpen)
  return null
}

function MenuControls() {
  const menu = useMenu()
  return (
    <>
      <button type="button" onClick={() => menu.open()}>
        open-menu
      </button>
      <button type="button" onClick={() => menu.close()}>
        close-menu
      </button>
      <button type="button" onClick={() => menu.close({ deferFocusReturn: true })}>
        close-menu-deferred
      </button>
      {/* Two closes in one tick, before React flushes the transition — the
          rapid-X-taps / Escape-plus-X case. */}
      <button
        type="button"
        onClick={() => {
          menu.close()
          menu.close()
        }}
      >
        close-menu-twice
      </button>
      <button type="button" onClick={() => menu.returnFocus()}>
        return-focus
      </button>
      <span data-testid="menu-open">{String(menu.isOpen)}</span>
    </>
  )
}

function renderHarness(options: { withTrigger?: boolean } = {}) {
  const { withTrigger = true } = options
  openRenders.length = 0

  const view = render(
    <MenuProvider>
      <MenuProbe />
      {withTrigger ? (
        <button type="button" aria-controls={MENU_PANEL_ID} data-testid="trigger" />
      ) : null}
      <div id={MENU_PANEL_ID}>
        {/* The panel's own close button — the same selector as the trigger's. */}
        <button type="button" aria-controls={MENU_PANEL_ID} data-testid="panel-x" />
        {/* Fragment hrefs: the stub panel needs focusable links, not routes. */}
        <a href="#home">Lukas Federbusch</a>
        <a href="#arbeiten">Arbeiten</a>
        <a href="#kontakt">Kontakt</a>
      </div>
      <MenuControls />
    </MenuProvider>,
  )

  return {
    ...view,
    trigger: view.container.querySelector('[data-testid="trigger"]') as HTMLButtonElement | null,
    panel: view.container.querySelector(`#${MENU_PANEL_ID}`) as HTMLDivElement,
    panelX: view.container.querySelector('[data-testid="panel-x"]') as HTMLButtonElement,
  }
}

function openMenu() {
  fireEvent.click(screen.getByText('open-menu'))
}

function closeMenu() {
  fireEvent.click(screen.getByText('close-menu'))
}

function keydown(target: Document | Element, key: string, shiftKey = false) {
  fireEvent.keyDown(target, { key, shiftKey })
}

describe('the state', () => {
  it('starts closed; open() opens, close() closes', () => {
    const view = renderHarness()
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')

    openMenu()
    expect(screen.getByTestId('menu-open')).toHaveTextContent('true')

    closeMenu()
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    view.unmount()
  })

  it('open() while open is a no-op — no state change, no re-render', () => {
    const view = renderHarness()
    openMenu()
    openMenu()
    /* The context re-rendered once for the false→true transition and not a
       second time for the no-op: no side effect (refocus, re-lock) re-ran. */
    expect(openRenders).toEqual([false, true])
    view.unmount()
  })
})

describe('the scroll lock', () => {
  it('is applied on open and released on close', () => {
    const view = renderHarness()
    expect(document.documentElement.style.overflow).toBe('')

    openMenu()
    expect(document.documentElement.style.overflow).toBe('hidden')

    closeMenu()
    expect(document.documentElement.style.overflow).toBe('')
    view.unmount()
  })

  it('is released by an Escape close, and a close while closed leaves it alone', () => {
    const view = renderHarness()
    openMenu()
    keydown(document, 'Escape')
    expect(document.documentElement.style.overflow).toBe('')

    closeMenu()
    expect(document.documentElement.style.overflow).toBe('')
    view.unmount()
  })
})

describe('Escape', () => {
  it('closes the menu while open', () => {
    const view = renderHarness()
    openMenu()
    keydown(document, 'Escape')
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    view.unmount()
  })

  it('attaches its listener only while open and detaches it on close — no leak', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const view = renderHarness()

    /* React attaches its own listeners to the root container, not the
       document — but filter anyway, so the assertion is about this provider.
       The spies call through, so the Escape close below really happens. */
    const keydownAdds = () => addSpy.mock.calls.filter((call) => call[0] === 'keydown')
    const keydownRemoves = () => removeSpy.mock.calls.filter((call) => call[0] === 'keydown')

    expect(keydownAdds()).toHaveLength(0)

    openMenu()
    expect(keydownAdds()).toHaveLength(1)
    expect(keydownRemoves()).toHaveLength(0)

    keydown(document, 'Escape')
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    expect(keydownRemoves()).toHaveLength(1)

    /* The open added exactly one keydown listener and the close removed
       exactly one — no listener survives the close. */
    view.unmount()
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})

describe('the focus management', () => {
  it('moves focus to the panel’s X on open', () => {
    const view = renderHarness()
    expect(view.panelX).not.toHaveFocus()

    openMenu()
    expect(view.panelX).toHaveFocus()
    view.unmount()
  })

  it('returns focus to the trigger on close', () => {
    const view = renderHarness()
    expect(view.trigger).not.toBeNull()

    openMenu()
    expect(view.panelX).toHaveFocus()

    closeMenu()
    expect(view.trigger).toHaveFocus()
    view.unmount()
  })

  it('close({ deferFocusReturn: true }) leaves focus untouched; returnFocus() then returns it', () => {
    const view = renderHarness()
    openMenu()
    expect(view.panelX).toHaveFocus()

    fireEvent.click(screen.getByText('close-menu-deferred'))
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')
    /* The deferred close does not return focus — it is where the close
       press left it (the control button), not the trigger. */
    expect(view.trigger).not.toHaveFocus()

    fireEvent.click(screen.getByText('return-focus'))
    expect(view.trigger).toHaveFocus()
    view.unmount()
  })
})

describe('without a trigger (a page without a Header)', () => {
  it('closes and returnFocus() without throwing, and focus stays put', () => {
    const view = renderHarness({ withTrigger: false })
    expect(view.trigger).toBeNull()

    openMenu()
    expect(view.panelX).toHaveFocus()

    expect(() => closeMenu()).not.toThrow()
    expect(screen.getByTestId('menu-open')).toHaveTextContent('false')

    /* The no-op return must not move focus: jsdom leaves the focus where it
       is (on the panel's X from the open), and the call must leave it there —
       nothing else. */
    view.panelX.focus()
    const returnFocusButton = screen.getByText('return-focus')
    expect(() => fireEvent.click(returnFocusButton)).not.toThrow()
    expect(view.panelX).toHaveFocus()
    view.unmount()
  })
})

describe('the tab trap', () => {
  /* The panel's focusables, in DOM order: the X, the name link, the three
     entries. jsdom does not navigate natively, so the tests position the
     focus at a boundary and assert the trap's own move. */
  it('wraps Tab at the last focusable back to the first', () => {
    const view = renderHarness()
    openMenu()

    const links = within(view.panel).getAllByRole('link')
    const last = links[links.length - 1]
    expect(last).toBeDefined()
    if (last !== undefined) last.focus()

    keydown(document, 'Tab')
    expect(view.panelX).toHaveFocus()
    view.unmount()
  })

  it('wraps Shift+Tab at the first focusable to the last', () => {
    const view = renderHarness()
    openMenu()
    expect(view.panelX).toHaveFocus()

    keydown(document, 'Tab', true)
    const last = within(view.panel).getAllByRole('link').at(-1)
    expect(last).toBeDefined()
    expect(last).toHaveFocus()
    view.unmount()
  })

  it('pulls focus back into the panel when it would leave', () => {
    const view = renderHarness()
    openMenu()

    /* Focus wanders out of the panel (a control button outside it): the
       trap sends it to the panel's first focusable on the next Tab. */
    screen.getByText('open-menu').focus()
    expect(screen.getByText('open-menu')).toHaveFocus()

    keydown(document, 'Tab')
    expect(view.panelX).toHaveFocus()
    view.unmount()
  })
})

describe('the idempotent close', () => {
  it('close() called twice fires each close side effect exactly once', () => {
    const view = renderHarness()
    expect(view.trigger).not.toBeNull()
    const trigger = view.trigger as HTMLButtonElement

    openMenu()

    const focusSpy = vi.spyOn(trigger, 'focus')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    /* Rapid double close — two `close()` calls in one tick, before the
       transition flushes. */
    fireEvent.click(screen.getByText('close-menu-twice'))

    /* Each close side effect once: the focus return, the listener detach, the
       scroll unlock — despite the second close landing on an already-closed
       menu. */
    expect(focusSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy.mock.calls.filter((call) => call[0] === 'keydown')).toHaveLength(1)
    expect(document.documentElement.style.overflow).toBe('')

    focusSpy.mockRestore()
    removeSpy.mockRestore()
    view.unmount()
  })
})
