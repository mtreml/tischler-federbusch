'use client'

import { useSyncExternalStore } from 'react'

// One boolean, two readers: the name's stick and the white bar's appearance are the same scroll.
// The name scroll is the writer (it measures the name and the works section's top); the header is the reader.
// Instant, not a fade: the bar appears the frame the white part reaches the name's bottom edge.

/** The name's y translate at scroll `s`: it scrolls with the page until its top edge reaches the header slot. */
export function stickOffset(s: number, sStick: number): number {
  return Math.max(0, s - sStick)
}

/** The bar is visible from the frame `s` reaches the handover scroll, and stays. */
export function barVisibleAt(s: number, barOnAt: number): boolean {
  return s >= barOnAt
}

// Module-level store (not lifted state): the writer and readers live in different branches of the tree.
type Listener = () => void

let barVisible = false
const listeners = new Set<Listener>()

export function setBarVisible(value: boolean): void {
  if (value === barVisible) return
  barVisible = value
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return barVisible
}

function getServerSnapshot(): boolean {
  return false
}

export function useBarVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
