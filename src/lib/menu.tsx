'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU STATE

   Everything that is a *consequence of the menu being open* lives here — and
   nowhere else: open/close, Escape, the body scroll lock, and the focus
   management (initial focus, the tab trap, the return). The panel
   and the button stay dumb: they render and report, this module
   owns the state and every side effect that follows from it.

   ── What this module renders ────────────────────────────────────────────────
   Nothing. `MenuProvider` renders its children only — a context, not a
   surface. Its only DOM writes are the inline scroll-lock style on
   `<html>` and the focus moves. It is mounted in the `[locale]`
   layout; this file ships unmounted and is covered by unit tests on a
   minimal harness.

   ── The resolution contract (selector-based, no refs) ───────────────────────
   The provider must find the panel's close button and the header's trigger
   without being handed refs, so both are resolved by selector:

     • `MENU_PANEL_ID` — the panel's id, exported here as the **single source**
       of the string. It is the value the button's tests already pin on
       `aria-controls`; the panel renders with this id and the
       `MenuButton`s with `controlsId={MENU_PANEL_ID}`.
     • The panel: `document.getElementById(MENU_PANEL_ID)`.
     • The initial-focus X: `panel.querySelector('button[aria-controls=…]')` —
       scoped to the panel, because the panel renders a *second*
       `MenuButton` and only the panel's instance may receive initial focus.
     • The trigger (focus return): `document.querySelector(
       'button[aria-controls=…]')` — evaluated **after** close, when the panel
       (and its second matching instance) is unmounted and exactly the
       header's button matches.
     • No trigger found (a page without a `Header`, e.g. the legal page — the
       provider is mounted in the layout and covers it): the focus return
       degrades to a no-op. No exception, nothing else affected.

   ── The contract the transition sequence relies on ─────────────────────────
   `close(options?)` takes one option:

     • `close({ deferFocusReturn: true })` — the plain closes (X, Escape)
       return focus to the trigger immediately; the sequence passes `deferFocusReturn`
       when the page transition takes over focus at t0, and performs the
       return itself at the sequence's end by calling `returnFocus()`.

   `close()` is idempotent and safe to call during a close (rapid X taps,
   Escape + X): every close side effect — scroll unlock, listener detach,
   focus return — fires exactly once.

   ── The tab trap ────────────────────────────────────────────────────────────
   While open, Tab/Shift+Tab cycle within the panel's focusable elements
   (the X, the name link, the three entries). The trap intercepts
   Tab/Shift+Tab with `preventDefault` and moves focus itself, querying the
   panel for its focusables; there is no dependency. That is also what makes
   it unit-testable: jsdom has no native tab navigation.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * The menu panel's id — the single source of the string, matching the
 * `aria-controls` value the `MenuButton` is tested against.
 */
export const MENU_PANEL_ID = 'site-menu'

/**
 * Options for `close()`.
 */
export interface CloseOptions {
  /**
   * When true, the close does **not** return focus to the trigger. The caller
   * performs the return itself — the transition sequence takes focus over at
   * t0 and calls `returnFocus()` at its end.
   */
  deferFocusReturn?: boolean
}

interface MenuContextValue {
  /** `true` while the menu is open. */
  isOpen: boolean
  /** Opens the menu. A no-op while already open. */
  open: () => void
  /** Closes the menu. Idempotent; see `CloseOptions.deferFocusReturn`. */
  close: (options?: CloseOptions) => void
  /**
   * Returns focus to the header's trigger button. The close calls this itself
   * unless `deferFocusReturn` was passed; the sequence calls it at its end.
   * A no-op when no trigger is mounted (e.g. the legal page).
   */
  returnFocus: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

/* The panel's focusable elements — the minimal set a menu panel can hold:
   links, the (non-disabled) form controls, and explicit tab stops. */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function resolvePanel(): HTMLElement | null {
  return document.getElementById(MENU_PANEL_ID)
}

/** The panel's X — its `MenuButton`, scoped to the panel (see the header). */
function resolvePanelCloseButton(): HTMLElement | null {
  return resolvePanel()?.querySelector(`button[aria-controls="${MENU_PANEL_ID}"]`) ?? null
}

/** The header's trigger, resolved after close (see the header). */
function resolveTrigger(): HTMLElement | null {
  return document.querySelector(`button[aria-controls="${MENU_PANEL_ID}"]`)
}

/**
 * Owns everything that follows from the menu being open (see the file header).
 * Renders its children only — no UI of its own.
 */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  /* `setState` is asynchronous, so the guards read a ref rather than the
     state: rapid double closes (Escape + X) both see the menu as open and
     both call `setOpen(false)`, but React bails out on the second — one
     state change, one effect cleanup, one run of the close side effects. */
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  /* Whether the *current* close defers the focus return to `returnFocus()`. */
  const deferFocusReturnRef = useRef(false)

  const returnFocus = useCallback(() => {
    /* No trigger mounted (a page without a `Header`) → a no-op by contract. */
    resolveTrigger()?.focus()
  }, [])

  const close = useCallback((options: CloseOptions = {}) => {
    if (!openRef.current) return
    deferFocusReturnRef.current = options.deferFocusReturn === true
    setOpen(false)
  }, [])

  const openMenu = useCallback(() => {
    if (openRef.current) return
    deferFocusReturnRef.current = false
    setOpen(true)
  }, [])

  /* Every consequence of `open === true` lives in this one effect, and every
     consequence of the close in its cleanup — which is exactly what makes
     "the side effects fire once" hold: the cleanup runs once per open→close
     transition, no matter how many close calls caused it. */
  useEffect(() => {
    if (!open) return

    /* The scroll lock: inline `overflow` on `<html>`, owned by this provider
       and cleared (set to `''`) on close — not a class, there is no CSS
       involved. */
    document.documentElement.style.overflow = 'hidden'

    /* Initial focus: the panel's X — the mirror of the opener, and Enter on
       it is the safest default action (the name link would navigate home). */
    resolvePanelCloseButton()?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab') return

      /* The trap: stay within the panel's focusables, cycling at both ends.
         It intercepts and moves focus itself — jsdom has no native tab
         navigation, so this is also what the unit tests exercise. */
      const panel = resolvePanel()
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (first === undefined || last === undefined) return
      const active = document.activeElement
      const inside = active !== null && panel.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    /* Escape and Tab, one listener, attached only while open. */
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.documentElement.style.overflow = ''
      if (!deferFocusReturnRef.current) returnFocus()
      deferFocusReturnRef.current = false
    }
  }, [open, close, returnFocus])

  const value = useMemo<MenuContextValue>(
    () => ({ isOpen: open, open: openMenu, close, returnFocus }),
    [open, openMenu, close, returnFocus],
  )

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/**
 * The menu's state and controls. Must be used inside a `MenuProvider`.
 */
export function useMenu(): MenuContextValue {
  const context = useContext(MenuContext)
  if (context === null) {
    throw new Error('`useMenu` must be used inside a `<MenuProvider>`')
  }
  return context
}
