import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { MenuButton } from '@/components/layout/MenuButton'
import messages from '@/i18n/messages/de.json'

// The invariants the control carries before anything is mounted: the disclosure contract (`aria-expanded`, `aria-controls`, the
// `aria-label` flip), one press one toggle, exactly two line elements in both states (no SVG, no cross-fade), a real `<button>`.


const CONTROLS_ID = 'site-menu'

function renderButton(props: Partial<Parameters<typeof MenuButton>[0]> = {}) {
  const onToggle = vi.fn()
  const view = render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <MenuButton open={false} onToggle={onToggle} controlsId={CONTROLS_ID} {...props} />
    </NextIntlClientProvider>,
  )
  const button = view.container.querySelector('button')
  expect(button).not.toBeNull()
  return { ...view, button: button as HTMLButtonElement, onToggle }
}

describe('the disclosure contract', () => {
  it('closed: collapsed, named after the panel, labelled with the open action', () => {
    const { button } = renderButton({ open: false })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', CONTROLS_ID)
    expect(button).toHaveAttribute('aria-label', messages.menu.openLabel)
  })

  it('open: expanded and labelled with the close action, same panel', () => {
    const { button } = renderButton({ open: true })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(button).toHaveAttribute('aria-controls', CONTROLS_ID)
    expect(button).toHaveAttribute('aria-label', messages.menu.closeLabel)
  })
})

describe('the toggle', () => {
  it('fires the handler exactly once per click', () => {
    const { button, onToggle } = renderButton({ open: false })
    fireEvent.click(button)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})

describe('the morph premise', () => {
  it('carries exactly two line elements — the two that transform into the X', () => {
    for (const open of [false, true]) {
      const { button } = renderButton({ open })
      const lines = button.querySelectorAll('.menu-button__line')
      expect(lines).toHaveLength(2)
      /* The morph is a transform on these two, never an icon swap: no SVG in
         the button, and both states keep the same two elements. */
      expect(button.querySelector('svg')).toBeNull()
    }
  })
})

describe('keyboard', () => {
  it('is a native button: focusable and receiving focus', () => {
    const { button } = renderButton({ open: false })
    expect(button.tagName).toBe('BUTTON')
    /* A native button is in the tab order by default; the focus assertion is
       the proof that nothing has opted it out. */
    expect(button.tabIndex).toBe(0)
    button.focus()
    expect(button).toHaveFocus()
  })
})

describe('the i18n labels', () => {
  it('are the German labels from the message file', () => {
    expect(messages.menu.openLabel).toBe('Menü öffnen')
    expect(messages.menu.closeLabel).toBe('Menü schließen')
    /* The rendered button resolves them through `t`, not a literal copy. */
    const { button } = renderButton({ open: false })
    expect(screen.getByRole('button', { name: 'Menü öffnen' })).toBe(button)
  })
})
