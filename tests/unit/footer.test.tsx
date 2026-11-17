import { renderToReadableStream } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

import { Footer } from '@/components/layout/Footer'
import messages from '@/i18n/messages/de.json'
import { site } from '@/config/site.config'
import { resolveCopyrightHolder } from '@/lib/config/resolve'

// The footer is a server component (it reads its structural label through the locale messages); the harness renders through the server renderer's stream — the same path the static export takes — and asserts on the emitted HTML.
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

// The single line at the end of the one-scroll document: holder from `resolveCopyrightHolder()`, the year rendered,
// the legal entry a plain link (no `data-transition`), the credit a new-tab link.

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
    // The unit renderer may or may not have appended the trailing slash, so the assertion tolerates exactly that one beat.
    expect(legal?.getAttribute('href')).toMatch(/^\/de\/impressum-datenschutz\/?$/)
    expect(legal?.textContent).toBe(site.footer.legalLabel)
    // The capture interception only touches `data-transition` elements, so the overlay never fires for this link.
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
    expect(doc.querySelector('.site-footer__credit')?.textContent).toMatch(
      /Made with care & love by/,
    )
  })

  it('is a `<footer>` and carries no contact links — contact is menu-only', async () => {
    const doc = await renderFooter()

    expect(doc.querySelector('footer')).not.toBeNull()
    expect(doc.querySelectorAll('footer a[href^="tel:"]')).toHaveLength(0)
    expect(doc.querySelectorAll('footer a[href^="mailto:"]')).toHaveLength(0)
  })
})
