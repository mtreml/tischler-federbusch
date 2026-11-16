import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Menu } from '@/components/layout/Menu'
import { Header } from '@/components/layout/Header'
import { site } from '@/config/site.config'
import { resolveContact } from '@/lib/config/resolve'
import { MENU_PANEL_ID, MenuProvider } from '@/lib/menu'
import messages from '@/i18n/messages/de.json'

// The sequence owner needs the app router mounted, so the suite hands the sequence out through a spy.
const mockTransitionTo = vi.fn()
vi.mock('@/lib/transition-sequence', () => ({
  useTransitionSequence: () => ({ transitionTo: mockTransitionTo }),
}))


function renderClosed() {
  const view = render(
    <NextIntlClientProvider locale="de" messages={messages}>
      <MenuProvider>
        <Header />
        <Menu />
      </MenuProvider>
    </NextIntlClientProvider>,
  )
  return view
}

function openMenu(view: ReturnType<typeof renderClosed>) {
  const trigger = view.container.querySelector('button[aria-controls="site-menu"]')
  expect(trigger).not.toBeNull()
  if (trigger === null) return
  fireEvent.click(trigger)
}

function panel(view: ReturnType<typeof renderClosed>) {
  const node = view.container.querySelector<HTMLElement>(`#${MENU_PANEL_ID}`)
  expect(node).not.toBeNull()
  if (node === null) throw new Error('the panel is not mounted')
  return node
}

describe('closed, the panel is absent', () => {
  it('renders no dialog and no panel node', () => {
    const view = renderClosed()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(view.container.querySelector(`#${MENU_PANEL_ID}`)).toBeNull()
    view.unmount()
  })
})

describe('the dialog contract', () => {
  it('is a modal dialog, labelled, and carries the id both buttons name', () => {
    const view = renderClosed()
    openMenu(view)

    const node = panel(view)
    expect(node).toHaveAttribute('role', 'dialog')
    expect(node).toHaveAttribute('aria-modal', 'true')
    expect(node).toHaveAttribute('aria-label', messages.menu.dialogLabel)

    expect(node.id).toBe(MENU_PANEL_ID)
    const controls = view.container.querySelectorAll(`button[aria-controls="${MENU_PANEL_ID}"]`)
    expect(controls).toHaveLength(2)
    view.unmount()
  })

  it('is unmounted again on close', async () => {
    const view = renderClosed()
    openMenu(view)
    expect(panel(view)).not.toBeNull()

    fireEvent.click(within(panel(view)).getByRole('button'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 1000 })
    view.unmount()
  })
})

describe('the close morph', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('the panel\'s X tracks the live state while the panel exits — no frozen X', async () => {
    const tokens: Record<string, string> = {
      '--duration-menu': '10s',
      '--duration-menu-items': '10s',
      '--menu-item-rise': '10px',
      '--ease-quiet': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    }
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() =>
      ({
        fontSize: '16px',
        getPropertyValue: (name: string) => tokens[name] ?? '',
      }) as unknown as CSSStyleDeclaration,
    )

    const view = renderClosed()
    openMenu(view)
    const closeButton = within(panel(view)).getByRole('button')
    expect(closeButton).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(closeButton)

    await waitFor(() => {
      const node = view.container.querySelector<HTMLElement>(`#${MENU_PANEL_ID}`)
      expect(node).not.toBeNull()
      if (node === null) return
      expect(node.querySelector('button[aria-controls="site-menu"]')).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    }, { timeout: 1000 })

    view.unmount()
  })
})

describe('the name', () => {
  it('is the wordmark in a link to the landing, top left in the panel', () => {
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)

    const nameLink = node.querySelector('.menu__name')
    expect(nameLink).not.toBeNull()
    if (nameLink === null) return
    expect(nameLink.tagName).toBe('A')
    expect(nameLink.getAttribute('href')).toMatch(/^\/de\/?$/)
    const image = nameLink.querySelector('img')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toBe('/name.svg')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    view.unmount()
  })
})

describe('the entries', () => {
  it('render in `site.navigation.items` order, and nothing else', () => {
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)

    const links = within(node).getAllByRole('link')
    const entries = links.slice(1) as HTMLElement[]
    expect(entries).toHaveLength(site.navigation.items.length)

    const contact = resolveContact()
    const expected = site.navigation.items.map((item) => {
      if (item.type === 'anchor') {
        return { label: item.label, href: `#${item.anchor}` }
      }
      if (item.type === 'tel') {
        return { label: contact.phoneDisplay, href: contact.telHref }
      }
      return { label: contact.email, href: contact.mailtoHref }
    })

    entries.forEach((entry, index) => {
      const expectation = expected[index]
      expect(entry).toHaveTextContent(expectation?.label ?? '')
      expect(entry).toHaveAttribute('href', expectation?.href ?? '')
    })
    view.unmount()
  })

  it('carry the `resolveContact()` values verbatim — display and href', () => {
    const view = renderClosed()
    openMenu(view)

    const contact = resolveContact()
    const tel = screen.getByRole('link', { name: contact.phoneDisplay })
    expect(tel).toHaveAttribute('href', contact.telHref)
    const email = screen.getByRole('link', { name: contact.email })
    expect(email).toHaveAttribute('href', contact.mailtoHref)
    view.unmount()
  })
})

describe('the transition hooks', () => {
  it('marks the name link and the anchor entry — and nothing else', () => {
    const view = renderClosed()
    openMenu(view)
    const node = panel(view)

    const landing = node.querySelectorAll('[data-transition="landing"]')
    expect(landing).toHaveLength(1)
    expect(landing[0]?.getAttribute('href')).toMatch(/^\/de\/?$/)

    const arbeiten = node.querySelectorAll('[data-transition="arbeiten"]')
    expect(arbeiten).toHaveLength(1)
    expect(arbeiten[0]).toHaveTextContent('Arbeiten')

    expect(node.querySelectorAll('[data-transition]')).toHaveLength(2)
    view.unmount()
  })
})

describe('the transition triggers', () => {
  // The triggers' guarded `onClick`: a no-op when the capture interception has already taken the click.
  it('the name link hands the sequence the "landing" target', () => {
    mockTransitionTo.mockClear()
    const view = renderClosed()
    openMenu(view)

    const nameLink = panel(view).querySelector('.menu__name')
    expect(nameLink).not.toBeNull()
    if (nameLink === null) return
    fireEvent.click(nameLink)
    expect(mockTransitionTo).toHaveBeenCalledTimes(1)
    expect(mockTransitionTo).toHaveBeenCalledWith('landing')
    view.unmount()
  })

  it('the anchor entry hands the sequence the "arbeiten" target', () => {
    mockTransitionTo.mockClear()
    const view = renderClosed()
    openMenu(view)

    fireEvent.click(screen.getByRole('link', { name: 'Arbeiten' }))
    expect(mockTransitionTo).toHaveBeenCalledTimes(1)
    expect(mockTransitionTo).toHaveBeenCalledWith('arbeiten')
    view.unmount()
  })

  it('a prevented click is a no-op — the interception already took it', () => {
    mockTransitionTo.mockClear()
    const view = renderClosed()
    openMenu(view)

    const nameLink = panel(view).querySelector('.menu__name')
    expect(nameLink).not.toBeNull()
    if (nameLink === null) return
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    event.preventDefault()
    fireEvent(nameLink, event)
    expect(mockTransitionTo).not.toHaveBeenCalled()
    view.unmount()
  })
})

describe('the mounting', () => {
  it('the header renders a MenuButton wired to useMenu() — one press opens', () => {
    const view = renderClosed()
    const trigger = view.container.querySelector('.header__actions .menu-button')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-controls', MENU_PANEL_ID)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    if (trigger === null) return

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-label', messages.menu.closeLabel)
    view.unmount()
  })

  it('the [locale] layout renders the provider and the panel after <main>', () => {
    // The layout is a server component, so its mounting is asserted on the source.
    const layout = readFileSync(join(process.cwd(), 'src', 'app', '[locale]', 'layout.tsx'), 'utf8')
    const provider = layout.indexOf('<MenuProvider>')
    const main = layout.indexOf('<main id="main-content">')
    const menu = layout.indexOf('<Menu />')
    const endMain = layout.indexOf('</main>')

    expect(provider).not.toBe(-1)
    expect(main).not.toBe(-1)
    expect(menu).not.toBe(-1)
    expect(provider).toBeLessThan(main)
    expect(main).toBeLessThan(endMain)
    expect(endMain).toBeLessThan(menu)
  })
})
