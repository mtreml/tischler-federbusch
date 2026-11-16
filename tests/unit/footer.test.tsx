import { renderToReadableStream } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { Footer } from '@/components/layout/Footer'
import messages from '@/i18n/messages/de.json'
import { site } from '@/config/site.config'
import { resolveCopyrightHolder } from '@/lib/config/resolve'

/* The footer is a server component — async, because it reads its one
   structural label ("Made with care & love by") through the locale messages. The harness
   supplies those from the real `de.json` (the component must not carry the
   label itself) and renders through the server renderer's stream, which is
   what awaits it — the same path the static export takes, so the assertion
   is on the emitted static HTML: the no-JS invariant, unit-level. */
vi.mock('next-intl/server', async () => {
  const { default: messages } = await import('@/i18n/messages/de.json')
  const table = messages as unknown as Record<string, Record<string, string>>
  return {
    getTranslations:
      async (namespace?: string) =>
      (key: string): string => {
        const namespaceMessages = table[namespace ?? '']
        expect(namespaceMessages).toBeDefined()
        const value = namespaceMessages?.[key]
        expect(value).toBeDefined()
        return value as string
      },
  }
})

/* ══════════════════════════════════════════════════════════════════════════════
   THE FOOTER

   The single line at the end of the one-scroll document, pinned to the contract a
   visitor's browser sees:

     • the holder renders from `resolveCopyrightHolder()` and the year is
       rendered, not configured — a second name or a second year would be a
       value declared in two places;
     • the legal entry is a plain link to the localized legal route
       (trailing slash the export writes) **without** `data-transition` — the
       plain-navigation invariant the sequence owner's capture interception
       depends on;
     • the credit is the configured target, decided: a new tab, with the
       `rel` the renderer owes it.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The footer, rendered the way the static export renders it — under the
   provider the layout mounts, so the next-intl `Link` resolves its locale.
   The browser server build hands back the stream as a Promise; awaiting
   covers both shapes. */
async function renderFooter() {
  const stream = await renderToReadableStream(
    <NextIntlClientProvider locale="de" messages={messages}>
      <Footer />
    </NextIntlClientProvider>,
  )
  const html = await new Response(stream).text()
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('the footer', () => {
  it('renders the holder from the central configuration and the current year', async () => {
    const doc = await renderFooter()

    const holder = resolveCopyrightHolder()
    expect(holder).toBe(site.contact.name)
    const copyright = doc.querySelector('.site-footer__copyright')
    expect(copyright?.textContent).toMatch(new RegExp(`^© \\d{4} ${holder}$`))
  })

  it('links to the legal page with plain navigation — no data-transition', async () => {
    const doc = await renderFooter()

    const legal = doc.querySelector('.site-footer__legal')
    expect(legal).not.toBeNull()
    /* The localized route, as the export writes it — the trailing slash the
       static host requires (the unit renderer may or may not have appended
       it, so the assertion tolerates exactly that one beat of difference). */
    expect(legal?.getAttribute('href')).toMatch(/^\/de\/impressum-datenschutz\/?$/)
    expect(legal?.textContent).toBe(site.footer.legalLabel)
    /* The plain-navigation invariant: the capture interception only touches
       `data-transition` elements, so the overlay never fires for this link. */
    expect(legal?.hasAttribute('data-transition')).toBe(false)
  })

  it('renders the credit as a new-tab link with the configured target', async () => {
    const doc = await renderFooter()

    const creditLink = doc.querySelector('.site-footer__credit a')
    expect(creditLink).not.toBeNull()
    expect(creditLink?.getAttribute('href')).toBe(site.footer.creditUrl)
    expect(creditLink?.getAttribute('target')).toBe('_blank')
    expect(creditLink?.getAttribute('rel')).toBe('noreferrer')
    expect(creditLink?.textContent).toBe(site.footer.credit)
    /* The structural label renders from the messages, not from the component. */
    expect(doc.querySelector('.site-footer__credit')?.textContent).toMatch(/Made with care & love by/)
  })

  it('is a `<footer>` and carries no contact links — contact is menu-only', async () => {
    const doc = await renderFooter()

    expect(doc.querySelector('footer')).not.toBeNull()
    /* The contact details live in the menu and the legal page, not here. */
    expect(doc.querySelectorAll('footer a[href^="tel:"]')).toHaveLength(0)
    expect(doc.querySelectorAll('footer a[href^="mailto:"]')).toHaveLength(0)
  })
})
