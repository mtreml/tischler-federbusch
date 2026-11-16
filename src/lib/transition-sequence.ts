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

// One sequence, one owner: the overlay owns timing (cover → reveal); this hook owns the close at t0, the action on
// the beat, the focus return. The `defaultPrevented` guard prevents double-firing; no subscriber → run immediately.

function scrollToTarget(target: TransitionTarget): void {
  if (target === 'landing') {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    return
  }
  document.getElementById(target)?.scrollIntoView({ behavior: 'auto' })
}

export function useTransitionSequence(): {
  transitionTo: (target: TransitionTarget) => void
} {
  const { close, returnFocus } = useMenu()
  const locale = useLocale()
  const reducedMotion = usePrefersReducedMotion()
  const router = useUrlRouter()
  const pathname = useUrlPathname()

  const landingPath = pathFor({ href: '/', locale })

  // The pathname at click time — by the beat the route may have moved.
  const fromRef = useRef('')
  const commitScrollRef = useRef<TransitionTarget | null>(null)

  const action = useCallback<TransitionAction>(
    (target) => {
      const from = fromRef.current
      if (from === landingPath) {
        // On the landing: just the scroll, one frame later (the scroll lock is released first).
        requestAnimationFrame(() => scrollToTarget(target))
        return
      }
      commitScrollRef.current = target
      router.push(landingPath, { scroll: false })
    },
    [landingPath, router],
  )

  // Commit: the pathname really changed, so the deferred scroll runs now.
  useEffect(() => {
    if (pathname !== landingPath) return
    const target = commitScrollRef.current
    if (target === null) return
    commitScrollRef.current = null
    scrollToTarget(target)
  }, [pathname, landingPath])

  useEffect(() => {
    setTransitionAction(action)
    return () => setTransitionAction(null)
  }, [action])

  const transitionTo = useCallback(
    (target: TransitionTarget) => {
      fromRef.current = window.location.pathname

      close({ deferFocusReturn: true })

      const began = beginTransition({
        from: fromRef.current,
        to: target,
        onRevealComplete: returnFocus,
      })
      if (began) return

      action(target)
      returnFocus()
    },
    [close, returnFocus, action],
  )

  const enabled = !reducedMotion
  useEffect(() => {
    if (!enabled) return

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const trigger =
        event.target instanceof Element ? event.target.closest('[data-transition]') : null
      if (trigger === null) return
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
