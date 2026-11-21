import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { Header } from '@/components/layout/Header'
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { legal } from '@/config/legal.config'
import { routing } from '@/i18n/routing'
import { pathFor } from '@/i18n/paths'
import {
  applyTitleTemplate,
  localize,
  resolveCanonicalUrl,
  resolveContact,
} from '@/lib/config/resolve'

/* ══════════════════════════════════════════════════════════════════════════════
   IMPRESSUM & DATENSCHUTZ — the only separate page on the site

   Replaces the original placeholder. The legal *prose* is per-locale configuration
   data (`legal.config.ts`) rendered verbatim; the structural labels (the
   heading, "Zuletzt geändert:", the section titles) come from the locale
   messages — the established split. No
   portfolio-core pattern is re-used for this view (spec): it is a plain
   static document that reads config and messages.

   The contact block renders through `resolveContact()` and nowhere else —
   name, address, telephone and email live in `site.contact`, exactly as in
   the menu, so the page and the menu cannot disagree.

   The header mounts here in its `page` variant (the spec's "the hamburger is
   always shown"): an always-opaque bar with its own centered name — this
   document has no landing, so there is no sticky name to supply it.

   Metadata: this document supplies only its own title (through the
   one template), description and canonical — the canonical via
   `resolveCanonicalUrl(pathFor(...))`, the trailing-slash helper a plain
   static host requires — and inherits the layout's OpenGraph set.
   ══════════════════════════════════════════════════════════════════════════════ */

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'impressumDatenschutz' })

  return {
    title: applyTitleTemplate(t('heading')),
    description: t('description'),
    alternates: {
      canonical: resolveCanonicalUrl(pathFor({ href: '/impressum-datenschutz', locale })),
    },
  }
}

export default async function ImpressumDatenschutzPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('impressumDatenschutz')
  const contact = resolveContact()

  return (
    <>
      {/* The header's page variant: opaque bar, centered name, hamburger — on every scroll position. */}
      <Header variant="page" />
      <ScrollToTop />
      <section className="legal">
        <h1 className="legal__heading">{t('heading')}</h1>
        <p className="legal__last-changed">
          {t('lastChangedLabel')} {localize(legal.lastChanged, locale)}
        </p>

        <section className="legal__section">
          <h2>{t('impressum')}</h2>
          <p className="legal__impressum">
            {contact.name}
            {/* One block, no `<br>`: each line is a block-level span. */}
            {contact.addressLines.map((line) => (
              <span key={line} className="legal__line">
                {line}
              </span>
            ))}
            <span className="legal__line">
              <a href={contact.telHref}>{contact.phoneDisplay}</a>
            </span>
            <span className="legal__line">
              <a href={contact.mailtoHref}>{contact.email}</a>
            </span>
          </p>
        </section>

        <section className="legal__section">
          <h2>{t('datenschutz')}</h2>
          <p className="legal__protocol">{localize(legal.datenschutz.protocolText, locale)}</p>
        </section>

        <section className="legal__section">
          <h2>{t('urheberrecht')}</h2>
          <p>{localize(legal.urheberrecht, locale)}</p>
        </section>
      </section>
    </>
  )
}
