'use client'

// Two module-level seams (not props): the overlay is layout chrome, the triggers are
// menu entries, and neither should be the other's ancestor.
// 1) The action seam: the overlay owns the cover→reveal animation; the route change/scroll
//    that runs at cover completion is a swappable handler (the sequence owner swaps it in).
// 2) The imperative entry: `beginTransition` starts a transition and reports its beats;
//    no subscriber (unmounted, reduced motion) → no-op.

export type TransitionTarget = 'arbeiten' | 'landing'

/** Route change and/or anchor scroll, run once the cover is opaque. */
export type TransitionAction = (target: TransitionTarget) => void

export interface BeginTransitionOptions {
  /** Instrumentation: the address the transition starts from. */
  from: string
  to: TransitionTarget
  /** Once, when the cover reaches full opacity — the only moment a route change or scroll may run. */
  onCoverOpaque?: () => void
  /** Once, after the reveal has run over the destination. */
  onRevealComplete?: () => void
}

const noopAction: TransitionAction = () => {}

let action: TransitionAction = noopAction

/** Pass `null` to restore the no-op default. */
export function setTransitionAction(handler: TransitionAction | null): void {
  action = handler ?? noopAction
}

export function runTransitionAction(target: TransitionTarget): void {
  action(target)
}

export type BeginTransition = (options: BeginTransitionOptions) => boolean

let begin: BeginTransition = () => false

export function registerBeginTransition(handler: BeginTransition | null): void {
  begin = handler ?? (() => false)
}

/** Returns whether a subscriber ran the transition. */
export function beginTransition(options: BeginTransitionOptions): boolean {
  return begin(options)
}
