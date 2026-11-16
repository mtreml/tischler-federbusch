// jsdom ships no `window.matchMedia`, so the stub gives `usePrefersReducedMotion` the exact surface it subscribes to:
// a `matches` the tests set, and the listener pair. Installed as a side effect from `tests/unit/setup.ts`.

const QUERY = '(prefers-reduced-motion: reduce)'

let reducedMotion = false

const listeners = new Set<() => void>()

// Flipping it notifies the subscribed hooks the way a real media-query change would.
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
