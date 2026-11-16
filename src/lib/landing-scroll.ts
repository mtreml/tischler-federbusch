'use client'

import { useSyncExternalStore } from 'react'

// One progress, two readers: the name's travel and the header's background fade are the same movement.
// The name scroll is the writer (it measures mark and name); the header is the reader. Linear, not curved; reduced motion: a step at s1.

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function travelProgress(s: number, s0: number, s1: number, reduced: boolean): number {
  if (reduced) return s >= s1 ? 1 : 0
  if (s <= s0) return 0
  if (s1 <= s0) return 1
  return clamp01((s - s0) / (s1 - s0))
}

// Module-level store (not lifted state): the writer and readers live in different branches of the tree.
type Listener = () => void

let progress = 0
const listeners = new Set<Listener>()

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

function getServerSnapshot(): number {
  return 0
}

export function useLandingProgress(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
