'use client'

/* ══════════════════════════════════════════════════════════════════════════════
   THE PAGE TRANSITION — ACTION SEAM AND IMPERATIVE ENTRY (WP-06c)

   One module, two seams, both in the `history-traversal.ts` pattern (a
   module-level subscription rather than props drilled through the tree),
   because the two halves of the transition live in different branches of
   the tree: the overlay is persistent layout chrome, the triggers are the
   menu's entries — and neither should be the other's ancestor.

   ── The action seam ──────────────────────────────────────────────────────────
   The overlay owns the *animation* state machine (cover → reveal, in
   `TransitionOverlay`); what happens once the cover is opaque — the route
   change and/or the `#arbeiten` scroll — is a **swappable handler**. This
   file holds it: a module-level function the overlay calls at cover
   completion, and `setTransitionAction` the sequence owner (WP-06d) swaps
   out for the sequence's own action. WP-06c's own unit tests pin the
   default; 06d starts from the acceptance state and swaps the handler
   rather than refactoring the overlay mid-stream.

   ── The imperative entry ─────────────────────────────────────────────────────
   `beginTransition({ from, to, onCoverOpaque, onRevealComplete })` — the
   sequence owner's way of starting a transition and learning its beats
   (the overlay owns the timing; the caller only gets notified). The
   component registers itself as the subscriber on mount; unmounted or
   reduced motion → no subscriber, the call degrades to a no-op.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The two, and only two, destinations a transition may run to (WP-06). */
export type TransitionTarget = 'arbeiten' | 'landing'

/**
 * What the overlay does once the cover is opaque: the route change and/or
 * the anchor scroll. The default below performs exactly that, the plain way
 * — the sequence owner (WP-06d) swaps its own handler in.
 */
export type TransitionAction = (target: TransitionTarget) => void

/**
 * Starts a transition over the current page. No subscriber (the overlay is
 * unmounted, or the visitor has asked for reduced motion) → a no-op; the
 * caller's plain fallback is the same decision, made on the caller's side.
 *
 * @returns whether a subscriber ran the transition — `false` on the no-op
 *          path, which is how the sequence owner (WP-06d) reaches its
 *          degraded branch
 * @param options.from             the address the transition starts from — instrumentation
 * @param options.to               the target (`'arbeiten'` or `'landing'`)
 * @param options.onCoverOpaque    called once, at the beat the cover reaches full opacity —
 *                                 the only moment a route change or scroll may run
 * @param options.onRevealComplete called once, after the reveal has run over the destination
 */
export interface BeginTransitionOptions {
  from: string
  to: TransitionTarget
  onCoverOpaque?: () => void
  onRevealComplete?: () => void
}

/* ── The swappable action ──────────────────────────────────────────────────── */

const noopAction: TransitionAction = () => {}

let action: TransitionAction = noopAction

/**
 * Replaces the handler the overlay runs at cover completion. The sequence
 * owner (WP-06d) swaps the sequence's action in; the tests pin the swap.
 * Pass `null` to restore the no-op default.
 */
export function setTransitionAction(handler: TransitionAction | null): void {
  action = handler ?? noopAction
}

/** Runs the current action for the target — the overlay calls this at cover completion. */
export function runTransitionAction(target: TransitionTarget): void {
  action(target)
}

/* ── The imperative entry ──────────────────────────────────────────────────── */

export type BeginTransition = (options: BeginTransitionOptions) => boolean

let begin: BeginTransition = () => false

/** The overlay registers its starter; `null` on unmount restores the no-op. */
export function registerBeginTransition(handler: BeginTransition | null): void {
  begin = handler ?? (() => false)
}

/**
 * The public entry; see `BeginTransitionOptions` for the degradation
 * contract. Returns whether a subscriber ran the transition.
 */
export function beginTransition(options: BeginTransitionOptions): boolean {
  return begin(options)
}
