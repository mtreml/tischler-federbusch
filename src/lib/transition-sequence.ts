'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'

import { useUrlPathname, useUrlRouter } from '@/i18n/navigation'
import { pathFor } from '@/i18n/paths'
import { useMenu } from '@/lib/menu'
import { usePrefersReducedMotion } from '@/lib/reduced-motion'
import {
  beginTransition,
  setTransitionAction,
  type TransitionAction,
  type TransitionTarget,
} from '@/lib/transition'

/* ══════════════════════════════════════════════════════════════════════════════
   THE TRANSITION SEQUENCE — ONE SEQUENCE, ONE OWNER

   The menu and the overlay are one sequence owned by this hook, called from
   `Menu.tsx` — the one component inside the `MenuProvider` that has the
   triggers. The overlay keeps owning the *timing* (cover → reveal);
   this module owns *what happens*: the close at t0, the action on
   the overlay's beat, the focus return at the end.

   ── The one entry ────────────────────────────────────────────────────────────
   `transitionTo(target)` is called exactly two ways, mutually exclusive per
   click:

     • normal path — the capture interception below `preventDefault`s in the
       capture phase and calls it with the clicked element's `data-transition`
       value;
     • reduced-motion path — the interception is never attached (the same
       `usePrefersReducedMotion` read it uses: one decision, one place), so
       each trigger's own `onClick` calls it; the `event.defaultPrevented`
       guard on that `onClick` makes the two paths structurally unable to
       double-fire.

   ── The sequence (normal path) ───────────────────────────────────────────────
   One shared timeline:

     1. t0 — `close({ deferFocusReturn: true })`: the menu state is closed at
        t0, its exit runs under the cover, and the focus return is deferred
        to the sequence's end (the menu state's contract).
     2. Cover start — `beginTransition({ from, to, onRevealComplete })` with
        `from` the raw `window.location.pathname` read at click time. The
        overlay owns the timing; the action runs on its beat through the
        swappable handler installed in a mount effect. `onCoverOpaque` stays
        free — the overlay's suite pins it.
     3. Action beat — the route change and/or the instant anchor scroll.
        Nothing navigates before this beat (the overlay guarantees it).
     4. Reveal complete — `onRevealComplete` → `returnFocus()`.

   The action is one closure (the action table), swapped in for
   `transition.ts`'s no-op default for the component's life:

     | target     | on the landing        | on another page                          |
     | ---------- | --------------------- | ---------------------------------------- |
     | `landing`  | scroll to top         | `push(landing)`, scroll to top on commit |
     | `arbeiten` | scroll to `#arbeiten` | `push(landing)`, scroll to `#arbeiten`   |

   "On the landing" is the raw pathname read **at click time** (the ref the
   action reads), the destination is `pathFor({ href: '/', locale })`, the
   route changes through `router.push(…, { scroll: false })`, and the commit
   is the raw `useUrlPathname()` changing (an effect). The scrolls are
   instant (`behavior: 'auto'`); on the landing they run in a
   `requestAnimationFrame` after the close effect has released the scroll
   lock — the defer the fallbacks already ran. `#arbeiten` does not exist
   until the works section is present; the lookup degrades to a no-op and the
   cover still reveals.

   ── The degraded branch ──────────────────────────────────────────────────────
   Reduced motion, or `beginTransition` reporting no subscriber: the overlay
   will never run the action on its beat, so the *same* action runs
   immediately and `returnFocus()` immediately — the focus the deferred close
   left pending can never be left deferred. (`close()` itself was already
   called at t0 and is idempotent.)
   ══════════════════════════════════════════════════════════════════════════════ */

/** The instant scroll the sequence runs — never smooth, by decision. */
function scrollToTarget(target: TransitionTarget): void {
  if (target === 'landing') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return
  }
  /* The works section; the optional chain stays the degradation:
     no element, no scroll, the cover still reveals. */
  document.getElementById(target)?.scrollIntoView({ behavior: 'auto' })
}

/**
 * Wires the menu and the overlay into the one sequence they share. Must be
 * called inside the `MenuProvider` — it reads the menu's close and the
 * deferred focus return.
 */
export function useTransitionSequence(): {
  transitionTo: (target: TransitionTarget) => void
} {
  const { close, returnFocus } = useMenu()
  const locale = useLocale()
  const reducedMotion = usePrefersReducedMotion()
  const router = useUrlRouter()
  const pathname = useUrlPathname()

  /* The landing, as the export writes it — `pathFor` carries the trailing
     slash, the same read the fallbacks ran. */
  const landingPath = pathFor({ href: '/', locale })

  /* Where the current transition started from — the raw pathname read at
     click time, not at the action's. The action reads it: the click owns
     the decision, and by the beat the route may already have moved. */
  const fromRef = useRef('')
  /* The target whose commit scroll still has to run: set when the action
     pushed the landing, consumed by the commit effect below. A ref — the
     effect is driven by the pathname change, and the consumption must not
     itself be a render. */
  const commitScrollRef = useRef<TransitionTarget | null>(null)

  /* The action the overlay runs on its beat — the action table as
     one closure. */
  const action = useCallback<TransitionAction>(
    (target) => {
      const from = fromRef.current
      if (from === landingPath) {
        /* On the landing: no route change — just the scroll. It waits one
         frame: the close effect (t0) releases the scroll lock after the
         commit, before the next frame, so the page can move by the time
         the frame fires. */
        requestAnimationFrame(() => scrollToTarget(target))
        return
      }
      /* On another page: navigate home beneath the cover with the browser's
       own scroll suppressed, and let the commit effect scroll once the raw
       pathname has actually changed. */
      commitScrollRef.current = target
      router.push(landingPath, { scroll: false })
    },
    [landingPath, router],
  )

  /* The commit: the raw pathname read changed — the destination is really
     mounted, so the deferred scroll runs now. */
  useEffect(() => {
    if (pathname !== landingPath) return
    const target = commitScrollRef.current
    if (target === null) return
    commitScrollRef.current = null
    scrollToTarget(target)
  }, [pathname, landingPath])

  /* The swappable action: swapped in for the no-op default for the life of
     the component, restored on unmount — the tests restore it in
     `afterEach`, as the overlay's suite does. */
  useEffect(() => {
    setTransitionAction(action)
    return () => setTransitionAction(null)
  }, [action])

  /* The one entry. The `from` read is the first thing that happens: the
     action and the instrumentation both answer "where did it start" from
     the click, not from a later render. */
  const transitionTo = useCallback(
    (target: TransitionTarget) => {
      fromRef.current = window.location.pathname

      /* t0 — the menu state closes now, under the cover; the focus return
         is deferred to the sequence's end. */
      close({ deferFocusReturn: true })

      const began = beginTransition({
        from: fromRef.current,
        to: target,
        onRevealComplete: returnFocus,
      })
      if (began) return

      /* Degraded — reduced motion or no subscriber: the overlay will never
         run the action on its beat, so the same action runs now, and the
         deferred focus return with it. */
      action(target)
      returnFocus()
    },
    [close, returnFocus, action],
  )

  /* The capture interception: a document-level capture-phase `click`,
     attached only when enabled — the same `usePrefersReducedMotion` read
     the triggers use, one decision, one place. A pass-through is left
     untouched; an intercept reads the value off the closest
     `data-transition` element and hands the click to the sequence. The
     capture phase runs before the trigger's bubble-phase `onClick`, whose
     `defaultPrevented` guard is what keeps the two paths mutually
     exclusive. */
  const enabled = !reducedMotion
  useEffect(() => {
    if (!enabled) return

    const onClick = (event: MouseEvent) => {
      /* Primary button only — and no modifiers: a modified click opens a
         tab and must not be taken over. */
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const trigger =
        event.target instanceof Element ? event.target.closest('[data-transition]') : null
      if (trigger === null) return
      /* Exactly two elements carry the attribute; anything else is a
         pass-through. */
      const value = trigger.getAttribute('data-transition')
      if (value !== 'landing' && value !== 'arbeiten') return
      event.preventDefault()
      transitionTo(value)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled, transitionTo])

  return { transitionTo }
}
