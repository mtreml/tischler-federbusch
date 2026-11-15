'use client'

import { useTranslations } from 'next-intl'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU BUTTON (WP-06a)

   The one button, two states: two horizontal lines that transform into an X.
   The morph is a transform on the lines themselves — not an SVG and not two
   stacked icons that cross-fade — so the open and the closed state are the
   same two elements, one continuous movement between them (the CSS in
   `src/styles/menu.css`).

   ── What this file is and is not ─────────────────────────────────────────────
   This is the control, not its state: the button is presentational and
   receives `open` and `onToggle` from the menu (WP-06b), which owns the
   state and the panel it toggles. It is also not mounted yet — 06b lands it
   in the header. `controlsId` is the panel's id, from the same 06b, and
   arrives with it.

   ── The semantics ────────────────────────────────────────────────────────────
   A real `<button>` — never a div with a click handler — carrying the
   disclosure contract: `aria-expanded` mirrors the state, `aria-controls`
   names the panel, and the `aria-label` flips between the two i18n labels so
   a screen reader always announces the action the press will take, not the
   state the button is in.
   ══════════════════════════════════════════════════════════════════════════════ */

interface MenuButtonProps {
  /** The menu's state, owned by the menu (WP-06b): `true` when the panel is open. */
  open: boolean
  /** The menu's toggle handler, owned by the menu (WP-06b). */
  onToggle: () => void
  /** The menu panel's id (WP-06b), named by `aria-controls`. */
  controlsId: string
  /** Optional extra class, joined after the component's own. */
  className?: string
}

export function MenuButton({ open, onToggle, controlsId, className }: MenuButtonProps) {
  const t = useTranslations('menu')

  return (
    <button
      type="button"
      className={className ? `menu-button ${className}` : 'menu-button'}
      aria-expanded={open}
      aria-controls={controlsId}
      aria-label={t(open ? 'closeLabel' : 'openLabel')}
      onClick={onToggle}
    >
      <span className="menu-button__line menu-button__line--top" aria-hidden="true" />
      <span className="menu-button__line menu-button__line--bottom" aria-hidden="true" />
    </button>
  )
}
