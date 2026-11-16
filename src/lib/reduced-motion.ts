'use client'

import { useSyncExternalStore } from 'react'

// One hook every animated surface reads; not configurable.
// Not Motion's `useReducedMotion`: it captures the value once (a live preference change
// wouldn't stick) and reads `null` during prerender (the build machine's answer would be
// baked into the served HTML). `useSyncExternalStore` handles both: the server snapshot
// is `false` (motion allowed), which is safe — nothing animates at rest in the served HTML.

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
