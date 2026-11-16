import type { SiteConfig } from '@/lib/config/schema/site.schema'

// Every value specific to this site lives in `src/config` and nowhere else.
export const site: SiteConfig = {
  identity: {
    displayName: 'Lukas Federbusch',
    tagline: 'Handgemachte Möbel für Generationen.',
    /* Not a URL: the bare domain 301s to www; URLs are built from canonicalOrigin. */
    domain: 'tischler-federbusch.at',
    canonicalOrigin: 'https://www.tischler-federbusch.at',
  },

  // German only, by decision: one locale, no visible switch.
  languages: {
    supported: ['de'],
    default: 'de',
  },

  // `impressum` is a per-locale map; here the segment is untranslated.
  routes: {
    home: '/',
    impressum: {
      de: 'impressum-datenschutz',
    },
    anchors: {
      arbeiten: 'arbeiten',
    },
  },

  // THE ONE PLACE CONTACT DETAILS EXIST: menu, footer and legal page all read them here.
  contact: {
    name: 'Lukas Federbusch',
    addressLines: ['Hochschoberstraße 12, Top 16', '9900 Lienz'],
    phoneDisplay: '0664 410 72 72',
    phoneHref: '+436644107272',
    email: 'lukas.federbusch@gmail.com',
  },

  footer: {
    legalLabel: 'Impressum & Datenschutz',
    credit: 'mtreml',
    creditUrl: 'https://github.com/mtreml',
  },

  seo: {
    titleTemplate: '%s — Lukas Federbusch',
    defaultDescription: 'Handgemachte Möbel für Generationen — Lukas Federbusch, Lienz.',
    structuredDataType: 'Person',
    ogImage: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
  },

  landing: {
    // The pipeline keeps the original's logical path (content-hash suffix apart), so
    // this is the original's path, not a `master.mp4`; validate-config cross-checks it.
    video: '/media/landing/VID_20261114_082951.mp4',
    introDurationMs: 1500,
    videoLabel:
      'Lukas Federbusch bearbeitet Holz in seiner Werkstatt. Das Video läuft ohne Ton in einer Endlosschleife.',
    objectFit: 'cover',
  },

  works: {
    // The same file `seo.ogImage` names; validate-config keeps the pair honest.
    image: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
    imageAlt: 'Handgefertigte Kommode von Lukas Federbusch',
  },

  // The menu renders this list and nothing else; contact entries resolve from `contact`.
  navigation: {
    items: [
      { type: 'anchor', anchor: 'arbeiten', label: 'Arbeiten' },
      { type: 'tel' },
      { type: 'email' },
    ],
  },
}
