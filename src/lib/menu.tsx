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

// Owns everything that follows from the menu being open: open/close, Escape, scroll lock,
// focus (initial, tab trap, return). Resolved by selector, not refs; no trigger → focus return is a no-op.

export const MENU_PANEL_ID = 'site-menu'

export interface CloseOptions {
  deferFocusReturn?: boolean
}

interface MenuContextValue {
  isOpen: boolean
  open: () => void
  close: (options?: CloseOptions) => void
  returnFocus: () => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

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

function resolvePanelCloseButton(): HTMLElement | null {
  return resolvePanel()?.querySelector(`button[aria-controls="${MENU_PANEL_ID}"]`) ?? null
}

function resolveTrigger(): HTMLElement | null {
  return document.querySelector(`button[aria-controls="${MENU_PANEL_ID}"]`)
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  // A ref, not the state: `setState` is async — rapid double closes must not double-fire.
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  const deferFocusReturnRef = useRef(false)

  const returnFocus = useCallback(() => {
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

  // Open consequences in the effect, close consequences in the cleanup: the cleanup runs once per open→close transition.
  useEffect(() => {
    if (!open) return

    document.documentElement.style.overflow = 'hidden'

    // Initial focus: the panel's X (the name link would navigate home).
    resolvePanelCloseButton()?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'Tab') return

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

export function useMenu(): MenuContextValue {
  const context = useContext(MenuContext)
  if (context === null) {
    throw new Error('`useMenu` must be used inside a `<MenuProvider>`')
  }
  return context
}
