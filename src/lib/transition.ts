'use client'

// Two module-level seams (not props): the overlay is layout chrome, the triggers are menu entries.
// The action seam: the route change/scroll at cover completion is a swappable handler; `beginTransition` no-ops with no subscriber.

export type TransitionTarget = 'arbeiten' | 'landing'

export type TransitionAction = (target: TransitionTarget) => void

export interface BeginTransitionOptions {
  from: string
  to: TransitionTarget
  // Once, when the cover reaches full opacity — the only moment a route change or scroll may run.
  onCoverOpaque?: () => void
  onRevealComplete?: () => void
}

const noopAction: TransitionAction = () => {}

let action: TransitionAction = noopAction

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

export function beginTransition(options: BeginTransitionOptions): boolean {
  return begin(options)
}
