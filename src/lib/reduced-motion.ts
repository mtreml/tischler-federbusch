'use client'

import { useSyncExternalStore } from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE REDUCED-MOTION PREFERENCE (ported from the reference)

   "Respecting the reduced-motion preference is **not configurable** and applies regardless
   of every key in the motion group" (Motion). So there is one hook, every animated
   surface reads it — the landing intro, the name scroll, the header — and no
   configuration key can switch it off.

   ── Why this rather than Motion's own `useReducedMotion` ───────────────────────
   Every animation is gated on a `useReducedMotion` hook, and Motion ships one.
   Two things about its implementation make it the wrong reader for a **statically exported**
   site, and neither is a criticism of the library:

     1. **It captures the value once**, with `useState(prefersReducedMotion.current)`. A
        visitor who turns the preference on while the page is open keeps the animations until
        they reload, where the preference has to be respected throughout.
     2. **It reads `null` during prerendering**, and React does not reconcile attribute
        mismatches on hydration. Anything rendered from the value therefore keeps the
        *build machine's* answer in the served HTML forever, while the component's own
        behaviour is correct. A gate that cannot observe the thing it gates is not a gate.

   `useSyncExternalStore` is built for exactly this: it takes a server snapshot, and when
   the client's differs after hydration it forces the re-render that makes the two agree.
   The server snapshot is `false` — motion allowed — which is safe because nothing animates
   at rest in the served HTML: the intro's pending state is styled by CSS that the reduced-
   motion media query already collapses to the final state, and playback starts from an
   effect.
   ══════════════════════════════════════════════════════════════════════════════ */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onStoreChange)
  return () => media.removeEventListener('change', onStoreChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Prerendering has no visitor and therefore no preference. */
function getServerSnapshot(): boolean {
  return false
}

/**
 * True when the visitor has asked for reduced motion, and it stays true to the current
 * setting rather than to the setting at page load.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
