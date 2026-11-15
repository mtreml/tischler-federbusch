/* ══════════════════════════════════════════════════════════════════════════════
   THE `matchMedia` STUB (WP-06b3)

   jsdom ships no `window.matchMedia`, and `usePrefersReducedMotion`
   (`src/lib/reduced-motion.ts`) reads it — every animated surface that the
   menu intro gates on would throw in the harness without the API. The stub
   gives the hook the exact surface it subscribes to: a `matches` that the
   tests set, and the listener pair the hook's `useSyncExternalStore`
   subscribes and unsubscribes on. Installed as a side effect from
   `tests/unit/setup.ts`; the tests import `setPrefersReducedMotion` from
   here (the same module instance the setup file installed).
   ══════════════════════════════════════════════════════════════════════════════ */

const QUERY = '(prefers-reduced-motion: reduce)'

/** The preference the stub answers with — the tests flip it per suite. */
let reducedMotion = false

const listeners = new Set<() => void>()

/**
 * Sets the stubbed preference. Flipping it notifies the subscribed hooks the
 * way a real media-query change would — a live preference, not a page load.
 */
export function setPrefersReducedMotion(value: boolean): void {
  if (value === reducedMotion) return
  reducedMotion = value
  listeners.forEach((listener) => listener())
}

function install(): void {
  if (typeof window.matchMedia === 'function') return
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === QUERY && reducedMotion
    },
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: () => void) => {
      listeners.add(listener)
    },
    removeEventListener: (_event: string, listener: () => void) => {
      listeners.delete(listener)
    },
    addListener: (listener: () => void) => {
      listeners.add(listener)
    },
    removeListener: (listener: () => void) => {
      listeners.delete(listener)
    },
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

install()
