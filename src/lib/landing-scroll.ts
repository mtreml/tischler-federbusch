'use client'

import { useSyncExternalStore } from 'react'

// Written by the name scroll and read by the header: `nameHandedOver` is the works section's top reaching the pinned
// name's bottom edge — the landing's clip starts to cut the name, so the header's own name takes over.

/** True from the frame the works section's viewport top reaches `edge` (px from the viewport top), and stays. */
export function worksReached(worksTop: number, edge: number): boolean {
  return worksTop <= edge
}

export interface HeaderScrollState {
  nameHandedOver: boolean
}

type Listener = () => void

const initialState: HeaderScrollState = { nameHandedOver: false }
let state = initialState
const listeners = new Set<Listener>()

export function setHeaderScrollState(next: HeaderScrollState): void {
  if (next.nameHandedOver === state.nameHandedOver) return
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): HeaderScrollState {
  return state
}

function getServerSnapshot(): HeaderScrollState {
  return initialState
}

export function useHeaderScrollState(): HeaderScrollState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
