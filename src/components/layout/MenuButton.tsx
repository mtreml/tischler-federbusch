'use client'

import { useTranslations } from 'next-intl'

// The one button, two states: two horizontal lines that transform into an X — a transform on the lines, not an SVG
// cross-fade. Presentational: `open` and `onToggle` are owned by the menu; a real `<button>` carrying the disclosure contract.
interface MenuButtonProps {
  open: boolean
  onToggle: () => void
  // The panel's id, named by `aria-controls`.
  controlsId: string
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
