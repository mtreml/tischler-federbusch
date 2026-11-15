import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it } from 'vitest'

import { Menu } from '@/components/layout/Menu'
import { Header } from '@/components/layout/Header'
import { site } from '@/config/site.config'
import { resolveContact } from '@/lib/config/resolve'
import { MENU_PANEL_ID, MenuProvider } from '@/lib/menu'
import messages from '@/i18n/messages/de.json'

/* ══════════════════════════════════════════════════════════════════════════════
   THE MENU PANEL AND ITS MOUNTING (WP-06b2)

   The invariants the panel carries before any animation is on it (WP-06b3)
   and before the overlay sequence replaces the fallbacks (WP-06d):

     • The dialog contract: `role="dialog"`, `aria-modal="true"`, the label —
       and the panel's `id` is the one string the `MenuButton`s' `aria-controls`
       name, so the three cannot drift apart.
     • The list: the entries render in `site.navigation.items` order and
       nothing else, the tel/mailto display text and hrefs equal
       `resolveContact()` — asserted on the strings, so a second copy can never
       drift in — and the name link points at the landing.
     • The hooks: `data-transition` on exactly the name link ("landing") and
       the first entry ("arbeiten"), the two WP-06d takes over.
     • The mounting: the header carries a `MenuButton` wired to `useMenu()` —
       one press opens — and the `[locale]` layout renders the provider and
       the panel after `<main>`.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The closed surface: the provider around the header and the panel. */
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

/** Opens the menu the way a visitor does: one press on the header's button. */
function openMenu(view: ReturnType<typeof renderClosed>) {
  /* Before the open, exactly the header's button matches the panel's id. */
  const trigger = view.container.querySelector('button[aria-controls="site-menu"]')
  expect(trigger).not.toBeNull()
  if (trigger === null) return
  fireEvent.click(trigger)
}

/** The open panel, resolved from its own id. */
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

    /* The panel's `id` is the single string the `aria-controls` name: the
       header's trigger and the panel's X both point at it. */
    expect(node.id).toBe(MENU_PANEL_ID)
    const controls = view.container.querySelectorAll(`button[aria-controls="${MENU_PANEL_ID}"]`)
    expect(controls).toHaveLength(2)
    view.unmount()
  })

  it('is unmounted again on close', async () => {
    const view = renderClosed()
    openMenu(view)
    expect(panel(view)).not.toBeNull()

    /* The panel's X closes: the one button inside the panel. The exit runs
       through the panel's `AnimatePresence` (WP-06b3), so the removal is a
       beat, not a synchronous unmount. */
    fireEvent.click(within(panel(view)).getByRole('button'))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 1000 })
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
    /* The landing, as the localized URL the export writes — the trailing
       slash next/link appends once it knows the app's setting. */
    expect(nameLink.getAttribute('href')).toMatch(/^\/de\/?$/)
    /* The wordmark, decorative, in its one wrapper. */
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

    /* The panel's links: the name first, then the entries — and no more. */
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

    /* Every `data-transition` in the panel is one of the two. */
    expect(node.querySelectorAll('[data-transition]')).toHaveLength(2)
    view.unmount()
  })
})

describe('the fallback actions (replaced by WP-06d)', () => {
  /* On the landing (the jsdom URL set to the localized one), the fallbacks
     close the menu first — the navigation itself is a plain browser move. */
  it('name link: closes the menu before navigating home', async () => {
    window.history.replaceState({}, '', '/de/')
    const view = renderClosed()
    openMenu(view)
    expect(panel(view)).not.toBeNull()

    const nameLink = panel(view).querySelector('.menu__name')
    expect(nameLink).not.toBeNull()
    if (nameLink === null) return
    fireEvent.click(nameLink)
    /* The exit runs through the panel's `AnimatePresence` (WP-06b3): the
       removal is a beat, not a synchronous unmount. */
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 1000 })
    view.unmount()
  })

  it('Arbeiten: closes the menu before jumping to the anchor', async () => {
    window.history.replaceState({}, '', '/de/')
    const view = renderClosed()
    openMenu(view)

    fireEvent.click(screen.getByRole('link', { name: 'Arbeiten' }))
    /* The exit runs through the panel's `AnimatePresence` (WP-06b3). */
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 1000 })
    view.unmount()
  })
})

describe('the mounting', () => {
  it('the header renders a MenuButton wired to useMenu() — one press opens', () => {
    const view = renderClosed()
    /* The trigger is the real component, in the header's actions area. */
    const trigger = view.container.querySelector('.header__actions .menu-button')
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-controls', MENU_PANEL_ID)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    if (trigger === null) return

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).not.toBeNull()
    /* The button's state mirrors the panel: expanded, the close label. */
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-label', messages.menu.closeLabel)
    view.unmount()
  })

  it('the [locale] layout renders the provider and the panel after <main>', () => {
    /* The layout is a server component reading the request locale, so its
       mounting is asserted on the source — the same seam the favicon test
       holds on the filesystem. */
    const layout = readFileSync(join(process.cwd(), 'src', 'app', '[locale]', 'layout.tsx'), 'utf8')
    const provider = layout.indexOf('<MenuProvider>')
    const main = layout.indexOf('<main id="main-content">')
    const menu = layout.indexOf('<Menu />')
    const endMain = layout.indexOf('</main>')

    expect(provider).not.toBe(-1)
    expect(main).not.toBe(-1)
    expect(menu).not.toBe(-1)
    /* The tree: provider → main → panel. */
    expect(provider).toBeLessThan(main)
    expect(main).toBeLessThan(endMain)
    expect(endMain).toBeLessThan(menu)
  })
})
