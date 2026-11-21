'use client'

// Three module-level seams (not props): the overlay is layout chrome, the triggers are menu entries.
// The action seam: the route change/scroll at cover completion is a swappable handler; `beginTransition` no-ops with no subscriber.
// The commit seam: the reveal lifts the cover only once the action has committed — the route really swapped, or the scroll ran.

export type TransitionTarget = 'arbeiten' | 'landing' | 'impressum'

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

let onCommit: (() => void) | null = null

export function setTransitionCommit(handler: (() => void) | null): void {
  onCommit = handler
}

export function notifyTransitionCommit(): void {
  onCommit?.()
}

export type BeginTransition = (options: BeginTransitionOptions) => boolean

let begin: BeginTransition = () => false

export function registerBeginTransition(handler: BeginTransition | null): void {
  begin = handler ?? (() => false)
}

export function beginTransition(options: BeginTransitionOptions): boolean {
  return begin(options)
}
