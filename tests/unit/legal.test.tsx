import { renderToReadableStream } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ImpressumDatenschutzPage from '@/app/[locale]/impressum-datenschutz/page'
import { site } from '@/config/site.config'
import { legal } from '@/config/legal.config'
import messages from '@/i18n/messages/de.json'
import { MenuProvider } from '@/lib/menu'

// The page is a server component (it reads the structural labels through the locale messages); the harness renders it
// through the server renderer — the same path the static export takes — and asserts on the emitted HTML.
vi.mock('next-intl/server', async () => {
  const { default: messages } = await import('@/i18n/messages/de.json')
  const table = messages as unknown as Record<string, Record<string, string>>
  return {
    setRequestLocale: async () => undefined,
    getTranslations: async (namespace = '') => {
      const namespaceMessages = table[namespace]
      expect(namespaceMessages).toBeDefined()
      return (key: string, values?: Record<string, unknown>) => {
        const raw = namespaceMessages?.[key]
        expect(raw).toBeDefined()
        return (raw as string).split(/(\{\w+\})/g).map((part) => {
          const name = part.match(/^\{(\w+)\}$/)?.[1]
          if (name === undefined) return part
          return values?.[name] as React.ReactNode
        })
      }
    },
  }
})

// The view reads config, not literals: the heading structure, `lastChanged`, the protocol block and the urheberrecht paragraph render verbatim from `legal.config.ts`; the contact values come from `contact.*`.

async function renderLegal() {
  const stream = await renderToReadableStream(
    <NextIntlClientProvider locale="de" messages={messages}>
      <MenuProvider>
        <ImpressumDatenschutzPage params={Promise.resolve({ locale: 'de' })} />
      </MenuProvider>
    </NextIntlClientProvider>,
  )
  const html = await new Response(stream).text()
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('the heading structure', () => {
  it('owns its h1 and the three numbered h2 sections, in order', async () => {
    const doc = await renderLegal()

    const h1 = doc.querySelector('h1')
    expect(h1?.textContent).toBe('Impressum & Datenschutz')

    expect(Array.from(doc.querySelectorAll('h2')).map((h2) => h2.textContent)).toEqual([
      '1. Impressum',
      '2. Datenschutzerklärung',
      '3. Urheberrecht',
    ])
  })
})

describe('the configured text', () => {
  it('renders `lastChanged` verbatim, at the top', async () => {
    const doc = await renderLegal()
    expect(doc.querySelector('.legal__last-changed')?.textContent).toBe(
      `Zuletzt geändert: ${legal.lastChanged}`,
    )
  })

  it('renders the verbatim text from the configuration', async () => {
    const doc = await renderLegal()
    const body = doc.body.textContent
    // The newlines are preserved, not collapsed.
    expect(doc.querySelector('.legal__protocol')?.textContent).toBe(legal.datenschutz.protocolText)
    expect(body).toContain(legal.urheberrecht)
  })

  it('links the contact email, as a mailto', async () => {
    const doc = await renderLegal()
    const mailto = Array.from(doc.querySelectorAll('a[href^="mailto:"]'))
    expect(mailto).toHaveLength(1)
    expect(mailto[0]?.getAttribute('href')).toBe(`mailto:${site.contact.email}`)
    expect(mailto[0]?.textContent).toBe(site.contact.email)
  })
})

describe('the contact block', () => {
  const ORIGINAL = { ...site.contact }

  afterEach(() => {
    Object.assign(site.contact, ORIGINAL)
  })

  it('renders from `contact.*` — change the configuration, the render follows', async () => {
    site.contact.name = 'Test Person'
    site.contact.phoneDisplay = '0123 456'
    site.contact.email = 'test@example.at'
    site.contact.addressLines = ['Teststraße 1', '1234 Testort']

    const doc = await renderLegal()
    const body = doc.body.textContent

    expect(body).toContain('Test Person')
    expect(body).not.toContain('Hochschoberstraße 12, Top 16')

    expect(doc.querySelector('.legal__impressum')?.textContent).toContain('Teststraße 1')
    expect(doc.querySelector('.legal__impressum')?.textContent).toContain('1234 Testort')

    const tel = doc.querySelector('a[href^="tel:"]')
    expect(tel?.textContent).toBe('0123 456')
    expect(doc.querySelectorAll('a[href="mailto:test@example.at"]')).toHaveLength(1)
  })
})
