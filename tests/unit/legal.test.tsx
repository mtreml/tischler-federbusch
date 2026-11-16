import { renderToReadableStream } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ImpressumDatenschutzPage from '@/app/[locale]/impressum-datenschutz/page'
import { site } from '@/config/site.config'
import { legal } from '@/config/legal.config'
import messages from '@/i18n/messages/de.json'
import { MenuProvider } from '@/lib/menu'

/* The page is a server component — async, because it reads the structural
   labels through the locale messages. The harness supplies those from the
   real `de.json`, stubs `setRequestLocale`, and renders through the server
   renderer, which is what awaits it — the same path the static export takes,
   so the assertions run on the emitted static HTML: the no-JS invariant,
   unit-level. Interpolation resolves the way next-intl would; the exercise-via
   sentence's email renders from the resolved contact, not from the message,
   so the address stays in `contact.*` in exactly one place. */
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

/* ══════════════════════════════════════════════════════════════════════════════
   THE LEGAL PAGE (WP-07b)

   The view reads config, not literals — the invariants the suite pins:

     • the heading structure: the one h1, the three numbered h2 sections in
       the spec's order;
     • `lastChanged`, the processed-data paragraph, the hosting note and the
       urheberrecht paragraph render verbatim from `legal.config.ts`;
     • the five rights render in configured order, with their `id`s;
     • the contact values come from `contact.*` through `resolveContact()` —
       asserted by changing the configuration and watching the render follow.
   ══════════════════════════════════════════════════════════════════════════════ */

/** The page, rendered the way the static export renders it. The browser
   server build hands back the stream as a Promise; awaiting covers both. */
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

  it('renders the verbatim paragraphs from the configuration', async () => {
    const doc = await renderLegal()
    const body = doc.body.textContent
    expect(body).toContain(legal.datenschutz.processedData)
    expect(body).toContain(legal.datenschutz.hosting.note)
    /* The retention line interpolates the configured days into the message. */
    expect(body).toContain(
      messages.impressumDatenschutz.retention.replace(
        '{days}',
        String(legal.datenschutz.retentionDays),
      ),
    )
    expect(body).toContain(legal.urheberrecht)
  })

  it('renders the five rights in configured order, with their ids', async () => {
    const doc = await renderLegal()

    const items = Array.from(doc.querySelectorAll('.legal__rights li'))
    expect(items).toHaveLength(legal.datenschutz.rights.length)
    items.forEach((item, index) => {
      const right = legal.datenschutz.rights[index]
      expect(right).toBeDefined()
      if (right === undefined) return
      expect(item.id).toBe(right.id)
      expect(item.textContent).toContain(right.label)
      expect(item.textContent).toContain(right.text)
    })
  })

  it('exercises the rights through the configured email, as a mailto link', async () => {
    const doc = await renderLegal()
    const mailto = Array.from(doc.querySelectorAll('a[href^="mailto:"]'))
    /* The impressum block and the exercise-via sentence — both the same one
       address, resolved, never re-declared. */
    expect(mailto).toHaveLength(2)
    mailto.forEach((link) => {
      expect(link.getAttribute('href')).toBe(`mailto:${site.contact.email}`)
      expect(link.textContent).toBe(site.contact.email)
    })
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

    /* The name: the impressum block and the responsible sentence. */
    expect(body).toContain('Test Person')
    expect(body).toContain('Für den Inhalt verantwortlich: Test Person')
    expect(body).not.toContain('Hochschoberstraße 12, Top 16')

    /* The address lines, one block-level span each. */
    expect(doc.querySelector('.legal__impressum')?.textContent).toContain('Teststraße 1')
    expect(doc.querySelector('.legal__impressum')?.textContent).toContain('1234 Testort')

    /* The contact links, from the configuration, with the schemes resolved. */
    const tel = doc.querySelector('a[href^="tel:"]')
    expect(tel?.textContent).toBe('0123 456')
    expect(doc.querySelectorAll('a[href="mailto:test@example.at"]')).toHaveLength(2)
  })
})
