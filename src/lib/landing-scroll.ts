'use client'

import { useSyncExternalStore } from 'react'

/* ══════════════════════════════════════════════════════════════════════════════
   THE NAME TRAVEL — ONE PROGRESS, TWO READERS

   The name's scroll animation and the header's background fade are the same
   movement seen from two places: the name starts its travel when the mark
   leaves the viewport, lands in its header slot when the name has scrolled
   out of the landing fold — and the header's warm background reaches full
   opacity on exactly that beat. One progress, clamped to [0, 1], is therefore
   computed once (the name scroll is the writer, because it is the one that
   measures the mark and the name) and shared through this store: the header
   is the second reader, and neither component knows the other.

   ── The progress ─────────────────────────────────────────────────────────────
   `travelProgress` is the pure mapping the animation is built from:

     s0 — the scroll offset at which the mark's bottom edge crosses the top of
          the viewport. The name does not move before it; the mark is portrait
          and on top, so it is what leaves first, and that is the trigger.
     s1 — the scroll offset at which the name's top edge reaches the top of the
          viewport — the name scrolled out of the landing fold, and the moment
          the travel reaches its end.

   progress = (s − s0) / (s1 − s0), clamped. The window between s0 and s1 is
   short on a phone (the mark is tall), so the mapping stays a plain linear
   one: a curve would spend its softness on a distance the viewport cannot
   show. Both offsets are measured from the real layout by the name scroll and
   arrive here as data — nothing in this file hardcodes a position.

   ── Reduced motion ───────────────────────────────────────────────────────────
   No travel: the name is static in the header from the first non-landing
   position, so the progress is a step at s1 rather than a ramp over s0→s1.
   ══════════════════════════════════════════════════════════════════════════════ */

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/**
 * The name-travel progress at scroll offset `s`.
 *
 * @param s      the current scroll offset, in px
 * @param s0     the mark-exit offset — the travel starts here and not before
 * @param s1     the name-exit offset — the travel reaches its end here
 * @param reduced the visitor's reduced-motion preference; see the note above
 */
export function travelProgress(s: number, s0: number, s1: number, reduced: boolean): number {
  if (reduced) return s >= s1 ? 1 : 0
  if (s <= s0) return 0
  if (s1 <= s0) return 1
  return clamp01((s - s0) / (s1 - s0))
}

/* ─────────────────────────────────────────────────────────────────────────
   The store. The writer is the name scroll's rAF-throttled scroll handler;
   the reader is the header's background. A module-level store rather than
   state lifted into a common parent, because the two live in different
   branches of the tree (the header is page chrome, the travel is the
   landing's) and neither should be the other's ancestor.
   ───────────────────────────────────────────────────────────────────────── */

type Listener = () => void

let progress = 0
const listeners = new Set<Listener>()

/** The name scroll writes the progress it just applied. No-op when unchanged. */
export function setLandingProgress(value: number): void {
  if (value === progress) return
  progress = value
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): number {
  return progress
}

/** Prerendering and the no-landing documents (the legal page) rest at 0. */
function getServerSnapshot(): number {
  return 0
}

/**
 * The name-travel progress, for readers that are not the writer. The header
 * background's opacity is this value; nothing else consumes it.
 */
export function useLandingProgress(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
